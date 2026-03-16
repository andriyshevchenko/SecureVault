import express from 'express';
import cors from 'cors';
import keytar from 'keytar';
import { loadMetadata, saveMetadata } from './metadataStore.js';
import { loadProfiles, saveProfiles } from './profileStore.js';

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
// Metadata is persisted to disk only when keychain is available
let secretsMetadata = [];

if (keychainAvailable) {
  secretsMetadata = loadMetadata();
  console.log(`📂 Loaded ${secretsMetadata.length} secret(s) from persistent storage`);
} else {
  console.log('📂 Keychain unavailable; metadata persistence disabled, starting with empty in-memory storage');
}

let profilesData = [];

if (keychainAvailable) {
  profilesData = loadProfiles();
  console.log(`📂 Loaded ${profilesData.length} profile(s) from persistent storage`);
} else {
  console.log('📂 Keychain unavailable; profile persistence disabled, starting with empty in-memory storage');
}

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
    
    // Persist metadata to disk with rollback on failure (only if keychain available)
    if (keychainAvailable) {
      try {
        saveMetadata(secretsMetadata);
      } catch (persistError) {
        // Roll back: remove metadata from memory and delete from keychain
        secretsMetadata.pop();
        try {
          await storage.deletePassword(SERVICE_NAME, id);
        } catch (rollbackError) {
          console.error('Failed to rollback keychain entry:', rollbackError);
        }
        throw new Error('Failed to persist secret metadata');
      }
    }
    
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
    let previousValue;
    if (value !== undefined) {
      if (value === null || value === '') {
        return res.status(400).json({ error: 'Secret value cannot be empty' });
      }
      if (typeof value !== 'string') {
        return res.status(400).json({ error: 'Secret value must be a string' });
      }
      previousValue = secretValue; // Capture for rollback
      await storage.setPassword(SERVICE_NAME, id, value);
      secretValue = value;
    }
    
    // Update metadata, preserving existing fields when omitted
    const updatedMeta = {
      ...existingMeta,
      title: title !== undefined ? title.trim() : existingMeta.title,
      category: category !== undefined ? category : existingMeta.category,
      notes: notes !== undefined ? notes : existingMeta.notes,
      updatedAt: updatedAt !== undefined ? updatedAt : existingMeta.updatedAt
    };
    secretsMetadata[metaIndex] = updatedMeta;
    
    // Persist metadata to disk with rollback on failure (only if keychain available)
    if (keychainAvailable) {
      try {
        saveMetadata(secretsMetadata);
      } catch (persistError) {
        // Roll back: restore previous metadata and keychain value
        secretsMetadata[metaIndex] = existingMeta;
        if (previousValue !== undefined) {
          try {
            await storage.setPassword(SERVICE_NAME, id, previousValue);
          } catch (rollbackError) {
            console.error('Failed to rollback keychain value:', rollbackError);
          }
        }
        throw new Error('Failed to persist secret metadata');
      }
    }
    
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
    
    // Save metadata and value before deletion for potential rollback
    const deletedMetadata = secretsMetadata[metaIndex];
    const deletedValue = await storage.getPassword(SERVICE_NAME, id);
    
    // Delete from keychain
    await storage.deletePassword(SERVICE_NAME, id);
    
    // Delete metadata from memory
    secretsMetadata.splice(metaIndex, 1);
    
    // Persist metadata to disk with rollback on failure (only if keychain available)
    if (keychainAvailable) {
      try {
        saveMetadata(secretsMetadata);
      } catch (persistError) {
        // Roll back: restore metadata to memory and keychain
        secretsMetadata.splice(metaIndex, 0, deletedMetadata);
        if (deletedValue !== null && deletedValue !== undefined) {
          try {
            await storage.setPassword(SERVICE_NAME, id, deletedValue);
          } catch (rollbackError) {
            console.error('Failed to restore secret to keychain during rollback:', rollbackError);
          }
        }
        throw new Error('Failed to persist metadata deletion');
      }
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting secret:', error);
    res.status(500).json({ error: 'Failed to delete secret' });
  }
});

// GET /api/profiles
app.get('/api/profiles', (req, res) => {
  try {
    res.json(profilesData);
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
});

// POST /api/profiles
app.post('/api/profiles', (req, res) => {
  try {
    const { id, name, mappings, createdAt, updatedAt } = req.body;
    if (!id || !name || !mappings) {
      return res.status(400).json({ error: 'Missing required fields: id, name, mappings' });
    }
    if (typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Name must be a non-empty string' });
    }
    if (!Array.isArray(mappings)) {
      return res.status(400).json({ error: 'Mappings must be an array' });
    }
    for (const mapping of mappings) {
      if (!mapping.envVar || !mapping.secretId) {
        return res.status(400).json({ error: 'Each mapping must have envVar and secretId' });
      }
    }
    const existingProfile = profilesData.find(p => p.id === id);
    if (existingProfile) {
      return res.status(409).json({ error: 'Profile with this ID already exists' });
    }
    const duplicateName = profilesData.find(p => p.name === name.trim());
    if (duplicateName) {
      return res.status(409).json({ error: 'Profile with this name already exists' });
    }

    const profile = { id, name: name.trim(), mappings, createdAt, updatedAt };
    profilesData.push(profile);

    if (keychainAvailable) {
      try {
        saveProfiles(profilesData);
      } catch (persistError) {
        profilesData.pop();
        throw new Error('Failed to persist profile');
      }
    }
    res.status(201).json(profile);
  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

// PUT /api/profiles/:id
app.put('/api/profiles/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, mappings, updatedAt } = req.body;
    const index = profilesData.findIndex(p => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return res.status(400).json({ error: 'Name must be a non-empty string' });
    }
    if (mappings !== undefined && !Array.isArray(mappings)) {
      return res.status(400).json({ error: 'Mappings must be an array' });
    }
    if (mappings !== undefined) {
      for (const mapping of mappings) {
        if (!mapping.envVar || !mapping.secretId) {
          return res.status(400).json({ error: 'Each mapping must have envVar and secretId' });
        }
      }
    }
    // Check for duplicate name (exclude current profile)
    if (name !== undefined) {
      const duplicateName = profilesData.find(p => p.name === name.trim() && p.id !== id);
      if (duplicateName) {
        return res.status(409).json({ error: 'Profile with this name already exists' });
      }
    }

    const existing = profilesData[index];
    const updated = {
      ...existing,
      name: name !== undefined ? name.trim() : existing.name,
      mappings: mappings !== undefined ? mappings : existing.mappings,
      updatedAt: updatedAt !== undefined ? updatedAt : existing.updatedAt,
    };
    profilesData[index] = updated;

    if (keychainAvailable) {
      try {
        saveProfiles(profilesData);
      } catch (persistError) {
        profilesData[index] = existing;
        throw new Error('Failed to persist profile');
      }
    }
    res.json(updated);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// DELETE /api/profiles/:id
app.delete('/api/profiles/:id', (req, res) => {
  try {
    const { id } = req.params;
    const index = profilesData.findIndex(p => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    const deleted = profilesData[index];
    profilesData.splice(index, 1);

    if (keychainAvailable) {
      try {
        saveProfiles(profilesData);
      } catch (persistError) {
        profilesData.splice(index, 0, deleted);
        throw new Error('Failed to persist profile deletion');
      }
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting profile:', error);
    res.status(500).json({ error: 'Failed to delete profile' });
  }
});

// GET /api/profiles/:id/resolve - Resolve profile to env var → value pairs
app.get('/api/profiles/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const profile = profilesData.find(p => p.id === id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const resolved = {};
    for (const mapping of profile.mappings) {
      try {
        const value = await storage.getPassword(SERVICE_NAME, mapping.secretId);
        if (value !== null) {
          resolved[mapping.envVar] = value;
        }
      } catch (err) {
        console.warn(`Warning: Could not resolve secret ${mapping.secretId}: ${err.message}`);
      }
    }
    res.json({ profile: profile.name, variables: resolved });
  } catch (error) {
    console.error('Error resolving profile:', error);
    res.status(500).json({ error: 'Failed to resolve profile' });
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
