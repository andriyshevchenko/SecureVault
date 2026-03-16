#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import open from 'open';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const VERSION = '1.1.0';

function printHelp() {
  console.log(`
TOOL: SecureVault v${VERSION}
PURPOSE: Secure secret manager. Stores secrets in the OS keychain. Injects secrets as environment variables into any command via profiles.
SECURITY: Secret values are NEVER returned in API list responses. An AI agent using this tool cannot read secret values — it can only inject them into processes via profiles.

COMMANDS:
  securevault                              Start the web UI (frontend on :5000, API on :3001). Required before using API or web UI.
  securevault run <command> --profile <name>  Execute <command> with secrets from <name> profile injected as environment variables.
  securevault health                        Returns OK if the backend API (port 3001) is reachable. Use this to check before calling other commands.
  securevault list                          Print all stored secret titles, categories, and dates. Does NOT print secret values.
  securevault profiles                      Print all profiles with their environment variable mappings.
  securevault --help                        Print this message.

WORKFLOW FOR AI AGENTS:
  Step 1: Run "securevault health" to check if the backend is running. If it fails, run "securevault" to start it.
  Step 2: Run "securevault list" to see available secrets.
  Step 3: Run "securevault profiles" to see available profiles and their env var mappings.
  Step 4: Run "securevault run <your-command> --profile <name>" to execute a command with secrets injected.
  IMPORTANT: You do NOT need secret values. Use profiles to inject secrets into commands. The value is resolved from the OS keychain at runtime and never exposed to you.

KEY CONCEPTS:
  - Secret: A named credential stored in the OS keychain (title, category). Created via web UI or API. Values are stored in the OS keychain and never returned in API responses.
  - Profile: A named set of mappings from environment variable names to secret IDs. Created via web UI or API.
  - When you run "securevault run <cmd> --profile <name>", each mapping in the profile resolves the secret value from the keychain and sets it as an environment variable before spawning <cmd>.

REST API (requires backend running on localhost:3001):
  GET    /api/secrets                  List all secrets (returns JSON array with id, title, category, notes, createdAt, updatedAt — NO values)
  GET    /api/secrets/:id/value        Get a single secret's value (for web UI only — returns {value: string})
  POST   /api/secrets                  Create secret. Body: {id, title, value, category, notes?, createdAt, updatedAt}
  PUT    /api/secrets/:id              Update secret. Body: partial fields to update.
  DELETE /api/secrets/:id              Delete secret. Returns 204.
  GET    /api/profiles                 List all profiles (returns JSON array with id, name, mappings[], createdAt, updatedAt)
  POST   /api/profiles                 Create profile. Body: {id, name, mappings: [{envVar, secretId}], createdAt, updatedAt}
  PUT    /api/profiles/:id             Update profile. Body: partial fields to update.
  DELETE /api/profiles/:id             Delete profile. Returns 204.
  GET    /api/profiles/:id/resolve     Resolve profile: returns {profile: name, variables: {envVar: secretValue, ...}}
  GET    /api/health                   Returns {status: "ok", service: "SecureVault Backend"}

CATEGORIES (for secret creation): password, api-key, token, certificate, note, other

OUTPUT FORMAT: All API responses are JSON. CLI commands print human-readable text to stdout.
`.trim());
}

async function checkHealth() {
  try {
    const res = await fetch('http://localhost:3001/api/health');
    if (res.ok) {
      const data = await res.json();
      console.log(`✅ ${data.service} is running (status: ${data.status})`);
      process.exit(0);
    } else {
      console.error(`❌ Backend returned HTTP ${res.status}`);
      process.exit(1);
    }
  } catch {
    console.error('❌ Backend is not running. Start it with: securevault');
    process.exit(1);
  }
}

async function listSecrets() {
  try {
    const res = await fetch('http://localhost:3001/api/secrets');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const secrets = await res.json();
    if (secrets.length === 0) {
      console.log('No secrets stored. Add one via the web UI.');
      return;
    }
    console.log(`Found ${secrets.length} secret(s):\n`);
    for (const s of secrets) {
      console.log(`  • ${s.title} (${s.category}) — updated ${new Date(s.updatedAt).toLocaleDateString()}`);
    }
  } catch {
    console.error('❌ Could not fetch secrets. Is the backend running? Start it with: securevault');
    process.exit(1);
  }
}

async function listProfiles() {
  try {
    const res = await fetch('http://localhost:3001/api/profiles');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const profiles = await res.json();
    if (profiles.length === 0) {
      console.log('No profiles yet. Create one via the web UI.');
      return;
    }
    console.log(`Found ${profiles.length} profile(s):\n`);
    for (const p of profiles) {
      console.log(`  📋 ${p.name} (${p.mappings.length} var${p.mappings.length !== 1 ? 's' : ''})`);
      for (const m of p.mappings) {
        console.log(`     ${m.envVar} → [secret]`);
      }
    }
    console.log(`\nUsage: securevault run <command> --profile <name>`);
  } catch {
    console.error('❌ Could not fetch profiles. Is the backend running? Start it with: securevault');
    process.exit(1);
  }
}

// Check for subcommands
const args = process.argv.slice(2);
const cmd = args[0];

if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
  printHelp();
  process.exit(0);
}

if (cmd === '--version' || cmd === '-v') {
  console.log(`SecureVault v${VERSION}`);
  process.exit(0);
}

if (cmd === 'run') {
  const { runCommand } = await import('./run.js');
  await runCommand(args.slice(1));
  process.exit(0);
}

if (cmd === 'health') {
  await checkHealth();
}

if (cmd === 'list') {
  await listSecrets();
  process.exit(0);
}

if (cmd === 'profiles') {
  await listProfiles();
  process.exit(0);
}

console.log('🔒 Starting SecureVault...\n');

// Start backend server
console.log('Starting backend API server on http://localhost:3001...');
const backendProcess = spawn('node', [join(rootDir, 'server', 'index.js')], {
  stdio: 'inherit',
  cwd: rootDir
});

// Wait a bit for backend to start
setTimeout(() => {
  // Start frontend server
  console.log('Starting frontend server on http://localhost:5000...');
  const frontendProcess = spawn('npx', ['http-server', join(rootDir, 'dist'), '-p', '5000', '-c-1', '--silent'], {
    stdio: 'inherit',
    cwd: rootDir
  });

  // Open browser after a short delay
  setTimeout(() => {
    console.log('\n✅ SecureVault is running!');
    console.log('   Frontend: http://localhost:5000');
    console.log('   Backend API: http://localhost:3001');
    console.log('\n   Opening browser...\n');
    open('http://localhost:5000').catch(() => {
      console.log('   Could not open browser automatically. Please open http://localhost:5000 manually.');
    });
  }, 2000);

  // Handle process termination
  const cleanup = () => {
    console.log('\n\n🛑 Shutting down SecureVault...');
    backendProcess.kill();
    frontendProcess.kill();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  frontendProcess.on('exit', () => {
    backendProcess.kill();
    process.exit(0);
  });

  backendProcess.on('exit', () => {
    frontendProcess.kill();
    process.exit(0);
  });
}, 2000);

backendProcess.on('error', (err) => {
  console.error('Failed to start backend:', err);
  process.exit(1);
});
