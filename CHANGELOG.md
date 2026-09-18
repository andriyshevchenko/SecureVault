# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-18

### Added
- Initial release of SecureVault
- React-based frontend with modern UI
- Express backend with OS keychain integration
- Support for multiple secret categories (Password, API Key, Token, Certificate, Note, Other)
- Search and filter functionality
- Copy to clipboard feature
- Comprehensive unit tests for frontend
- Backend unit and E2E tests with real keychain integration
- GitHub Actions CI/CD workflows
- NPM global package installation
- CLI command: `securevault`
- Full documentation

### Features
- Secure storage using OS native keychain (macOS, Windows, Linux)
- Fallback to in-memory storage when keychain unavailable
- REST API for secret management
- Beautiful dark-themed UI with animations
- Cross-platform support
- Single command installation and execution

### Security
- No cloud storage - all data stays local
- Secrets encrypted using OS keychain
- CORS-enabled API for localhost only
- No external dependencies for secret storage

### Removed
- Docker support (replaced with direct NPM installation)
- Docker-related files and scripts
- OS boot integration scripts (focus on robust CLI command)

## [1.0.1] - 2026-02-18

### Fixed
- **Secret Persistence**: Secrets now persist between server restarts. Secret metadata (title, category, notes, timestamps) is now saved to a local JSON file in the user's home directory, ensuring secrets remain accessible after the application restarts. This fixes the issue where secrets were becoming inaccessible on Windows 11 and other platforms after restarting the application.

### Changed
- Secret metadata storage location is now platform-specific with environment variable support:
  - Windows: `%LOCALAPPDATA%\SecureVault\metadata.json` (respects `LOCALAPPDATA` environment variable)
  - macOS: `~/Library/Application Support/SecureVault/metadata.json`
  - Linux: `$XDG_CONFIG_HOME/securevault/metadata.json` (respects `XDG_CONFIG_HOME` environment variable)
- Metadata file now has restrictive permissions (0o600 on POSIX systems) for enhanced security
- Metadata writes use atomic file replacement to prevent corruption on crashes

### Improved
- Metadata persistence uses synchronous atomic writes for reliability and simplicity
- Added validation for loaded metadata to handle corrupted files gracefully
- Extracted persistence functions to separate module for better testability

## [2.1.0] - 2026-09-18

### Added
- `securevault install-skill` / `securevault uninstall-skill`: opt-in commands that install an AI-agent skill teaching Claude Code, GitHub Copilot, and OpenAI Codex to inject secrets via `securevault run --profile` instead of reading `.env` files. Auto-detects installed agents and supports `--claude`, `--copilot`, `--codex`, `--all`, `--path <dir>`, and `--force`. Nothing is written unless you run the command, and it prints exactly which files it writes.

## [2.0.2] - 2026-09-18

### Fixed
- The `securevault` dashboard launcher now waits until the backend and frontend actually respond before printing "SecureVault is running", instead of printing it after a fixed delay while the site was still starting up.
- A busy port now produces a clear "port already in use" message and a non-zero exit, instead of a raw `EADDRINUSE` stack trace.
- Shutdown now terminates the whole child process tree on Windows, so the backend and static server no longer orphan and keep holding their ports after exit.

## [2.0.1] - 2026-09-18

### Security
- Drastically reduced the dependency surface that end users install. Only the actual runtime dependencies (`express`, `cors`, `keytar`, `cross-spawn`, `http-server`) remain in `dependencies`; the entire frontend build toolchain (React, Radix UI, Vite, Tailwind, three, d3, etc.) — which is bundled into `dist/` at build time and never used at runtime — moved to `devDependencies`. This removes all previously reported high/moderate vulnerabilities from a production install (`npm audit --omit=dev` reports 0).

### Fixed
- Publishing no longer builds during `npm ci` (removed the `prepare` script that triggered a redundant, occasionally segfaulting `vite build` on CI). The build now runs once via the explicit CI step.

## [2.0.0] - 2026-09-18

### BREAKING
- Raw secret values are no longer exposed by the HTTP API. Removed `GET /api/secrets/:id/value` and `GET /api/profiles/:id/resolve`. Secret values leave the OS keychain only at `securevault run` time, injected as environment variables into the child process.
- The web UI no longer reveals or copies raw secret values. It now shows only a short prefix (the first few characters, and only for sufficiently long secrets) so you can verify the correct secret is stored.
- The OS keychain is now mandatory. SecureVault refuses to start (and `securevault run` aborts) if the keychain is unavailable. The previous silent in-memory fallback has been removed — it could lose secrets on restart and gave a false sense of security.
- The edit form no longer prefills the secret value. Leave it blank to keep the current value, or type a new one to replace it.

### Added
- Secret metadata now includes a non-sensitive `preview` (computed at write time) for UI verification. The value's length is never exposed.
- `securevault run` supports a `--` separator so the wrapped command can carry its own flags, e.g. `securevault run --profile dev -- mytool --profile prod`.

### Fixed
- **Windows argument handling**: `securevault run` no longer mangles command arguments that contain spaces or quotes. Commands are spawned via `cross-spawn` with proper argument boundaries and without an intermediate shell, fixing e.g. `terraform apply -var "region us-east"`.
- `repository.url` in `package.json` now points to the correct repository.

### Security
- No API endpoint returns raw secret values under any circumstances.
- Keychain errors during `securevault run` are now fatal instead of silently injecting empty values.

## [Unreleased]

### Planned
- Import/export functionality
- Secret sharing between users
- Password strength indicator
- Auto-lock after inactivity
- Browser extension
- Tray icon support
- Custom port configuration
