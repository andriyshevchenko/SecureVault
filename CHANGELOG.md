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

## [Unreleased]

### Planned
- Import/export functionality
- Secret sharing between users
- Password strength indicator
- Auto-lock after inactivity
- Browser extension
- Tray icon support
- Custom port configuration
