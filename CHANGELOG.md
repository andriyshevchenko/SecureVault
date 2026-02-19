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

## [Unreleased]

### Planned
- Import/export functionality
- Secret sharing between users
- Password strength indicator
- Auto-lock after inactivity
- Browser extension
- Tray icon support
- Custom port configuration
