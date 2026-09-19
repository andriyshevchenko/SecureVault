# SecureVault

[![npm version](https://badge.fury.io/js/@mcborov01%2Fsecurevault.svg)](https://www.npmjs.com/package/@mcborov01/securevault)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A secure, local secret manager that stores sensitive information in your operating system's native keychain. Features a modern web UI and a powerful CLI for injecting secrets into any command as environment variables.

## Why SecureVault?

- **No more `.env` files** — Secrets live in your OS keychain, not in plain text
- **Zero cloud dependency** — Everything stays on your machine
- **Environment injection** — Run any command with secrets injected as env vars
- **Beautiful UI** — Dark-themed React frontend with search, categories, and copy-to-clipboard

## Quick Start

```bash
npm install -g @mcborov01/securevault
securevault
```

Opens at `http://localhost:5000`.

## CLI

```bash
securevault                    # Start the web UI + API server
securevault run <cmd> --profile <name>  # Run command with secrets as env vars
securevault run --profile <name> -- <cmd>  # Use -- so <cmd> keeps its own flags
securevault run <cmd> --profile <name> --detach  # Launch detached, return immediately
securevault list               # List all stored secrets
securevault profiles           # List all environment profiles
securevault health             # Check keychain access and the backend
securevault --help             # Show help
securevault --version          # Show version
```

### Environment Profiles

Create profiles in the web UI to map secrets to environment variables:

1. Open the web UI and go to **Profiles**
2. Create a profile (e.g., "dev") and map secrets to env var names
3. Run any command with that profile:

```bash
securevault run node server.js --profile dev
securevault run docker compose up --profile production
securevault run terraform apply --profile aws
```

SecureVault fetches secret values from the OS keychain at runtime and injects them as environment variables. The child process stdout/stderr is piped through, and exit codes are forwarded.

## AI Agent Skill (optional)

SecureVault ships a skill that teaches AI coding agents to inject secrets via profiles instead of reading `.env` files. Installation is **opt-in** — nothing is written to your machine unless you run the command, and it prints exactly which files it writes:

```bash
securevault install-skill               # auto-detect installed agents
securevault install-skill --claude      # Claude Code    (~/.claude/skills/securevault/SKILL.md)
securevault install-skill --copilot     # GitHub Copilot (~/.copilot/skills/securevault/SKILL.md)
securevault install-skill --codex       # OpenAI Codex   (~/.agents/skills/securevault/SKILL.md)
securevault install-skill --all         # all of the above
securevault install-skill --path <dir>  # a custom directory
```

Remove it any time:

```bash
securevault uninstall-skill             # all known targets
securevault uninstall-skill --claude    # a specific agent
```

Restart your agent after installing so it picks up the skill.

## Features

- **Secure Storage** — OS keychain (Keychain on macOS, Credential Vault on Windows, Secret Service API on Linux)
- **Modern UI** — React + Tailwind CSS with Framer Motion animations
- **Categories** — Password, API Key, Token, Certificate, Note, Other
- **Search & Filter** — Find secrets by name or category
- **Values never leave the keychain** — The API never returns raw secret values; the UI shows only a short prefix so you can verify the right secret is stored
- **Single Package** — No Docker, no external services

## Security Model

- Secret values stored in OS keychain via `keytar`
- **Raw secret values are never returned by the API** — not by list endpoints, not by any endpoint
- The web UI shows only a short prefix (first few characters, and only for sufficiently long secrets) for verification; the value's length is not exposed
- Secret values leave the keychain only at `securevault run` time, injected as environment variables into the child process
- The OS keychain is **mandatory** — SecureVault refuses to run if it is unavailable (no insecure in-memory fallback)
- Backend listens on `localhost:3001` only (not exposed to the network)
- CORS restricted to localhost frontend origins
- Request body size limited
- No external data transmission

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/secrets` | List all secrets (metadata + short preview only, no values) |
| `POST` | `/api/secrets` | Create a new secret |
| `PUT` | `/api/secrets/:id` | Update a secret |
| `DELETE` | `/api/secrets/:id` | Delete a secret |
| `GET` | `/api/profiles` | List all profiles |
| `POST` | `/api/profiles` | Create/update a profile |
| `DELETE` | `/api/profiles/:id` | Delete a profile |
| `GET` | `/api/health` | Health check |

## System Requirements

- **Node.js** 20.0.0+ and **npm** 10.0.0+
- **Linux**: requires `libsecret-1-dev` (`sudo apt install libsecret-1-dev`)
- **macOS / Windows**: no additional setup needed

## Upgrading

```bash
npm install -g @mcborov01/securevault@latest
```

Your secrets are safe across upgrades:
- **Secret values** persist in your OS keychain (independent of the app)
- **Metadata** persists in your user directory:
  - Windows: `%LOCALAPPDATA%\SecureVault\metadata.json`
  - macOS: `~/Library/Application Support/SecureVault/metadata.json`
  - Linux: `$XDG_CONFIG_HOME/securevault/metadata.json`

## Development

```bash
git clone https://github.com/andriyshevchenko/SecureVault.git
cd SecureVault
npm install
npm run dev        # Start dev server with hot reload
npm run build      # Production build
npm test           # Run unit tests
npm run test:e2e   # Run end-to-end tests
npm run lint       # Lint code
```

## Uninstalling

```bash
npm uninstall -g @mcborov01/securevault
```

Secrets remain in your OS keychain. To remove them, use your OS credential manager.

## License

MIT

---

**Version**: 2.0.0 | **Author**: [andriyshevchenko](https://github.com/andriyshevchenko) | **Repository**: [github.com/andriyshevchenko/SecureVault](https://github.com/andriyshevchenko/SecureVault)
