# SecureVault: run commands with secrets from the OS keychain

SecureVault stores secrets (API keys, tokens, database passwords, cloud
credentials) in the operating system keychain — not in `.env` files. Raw secret
values are never exposed over its API and never printed. A secret leaves the
keychain only when SecureVault injects it as an environment variable into a
command at run time.

## When to use this

Use SecureVault whenever a command needs a secret. Do **not** read `.env` files,
and do **not** ask the user to paste secret values — inject them with a profile
instead.

## Run a command with secrets

```bash
securevault run --profile <name> -- <command> [args...]
```

The `--` separates SecureVault's own flags from the command, so the command
keeps its own flags. SecureVault resolves each variable mapped in the profile
from the keychain, sets it in the child process environment, then runs the
command and forwards its stdout/stderr and exit code.

Examples:

```bash
securevault run --profile dev -- node server.js
securevault run --profile production -- docker compose up
securevault run --profile aws -- terraform apply
```

## Discover what's available

- `securevault profiles` — list profiles and their env-var mappings (values are NOT shown).
- `securevault list` — list stored secret titles and categories (values are NOT shown).
- `securevault health` — verify the OS keychain is accessible.

## Important

- You cannot read raw secret values, and you do not need to. Use profiles to
  inject them into commands.
- If a required profile or secret does not exist, tell the user to create it in
  the SecureVault web UI (run `securevault` with no arguments) — do not fall back
  to a `.env` file.
- SecureVault requires the OS keychain. If `securevault health` fails, secrets
  cannot be injected and the command should not be run with missing credentials.
