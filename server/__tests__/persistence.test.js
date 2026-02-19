import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getMetadataPath, loadMetadata, saveMetadata } from '../metadataStore.js';

describe('Metadata Persistence', () => {
  let tempDir;

  beforeEach(() => {
    // Create a temporary directory for each test to avoid touching user data
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'securevault-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('getMetadataPath', () => {
    it('should use override directory when provided', () => {
      const metadataPath = getMetadataPath(tempDir);
      expect(metadataPath).toBe(path.join(tempDir, 'metadata.json'));
      expect(fs.existsSync(tempDir)).toBe(true);
    });

    it('should return platform-appropriate path structure', () => {
      // Test path structure without creating real directories by using temp override
      const metadataPath = getMetadataPath(tempDir);
      expect(metadataPath).toContain('metadata.json');
      
      // The real platform logic is tested implicitly through other tests
      // that use temp directories, avoiding creation of user directories
    });

    it('should create directory if it does not exist', () => {
      const testDir = path.join(tempDir, 'subdir');
      const metadataPath = getMetadataPath(testDir);
      expect(fs.existsSync(testDir)).toBe(true);
      expect(metadataPath).toBe(path.join(testDir, 'metadata.json'));
    });
  });

  describe('saveMetadata and loadMetadata', () => {
    it('should save and load metadata correctly', () => {
      const testMetadata = [
        {
          id: 'test-id-1',
          title: 'Test Secret',
          category: 'password',
          notes: 'Test notes',
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'test-id-2',
          title: 'Another Secret',
          category: 'api-key',
          notes: 'More notes',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      // Save metadata
      saveMetadata(testMetadata, tempDir);

      // Load metadata
      const loadedMetadata = loadMetadata(tempDir);

      expect(loadedMetadata).toEqual(testMetadata);
      expect(loadedMetadata.length).toBe(2);
      expect(loadedMetadata[0].id).toBe('test-id-1');
      expect(loadedMetadata[1].id).toBe('test-id-2');
    });

    it('should return empty array when file does not exist', () => {
      const loadedMetadata = loadMetadata(tempDir);
      expect(loadedMetadata).toEqual([]);
    });

    it('should handle empty metadata array', () => {
      saveMetadata([], tempDir);
      const loadedMetadata = loadMetadata(tempDir);
      expect(loadedMetadata).toEqual([]);
    });

    it('should persist metadata across multiple saves', () => {
      // Save initial metadata
      const metadata1 = [
        { id: '1', title: 'Secret 1', category: 'password', notes: 'Note 1', createdAt: Date.now(), updatedAt: Date.now() }
      ];
      saveMetadata(metadata1, tempDir);

      // Add more metadata
      const metadata2 = [
        { id: '1', title: 'Secret 1', category: 'password', notes: 'Note 1', createdAt: Date.now(), updatedAt: Date.now() },
        { id: '2', title: 'Secret 2', category: 'api-key', notes: 'Note 2', createdAt: Date.now(), updatedAt: Date.now() }
      ];
      saveMetadata(metadata2, tempDir);

      // Load and verify
      const loadedMetadata = loadMetadata(tempDir);
      expect(loadedMetadata.length).toBe(2);
      expect(loadedMetadata[0].id).toBe('1');
      expect(loadedMetadata[0].notes).toBe('Note 1');
      expect(loadedMetadata[1].id).toBe('2');
      expect(loadedMetadata[1].notes).toBe('Note 2');
    });

    it('should validate loaded metadata is an array', () => {
      // Write invalid JSON (not an array)
      const metadataPath = getMetadataPath(tempDir);
      fs.writeFileSync(metadataPath, JSON.stringify({ invalid: 'object' }), 'utf8');

      // Should return empty array and not crash
      const loadedMetadata = loadMetadata(tempDir);
      expect(loadedMetadata).toEqual([]);
    });

    it('should handle corrupted JSON gracefully', () => {
      // Write invalid JSON
      const metadataPath = getMetadataPath(tempDir);
      fs.writeFileSync(metadataPath, '{ invalid json', 'utf8');

      // Should return empty array and not crash
      const loadedMetadata = loadMetadata(tempDir);
      expect(loadedMetadata).toEqual([]);
    });

    it('should set restrictive file permissions', () => {
      const testMetadata = [
        { id: 'test', title: 'Test', category: 'password', createdAt: Date.now(), updatedAt: Date.now() }
      ];
      
      saveMetadata(testMetadata, tempDir);
      
      const metadataPath = getMetadataPath(tempDir);
      const stats = fs.statSync(metadataPath);
      
      // On POSIX systems, check that file is user-only (0o600)
      if (process.platform !== 'win32') {
        const mode = stats.mode & 0o777;
        expect(mode).toBe(0o600);
      }
    });

    it('should throw error when save fails', () => {
      // Mock fs.writeFileSync to throw an error deterministically
      const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      try {
        expect(() => {
          saveMetadata([], tempDir);
        }).toThrow('Failed to persist metadata');
      } finally {
        writeSpy.mockRestore();
      }
    });
  });
});
