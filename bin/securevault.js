#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import open from 'open';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

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
