import fs from 'fs';
import path from 'path';
import os from 'os';

// Compute metadata path without side effects (doesn't create directory)
const computeMetadataPath = (baseDirOverride = null) => {
  const homeDir = os.homedir();
  
  let configDir;
  if (baseDirOverride) {
    // Use override for testing
    configDir = baseDirOverride;
  } else if (process.platform === 'win32') {
    // Prefer LOCALAPPDATA to respect non-standard Windows profiles
    const localAppData = process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local');
    configDir = path.join(localAppData, 'SecureVault');
  } else if (process.platform === 'darwin') {
    configDir = path.join(homeDir, 'Library', 'Application Support', 'SecureVault');
  } else {
    // On Linux/Unix, prefer XDG_CONFIG_HOME when available
    const xdgConfigHome = process.env.XDG_CONFIG_HOME || path.join(homeDir, '.config');
    configDir = path.join(xdgConfigHome, 'securevault');
  }
  
  return path.join(configDir, 'metadata.json');
};

// Get metadata path and ensure directory exists (for write operations)
export const getMetadataPath = (baseDirOverride = null) => {
  const metadataPath = computeMetadataPath(baseDirOverride);
  const configDir = path.dirname(metadataPath);
  
  // Ensure directory exists
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true, mode: 0o700 });
  }
  
  return metadataPath;
};

// Load metadata from disk with validation (doesn't create directory)
export const loadMetadata = (baseDirOverride = null) => {
  try {
    const metadataPath = computeMetadataPath(baseDirOverride);
    if (fs.existsSync(metadataPath)) {
      const data = fs.readFileSync(metadataPath, 'utf8');
      const parsed = JSON.parse(data);
      
      // Validate that loaded data is an array
      if (Array.isArray(parsed)) {
        return parsed;
      }
      console.warn('⚠️  Metadata file has invalid format; expected an array. Falling back to empty list.');
    }
  } catch (error) {
    console.warn('⚠️  Failed to load metadata from disk:', error.message);
  }
  return [];
};

// Save metadata to disk with atomic write protection
// Throws error if save fails to allow callers to handle rollback
export const saveMetadata = (metadata, baseDirOverride = null) => {
  let metadataPath;
  try {
    metadataPath = getMetadataPath(baseDirOverride);
    const dir = path.dirname(metadataPath);
    const base = path.basename(metadataPath);
    const tempPath = path.join(dir, `${base}.tmp-${process.pid}-${Date.now()}`);
    const data = JSON.stringify(metadata, null, 2);

    // Write to a temporary file first with restrictive permissions
    fs.writeFileSync(tempPath, data, { encoding: 'utf8', mode: 0o600 });
    
    // Atomically replace the target file
    fs.renameSync(tempPath, metadataPath);
    
    // Ensure the final file has restrictive permissions (in case it existed before)
    fs.chmodSync(metadataPath, 0o600);
  } catch (error) {
    const targetPath = metadataPath || '[metadata path unavailable]';
    console.error(`❌ Failed to save metadata to ${targetPath}:`, error.message);
    throw new Error(`Failed to persist metadata: ${error.message}`);
  }
};
