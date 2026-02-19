import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getMetadataPath, loadMetadata, saveMetadata } from '../metadataStore.js';

describe('Metadata Persistence Integration', () => {
  let tempDir;

  beforeEach(() => {
    // Create a temporary directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'securevault-integration-'));
  });

  afterEach(() => {
    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Server restart simulation', () => {
    it('should persist secrets across simulated server restarts', () => {
      // Simulate first server session: create secrets
      let secretsMetadata = loadMetadata(tempDir);
      expect(secretsMetadata).toEqual([]);
      
      // Add some secrets
      const secret1 = {
        id: 'secret-1',
        title: 'My Password',
        category: 'password',
        notes: 'Important password',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      const secret2 = {
        id: 'secret-2',
        title: 'API Key',
        category: 'api-key',
        notes: 'Production API key',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      secretsMetadata.push(secret1);
      secretsMetadata.push(secret2);
      
      // Save to disk
      saveMetadata(secretsMetadata, tempDir);
      
      // Verify file was created
      const metadataPath = getMetadataPath(tempDir);
      expect(fs.existsSync(metadataPath)).toBe(true);
      
      // Simulate server restart: reload from disk
      secretsMetadata = loadMetadata(tempDir);
      
      // Verify secrets were restored
      expect(secretsMetadata.length).toBe(2);
      expect(secretsMetadata[0]).toEqual(secret1);
      expect(secretsMetadata[1]).toEqual(secret2);
    });

    it('should handle multiple restart cycles with updates', () => {
      // Session 1: Create initial secret
      let secretsMetadata = loadMetadata(tempDir);
      const secret = {
        id: 'test-secret',
        title: 'Original Title',
        category: 'password',
        notes: 'Original notes',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      secretsMetadata.push(secret);
      saveMetadata(secretsMetadata, tempDir);
      
      // Session 2: Restart and update the secret
      secretsMetadata = loadMetadata(tempDir);
      expect(secretsMetadata.length).toBe(1);
      secretsMetadata[0].title = 'Updated Title';
      secretsMetadata[0].notes = 'Updated notes';
      secretsMetadata[0].updatedAt = Date.now();
      saveMetadata(secretsMetadata, tempDir);
      
      // Session 3: Restart and verify updates persisted
      secretsMetadata = loadMetadata(tempDir);
      expect(secretsMetadata.length).toBe(1);
      expect(secretsMetadata[0].title).toBe('Updated Title');
      expect(secretsMetadata[0].notes).toBe('Updated notes');
      expect(secretsMetadata[0].id).toBe('test-secret');
    });

    it('should handle secret deletion across restarts', () => {
      // Session 1: Create two secrets
      let secretsMetadata = loadMetadata(tempDir);
      const secret1 = {
        id: 'keep-me',
        title: 'Keep This',
        category: 'password',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      const secret2 = {
        id: 'delete-me',
        title: 'Delete This',
        category: 'password',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      secretsMetadata.push(secret1);
      secretsMetadata.push(secret2);
      saveMetadata(secretsMetadata, tempDir);
      
      // Session 2: Restart and delete one secret
      secretsMetadata = loadMetadata(tempDir);
      expect(secretsMetadata.length).toBe(2);
      const indexToDelete = secretsMetadata.findIndex(s => s.id === 'delete-me');
      secretsMetadata.splice(indexToDelete, 1);
      saveMetadata(secretsMetadata, tempDir);
      
      // Session 3: Restart and verify deletion persisted
      secretsMetadata = loadMetadata(tempDir);
      expect(secretsMetadata.length).toBe(1);
      expect(secretsMetadata[0].id).toBe('keep-me');
      expect(secretsMetadata.find(s => s.id === 'delete-me')).toBeUndefined();
    });

    it('should start with empty array if metadata file does not exist', () => {
      // Simulate first-ever startup with no existing data
      const secretsMetadata = loadMetadata(tempDir);
      expect(secretsMetadata).toEqual([]);
      expect(Array.isArray(secretsMetadata)).toBe(true);
    });

    it('should recover from corrupted metadata file', () => {
      // Create a corrupted metadata file
      const metadataPath = getMetadataPath(tempDir);
      fs.writeFileSync(metadataPath, '{ invalid json }', 'utf8');
      
      // Load should return empty array instead of crashing
      const secretsMetadata = loadMetadata(tempDir);
      expect(secretsMetadata).toEqual([]);
      
      // Should be able to save new data after recovery
      secretsMetadata.push({
        id: 'recovered',
        title: 'After Recovery',
        category: 'note',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      
      expect(() => saveMetadata(secretsMetadata, tempDir)).not.toThrow();
      
      // Verify recovery worked
      const reloaded = loadMetadata(tempDir);
      expect(reloaded.length).toBe(1);
      expect(reloaded[0].id).toBe('recovered');
    });
  });
});
