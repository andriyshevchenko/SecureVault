import express from 'express';
import cors from 'cors';
import keytar from 'keytar';

const app = express();
const PORT = 3001;
const SERVICE_NAME = 'SecureVault';

// Valid secret categories - shared constant to avoid duplication
const VALID_CATEGORIES = ['password', 'api-key', 'token', 'certificate', 'note', 'other'];

// CORS configuration - restrict to localhost origins for security
const allowedOrigins = [
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173', // Vite dev server default
  'http://127.0.0.1:5173'
];

const corsOptions = {
  origin: (origin, callback) => {
    // Only allow specific localhost origins for security.
    // Note: callback(null, false) omits CORS headers but does NOT reject the request.
    // Non-browser clients (e.g., curl, server-to-server) can still call the API.
    // The localhost binding (127.0.0.1) provides the actual network-level restriction.
    if (!origin) {
      return callback(null, false);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' })); // Set limit for large certificates and keys

// Check if keychain is available
let keychainAvailable = false;
let fallbackStorage = {}; // Fallback in-memory storage when keychain is unavailable

// Test keychain availability
try {
  await keytar.setPassword(SERVICE_NAME, '__test__', 'test');
  await keytar.deletePassword(SERVICE_NAME, '__test__');
  keychainAvailable = true;
  console.log('✅ OS keychain is available and will be used for secure storage');
} catch (error) {
  console.warn('⚠️  OS keychain is not available. Using in-memory storage as fallback.');
  console.warn('   Note: Secrets will be lost when the server restarts.');
}

// In-memory cache for secret metadata (keychain only stores key-value pairs)
// We'll store the full secret objects here, but the values will be in the keychain
// NOTE: Metadata is stored in memory and will be lost on server restart.
// Secret values persist in the OS keychain but become inaccessible through the app until recreated.
// For production use, consider persisting metadata to disk or storing it alongside values in keychain.
let secretsMetadata = [];

// Storage abstraction layer
const storage = {
  async setPassword(service, account, password) {
    if (keychainAvailable) {
      return await keytar.setPassword(service, account, password);
    } else {
      fallbackStorage[account] = password;
    }
  },
  
  async getPassword(service, account) {
    if (keychainAvailable) {
      return await keytar.getPassword(service, account);
    } else {
      return fallbackStorage[account] || null;
    }
  },
  
  async deletePassword(service, account) {
    if (keychainAvailable) {
      return await keytar.deletePassword(service, account);
    } else {
      delete fallbackStorage[account];
      return true;
    }
  }
};

// Helper function to get all secrets with their values from keychain
async function getAllSecrets() {
  const secretPromises = secretsMetadata.map(async (meta) => {
    try {
      const value = await storage.getPassword(SERVICE_NAME, meta.id);
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
  return secretsWithNulls.filter(Boolean);
}

// GET /api/secrets - Get all secrets
app.get('/api/secrets', async (req, res) => {
  try {
    const secrets = await getAllSecrets();
    res.json(secrets);
  } catch (error) {
    console.error('Error fetching secrets:', error);
    res.status(500).json({ error: 'Failed to fetch secrets' });
  }
});

// POST /api/secrets - Create a new secret
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

    // Store the secret value in keychain
    await storage.setPassword(SERVICE_NAME, id, value);
    
    // Store metadata with trimmed title
    const metadata = { id, title: title.trim(), category, notes, createdAt, updatedAt };
    secretsMetadata.push(metadata);
    
    res.status(201).json({ ...metadata, value });
  } catch (error) {
    console.error('Error creating secret:', error);
    res.status(500).json({ error: 'Failed to create secret' });
  }
});

// PUT /api/secrets/:id - Update a secret
app.put('/api/secrets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, value, category, notes, updatedAt } = req.body;
    
    const metaIndex = secretsMetadata.findIndex(s => s.id === id);
    if (metaIndex === -1) {
      return res.status(404).json({ error: 'Secret not found' });
    }
    
    // Validate provided fields
    if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
      return res.status(400).json({ error: 'Title must be a non-empty string' });
    }
    
    if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category. Must be one of: ' + VALID_CATEGORIES.join(', ') });
    }
    
    if (notes !== undefined && typeof notes !== 'string') {
      return res.status(400).json({ error: 'Notes must be a string' });
    }
    
    const existingMeta = secretsMetadata[metaIndex];
    
    // Get current secret value
    let secretValue = await storage.getPassword(SERVICE_NAME, id);
    
    // Update the secret value in keychain only if a new value is provided
    if (value !== undefined) {
      if (value === null || value === '') {
        return res.status(400).json({ error: 'Secret value cannot be empty' });
      }
      if (typeof value !== 'string') {
        return res.status(400).json({ error: 'Secret value must be a string' });
      }
      await storage.setPassword(SERVICE_NAME, id, value);
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
    console.error('Error updating secret:', error);
    res.status(500).json({ error: 'Failed to update secret' });
  }
});

// DELETE /api/secrets/:id - Delete a secret
app.delete('/api/secrets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const metaIndex = secretsMetadata.findIndex(s => s.id === id);
    if (metaIndex === -1) {
      return res.status(404).json({ error: 'Secret not found' });
    }
    
    // Delete from keychain
    await storage.deletePassword(SERVICE_NAME, id);
    
    // Delete metadata
    secretsMetadata.splice(metaIndex, 1);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting secret:', error);
    res.status(500).json({ error: 'Failed to delete secret' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'SecureVault Backend' });
});

// Start server - bind to localhost only for security
app.listen(PORT, '127.0.0.1', () => {
  console.log(`🔒 SecureVault backend server running on http://localhost:${PORT}`);
  if (keychainAvailable) {
    console.log(`📦 Secrets will be stored securely in your OS keychain`);
  } else {
    console.log(`⚠️  Using in-memory storage (secrets will be lost on restart)`);
  }
});
