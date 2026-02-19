import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import cors from 'cors';

// Valid secret categories - shared constant to match server
const VALID_CATEGORIES = ['password', 'api-key', 'token', 'certificate', 'note', 'other'];

// Mock keytar
const mockKeytar = {
  setPassword: jest.fn().mockResolvedValue(undefined),
  getPassword: jest.fn().mockResolvedValue(null),
  deletePassword: jest.fn().mockResolvedValue(true),
};

jest.unstable_mockModule('keytar', () => ({
  default: mockKeytar,
  ...mockKeytar
}));

describe('SecureVault API', () => {
  let app;

  beforeAll(async () => {
    // Set up a test Express app after mocking dependencies
    // 
    // NOTE: Test Architecture
    // -----------------------
    // These unit tests re-implement API routes with mocked keytar for isolated testing.
    // They do NOT import or test the actual server/index.js file.
    // 
    // Metadata persistence is tested separately:
    // - persistence.test.js: Unit tests for metadataStore module (getMetadataPath, loadMetadata, saveMetadata)
    // - integration.test.js: Integration tests simulating server restarts with metadata persistence
    // - e2e tests: Full integration tests with real keychain and server
    // 
    // This separation allows:
    // 1. Fast unit tests for API logic without filesystem/keychain dependencies
    // 2. Focused tests for persistence behavior
    // 3. Complete end-to-end validation in e2e tests
    app = express();
    app.use(cors());
    app.use(express.json());

    // In-memory storage for testing
    let secretsMetadata = [];
    const fallbackStorage = {};

    const storage = {
      async setPassword(service, account, password) {
        fallbackStorage[account] = password;
      },
      async getPassword(service, account) {
        return fallbackStorage[account] || null;
      },
      async deletePassword(service, account) {
        delete fallbackStorage[account];
        return true;
      }
    };

    // GET /api/secrets
    app.get('/api/secrets', async (req, res) => {
      try {
        const secretPromises = secretsMetadata.map(async (meta) => {
          try {
            const value = await storage.getPassword('SecureVault', meta.id);
            if (!value) {
              return null;
            }
            return {
              ...meta,
              value: value
            };
          } catch (error) {
            console.error(`Error getting secret ${meta.id}:`, error);
            return null;
          }
        });

        const secretsWithNulls = await Promise.all(secretPromises);
        const secrets = secretsWithNulls.filter(Boolean);
        res.json(secrets);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch secrets' });
      }
    });

    // POST /api/secrets
    app.post('/api/secrets', async (req, res) => {
      try {
        const { id, title, value, category, notes, createdAt, updatedAt } = req.body;
        
        if (!id || !title || !value || !category) {
          return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Validate title
        if (typeof title !== 'string' || title.trim() === '') {
          return res.status(400).json({ error: 'Title must be a non-empty string' });
        }
        
        // Validate category
        if (!VALID_CATEGORIES.includes(category)) {
          return res.status(400).json({ error: 'Invalid category. Must be one of: ' + VALID_CATEGORIES.join(', ') });
        }
        
        // Validate value
        if (typeof value !== 'string' || value === '') {
          return res.status(400).json({ error: 'Secret value must be a non-empty string' });
        }

        // Validate notes (optional, but must be a string if provided)
        if (notes !== undefined && typeof notes !== 'string') {
          return res.status(400).json({ error: 'Notes must be a string' });
        }

        // Check for duplicate ID
        const existingSecret = secretsMetadata.find(s => s.id === id);
        if (existingSecret) {
          return res.status(409).json({ error: 'Secret with this ID already exists' });
        }

        await storage.setPassword('SecureVault', id, value);
        const metadata = { id, title: title.trim(), category, notes, createdAt, updatedAt };
        secretsMetadata.push(metadata);
        
        res.status(201).json({ ...metadata, value });
      } catch (error) {
        res.status(500).json({ error: 'Failed to create secret' });
      }
    });

    // PUT /api/secrets/:id
    app.put('/api/secrets/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const { title, value, category, notes, updatedAt } = req.body;
        
        const metaIndex = secretsMetadata.findIndex(s => s.id === id);
        if (metaIndex === -1) {
          return res.status(404).json({ error: 'Secret not found' });
        }
        
        // Validate title if provided
        if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
          return res.status(400).json({ error: 'Title must be a non-empty string' });
        }
        
        // Validate category if provided
        if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
          return res.status(400).json({ error: 'Invalid category. Must be one of: ' + VALID_CATEGORIES.join(', ') });
        }
        
        // Validate notes if provided
        if (notes !== undefined && typeof notes !== 'string') {
          return res.status(400).json({ error: 'Notes must be a string' });
        }
        
        const existingMeta = secretsMetadata[metaIndex];
        
        // Get current secret value
        let secretValue = await storage.getPassword('SecureVault', id);
        
        // Update the secret value in keychain only if a new value is provided
        if (value !== undefined) {
          if (value === null || value === '') {
            return res.status(400).json({ error: 'Secret value cannot be empty' });
          }
          if (typeof value !== 'string') {
            return res.status(400).json({ error: 'Secret value must be a string' });
          }
          await storage.setPassword('SecureVault', id, value);
          secretValue = value;
        }
        
        // Update metadata, preserving existing fields when omitted
        secretsMetadata[metaIndex] = {
          ...existingMeta,
          title: title !== undefined ? title.trim() : existingMeta.title,
          category: category !== undefined ? category : existingMeta.category,
          notes: notes !== undefined ? notes : existingMeta.notes,
          updatedAt: updatedAt !== undefined ? updatedAt : existingMeta.updatedAt
        };
        
        res.json({ ...secretsMetadata[metaIndex], value: secretValue });
      } catch (error) {
        res.status(500).json({ error: 'Failed to update secret' });
      }
    });

    // DELETE /api/secrets/:id
    app.delete('/api/secrets/:id', async (req, res) => {
      try {
        const { id } = req.params;
        
        const metaIndex = secretsMetadata.findIndex(s => s.id === id);
        if (metaIndex === -1) {
          return res.status(404).json({ error: 'Secret not found' });
        }
        
        await storage.deletePassword('SecureVault', id);
        secretsMetadata.splice(metaIndex, 1);
        
        res.status(204).send();
      } catch (error) {
        res.status(500).json({ error: 'Failed to delete secret' });
      }
    });

    // Health check
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', service: 'SecureVault Backend' });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        service: 'SecureVault Backend'
      });
    });
  });

  describe('POST /api/secrets', () => {
    it('should create a new secret', async () => {
      const newSecret = {
        id: 'test-id-1',
        title: 'Test Secret',
        value: 'test-value',
        category: 'password',
        notes: 'Test notes',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const response = await request(app)
        .post('/api/secrets')
        .send(newSecret);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: newSecret.id,
        title: newSecret.title,
        category: newSecret.category,
      });
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/secrets')
        .send({ title: 'Incomplete' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 409 if secret with same ID already exists', async () => {
      const secret = {
        id: 'duplicate-test-id',
        title: 'First Secret',
        value: 'secret-value-1',
        category: 'password',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Create first secret
      await request(app)
        .post('/api/secrets')
        .send(secret);

      // Try to create duplicate
      const duplicateSecret = {
        ...secret,
        title: 'Duplicate Secret',
        value: 'secret-value-2'
      };

      const response = await request(app)
        .post('/api/secrets')
        .send(duplicateSecret);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Secret with this ID already exists');
    });
  });

  describe('GET /api/secrets', () => {
    it('should return all secrets', async () => {
      const response = await request(app).get('/api/secrets');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('PUT /api/secrets/:id', () => {
    it('should update an existing secret', async () => {
      // First create a secret
      const newSecret = {
        id: 'test-id-2',
        title: 'Original Title',
        value: 'original-value',
        category: 'password',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await request(app).post('/api/secrets').send(newSecret);

      // Then update it
      const updatedData = {
        title: 'Updated Title',
        value: 'updated-value',
        category: 'api-key',
        updatedAt: Date.now(),
      };

      const response = await request(app)
        .put(`/api/secrets/${newSecret.id}`)
        .send(updatedData);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe(updatedData.title);
    });

    it('should return 404 for non-existent secret', async () => {
      const response = await request(app)
        .put('/api/secrets/non-existent')
        .send({ title: 'Test', value: 'test', category: 'password', updatedAt: Date.now() });

      expect(response.status).toBe(404);
    });

    it('should return 400 if secret value is empty', async () => {
      // First create a secret
      const newSecret = {
        id: 'test-id-empty-value',
        title: 'Test Secret',
        value: 'original-value',
        category: 'password',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await request(app).post('/api/secrets').send(newSecret);

      // Try to update with empty value
      const response = await request(app)
        .put(`/api/secrets/${newSecret.id}`)
        .send({ value: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Secret value cannot be empty');
    });

    it('should preserve existing fields when omitted', async () => {
      // First create a secret
      const newSecret = {
        id: 'test-id-preserve',
        title: 'Original Title',
        value: 'original-value',
        category: 'password',
        notes: 'Original notes',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await request(app).post('/api/secrets').send(newSecret);

      // Update only the title (omit value, category, notes)
      const response = await request(app)
        .put(`/api/secrets/${newSecret.id}`)
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated Title');
      expect(response.body.category).toBe(newSecret.category);
      expect(response.body.notes).toBe(newSecret.notes);
      expect(response.body.value).toBe(newSecret.value); // Value should be preserved
    });
  });

  describe('DELETE /api/secrets/:id', () => {
    it('should delete a secret', async () => {
      // First create a secret
      const newSecret = {
        id: 'test-id-3',
        title: 'To Delete',
        value: 'delete-value',
        category: 'password',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await request(app).post('/api/secrets').send(newSecret);

      // Then delete it
      const response = await request(app).delete(`/api/secrets/${newSecret.id}`);

      expect(response.status).toBe(204);
    });

    it('should return 404 for non-existent secret', async () => {
      const response = await request(app).delete('/api/secrets/non-existent');

      expect(response.status).toBe(404);
    });
  });
});
