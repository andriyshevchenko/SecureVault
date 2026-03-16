#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import open from 'open';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const VERSION = '1.0.1';

function printHelp() {
  console.log(`
SecureVault v${VERSION} — Secure secret manager with OS keychain integration

USAGE
  securevault                     Launch the web UI (frontend + backend)
  securevault run <cmd> --profile <name>
                                  Run a command with secrets injected as env vars
  securevault health              Check if the backend API is running
  securevault list                List all stored secrets (titles only, no values)
  securevault profiles            List all profiles and their env var mappings
  securevault help, --help, -h    Show this help message
  securevault --version, -v       Show version

EXAMPLES
  securevault                              # Start the web app
  securevault run dotnet run --profile dev  # Run dotnet with "dev" profile secrets
  securevault run npm start --profile prod  # Run npm start with "prod" profile
  securevault health                       # Check backend status
  securevault list                         # Show all secret titles
  securevault profiles                     # Show all profiles

HOW IT WORKS
  1. Store secrets in the web UI — they're saved in your OS keychain (macOS Keychain,
     Windows Credential Manager, or Linux Secret Service).
  2. Create profiles that map environment variable names to secrets.
  3. Use "securevault run" to launch any command with those secrets injected as
     environment variables. Secrets never touch disk or appear in shell history.

BACKEND API
  http://localhost:3001/api/secrets    GET/POST/PUT/DELETE secrets
  http://localhost:3001/api/profiles   GET/POST/PUT/DELETE profiles
  http://localhost:3001/api/health     Health check
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
