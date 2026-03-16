#!/usr/bin/env node

import { spawn } from 'child_process';
import keytar from 'keytar';
import { fileURLToPath } from 'url';
import { resolve } from 'path';
import { loadProfiles } from '../server/profileStore.js';

const SERVICE_NAME = 'SecureVault';

function parseArgs(args) {
  const commandParts = [];
  let profileName = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--profile' && i + 1 < args.length) {
      profileName = args[i + 1];
      i++; // skip the profile value
    } else {
      commandParts.push(args[i]);
    }
  }

  return { commandParts, profileName };
}

export async function runCommand(args) {
  const { commandParts, profileName } = parseArgs(args);

  if (!profileName) {
    console.error('Error: --profile <name> is required.');
    process.exit(1);
  }

  if (commandParts.length === 0) {
    console.error('Error: No command specified.');
    process.exit(1);
  }

  // Load profiles and find the requested one
  const profiles = await loadProfiles();
  const profile = profiles.find((p) => p.name === profileName);

  if (!profile) {
    console.error(`Error: Profile "${profileName}" not found.`);
    process.exit(1);
  }

  // Resolve secrets from the OS keychain
  const injectedEnv = {};
  const injectedNames = [];

  for (const mapping of profile.mappings) {
    try {
      const secret = await keytar.getPassword(SERVICE_NAME, mapping.secretId);
      if (secret !== null) {
        injectedEnv[mapping.envVar] = secret;
        injectedNames.push(mapping.envVar);
      } else {
        console.warn(`Warning: Secret "${mapping.secretId}" not found in keychain for env var "${mapping.envVar}". Skipping.`);
      }
    } catch (err) {
      console.warn(`Warning: Failed to retrieve secret "${mapping.secretId}" for env var "${mapping.envVar}": ${err.message}. Skipping.`);
    }
  }

  // Print summary of injected env vars
  if (injectedNames.length > 0) {
    console.log(`Injecting ${injectedNames.length} environment variable(s): ${injectedNames.join(', ')}`);
  } else {
    console.log('No environment variables injected.');
  }

  // Build the child process environment
  const childEnv = { ...process.env, ...injectedEnv };

  const isWindows = process.platform === 'win32';

  // On Windows, join command + args into a single shell string to avoid
  // Node DEP0190 deprecation (passing args with shell: true)
  const child = isWindows
    ? spawn(commandParts.join(' '), [], {
        env: childEnv,
        stdio: 'inherit',
        shell: true,
      })
    : spawn(commandParts[0], commandParts.slice(1), {
        env: childEnv,
        stdio: 'inherit',
      });

  // Return a promise that resolves with exit code when the child finishes
  return new Promise((resolve, reject) => {
    child.on('error', (err) => {
      console.error(`Error: Failed to start command "${commandParts.join(' ')}": ${err.message}`);
      reject(err);
    });

    child.on('close', (code) => {
      resolve(code ?? 1);
    });
  });
}

// Allow standalone execution
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && __filename === resolve(process.argv[1])) {
  runCommand(process.argv.slice(2));
}
