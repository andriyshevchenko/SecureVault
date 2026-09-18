#!/usr/bin/env node

import spawn from 'cross-spawn';
import keytar from 'keytar';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { loadProfiles } from '../server/profileStore.js';

const SERVICE_NAME = 'SecureVault';

function parseArgs(args) {
  const commandParts = [];
  let profileName = null;
  let detach = false;
  let passthrough = false;

  for (let i = 0; i < args.length; i++) {
    if (passthrough) {
      commandParts.push(args[i]);
      continue;
    }
    // First `--` ends SecureVault's own flag parsing; the rest is the child
    // command verbatim (so it can carry its own --profile/--detach flags).
    if (args[i] === '--') {
      passthrough = true;
    } else if (args[i] === '--profile' && i + 1 < args.length) {
      profileName = args[i + 1];
      i++; // skip the profile value
    } else if (args[i] === '--detach') {
      detach = true;
    } else {
      commandParts.push(args[i]);
    }
  }

  return { commandParts, profileName, detach };
}

export async function runCommand(args) {
  const { commandParts, profileName, detach } = parseArgs(args);

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
      console.error(`Error: OS keychain is not accessible while resolving env var "${mapping.envVar}": ${err.message}`);
      console.error('SecureVault will not run a command with missing secrets. Aborting.');
      process.exit(1);
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

  // cross-spawn handles Windows argument quoting and .cmd/.bat resolution
  // correctly without shell:true, so args with spaces are preserved and no
  // shell metacharacter injection is possible.
  if (detach) {
    // Detached mode: launch process independently, then exit immediately.
    // The spawned process survives after this Node.js process exits.
    const child = spawn(commandParts[0], commandParts.slice(1), {
      env: childEnv,
      stdio: 'ignore',
      detached: true,
    });

    child.unref();
    console.log(`Launched detached process (PID ${child.pid})`);
    return 0;
  }

  // Attached mode (default): inherit stdio, wait for exit.
  const child = spawn(commandParts[0], commandParts.slice(1), {
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
