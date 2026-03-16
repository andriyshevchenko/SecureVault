// server/jsonStore.js
import fs from 'fs';
import path from 'path';
import os from 'os';

function computeConfigDir(baseDirOverride = null) {
  if (baseDirOverride) return baseDirOverride;
  const homeDir = os.homedir();
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local');
    return path.join(localAppData, 'SecureVault');
  } else if (process.platform === 'darwin') {
    return path.join(homeDir, 'Library', 'Application Support', 'SecureVault');
  } else {
    const xdgConfigHome = process.env.XDG_CONFIG_HOME || path.join(homeDir, '.config');
    return path.join(xdgConfigHome, 'securevault');
  }
}

export function createJsonStore(filename) {
  const computePath = (baseDirOverride = null) => {
    return path.join(computeConfigDir(baseDirOverride), filename);
  };

  const getPath = (baseDirOverride = null) => {
    const filePath = computePath(baseDirOverride);
    const configDir = path.dirname(filePath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true, mode: 0o700 });
    }
    return filePath;
  };

  const load = (baseDirOverride = null) => {
    try {
      const filePath = computePath(baseDirOverride);
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        console.warn(`⚠️  ${filename} has invalid format; expected an array. Falling back to empty list.`);
      }
    } catch (error) {
      console.warn(`⚠️  Failed to load ${filename} from disk:`, error.message);
    }
    return [];
  };

  const save = (data, baseDirOverride = null) => {
    let filePath;
    try {
      filePath = getPath(baseDirOverride);
      const dir = path.dirname(filePath);
      const base = path.basename(filePath);
      const tempPath = path.join(dir, `${base}.tmp-${process.pid}-${Date.now()}`);
      const json = JSON.stringify(data, null, 2);
      fs.writeFileSync(tempPath, json, { encoding: 'utf8', mode: 0o600 });
      fs.renameSync(tempPath, filePath);
      fs.chmodSync(filePath, 0o600);
    } catch (error) {
      const targetPath = filePath || `[${filename} path unavailable]`;
      console.error(`❌ Failed to save ${filename} to ${targetPath}:`, error.message);
      throw new Error(`Failed to persist ${filename}: ${error.message}`);
    }
  };

  return { getPath, load, save };
}
