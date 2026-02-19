# SecureVault - Secret Manager

[![CI](https://github.com/andriyshevchenko/sandboxed-ui/workflows/CI/badge.svg)](https://github.com/andriyshevchenko/sandboxed-ui/actions)
[![npm version](https://badge.fury.io/js/@mcborov01%2Fsecurevault.svg)](https://www.npmjs.com/package/@mcborov01/securevault)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A secure, local secret manager application that uses your operating system's native keychain to store sensitive information like passwords, API keys, and credentials. Install globally via NPM and run with a simple command.

## Features

- 🔒 **Secure Storage**: All secrets are stored in your OS keychain (Keychain on macOS, Credential Vault on Windows, Secret Service API on Linux)
- 🎨 **Modern UI**: Beautiful, dark-themed interface with smooth animations
- 🔍 **Search & Filter**: Quickly find secrets by name or category
- 📁 **Categories**: Organize secrets into Password, API Key, Token, Certificate, Note, or Other
- ✂️ **Copy to Clipboard**: One-click copy for quick access
- 🔐 **Privacy First**: No cloud storage, all data stays on your machine
- 📦 **Single Package**: Install globally via NPM - no Docker required
- ✅ **Fully Tested**: Comprehensive unit and E2E tests

## Quick Start

### Global Installation (Recommended)

Install SecureVault globally using npm:

```bash
npm install -g @mcborov01/securevault
```

Then simply run:

```bash
securevault
```

The application will start automatically and open in your default browser at `http://localhost:5000`.

## Upgrading

SecureVault can be easily upgraded to newer versions while preserving all your secrets and settings.

### Upgrading to a New Version

To upgrade SecureVault to the latest version:

```bash
npm install -g @mcborov01/securevault@latest
```

Or upgrade to a specific version:

```bash
npm install -g @mcborov01/securevault@1.0.2
```

### What Happens During an Upgrade

**Your secrets are safe!** All your data persists across upgrades because:

1. **Secret Values**: Stored in your OS keychain (completely independent of the application)
   - Windows: Windows Credential Vault
   - macOS: Keychain
   - Linux: Secret Service API

2. **Secret Metadata**: Stored in your user directory (not in the npm package)
   - Windows: `%LOCALAPPDATA%\SecureVault\metadata.json`
   - macOS: `~/Library/Application Support/SecureVault/metadata.json`
   - Linux: `$XDG_CONFIG_HOME/securevault/metadata.json`

When you upgrade, npm only updates the application code in its global packages directory. Your secrets and metadata remain untouched in their respective locations.

### Verifying Your Upgrade

After upgrading, verify the installation:

```bash
# Check the installed version
npm list -g @mcborov01/securevault

# Start the application
securevault
```

Your secrets should appear exactly as they were before the upgrade.

### Backup Recommendations

While upgrades preserve your data automatically, it's good practice to backup your secrets:

1. **Backup Metadata File**: Copy your metadata file to a safe location
   - Windows: `%LOCALAPPDATA%\SecureVault\metadata.json`
   - macOS: `~/Library/Application Support/SecureVault/metadata.json`
   - Linux: `$XDG_CONFIG_HOME/securevault/metadata.json` (or `~/.config/securevault/metadata.json`)

2. **Export from Keychain** (optional but recommended):
   - **Windows**: Use "Credential Manager" to view/export SecureVault entries
   - **macOS**: Use "Keychain Access" to export SecureVault entries
   - **Linux**: Use your keyring manager (e.g., Seahorse) to backup SecureVault entries

### Downgrading

To downgrade to a previous version if needed:

```bash
npm install -g @mcborov01/securevault@1.0.0
```

Your secrets will remain intact during downgrades as well.

### Local Development

If you want to contribute or run from source:

```bash
# Clone the repository
git clone https://github.com/andriyshevchenko/sandboxed-ui.git
cd sandboxed-ui

# Install dependencies
npm install

# Build the frontend
npm run build

# Start the application
npm start
```

## System Requirements

- **Node.js**: 20.0.0 or higher
- **npm**: 10.0.0 or higher
- **System dependencies**:
  - **macOS**: No additional setup needed
  - **Linux**: `sudo apt-get install libsecret-1-dev` (Debian/Ubuntu) or equivalent
  - **Windows**: No additional setup needed

## Usage

Once running, SecureVault provides:

- **Frontend UI**: http://localhost:5000
- **Backend API**: http://localhost:3001

### Adding Secrets

1. Click the "Add Secret" button
2. Fill in the title, value, category, and optional notes
3. Click "Add Secret" to save

### Managing Secrets

- **View**: Click the eye icon to reveal/hide secret values
- **Copy**: Click the copy icon to copy to clipboard
- **Edit**: Click the edit icon to modify
- **Delete**: Click the trash icon to remove
- **Search**: Type in the search bar to filter secrets
- **Filter**: Click category buttons to filter by type

## API Endpoints

The backend server exposes the following REST API:

- `GET /api/secrets` - Get all secrets
- `POST /api/secrets` - Create a new secret
- `PUT /api/secrets/:id` - Update a secret
- `DELETE /api/secrets/:id` - Delete a secret
- `GET /api/health` - Health check

## Development

### Scripts

- `npm start` - Start the application
- `npm run dev` - Start development server (frontend only)
- `npm run server` - Start backend server only
- `npm run build` - Build frontend for production
- `npm test` - Run frontend tests
- `npm run test:server` - Run backend unit tests
- `npm run test:e2e` - Run E2E tests with real keychain
- `npm run lint` - Run ESLint

### Testing

#### Frontend Tests
```bash
npm test
```

Runs unit tests for the frontend components and API client using Vitest.

#### Backend Unit Tests
```bash
npm run test:server
```

Tests API endpoints with mocked keychain access.

#### Backend E2E Tests
```bash
npm run test:e2e
```

Tests real keychain integration (requires OS keychain access).

## CI/CD

This project includes GitHub Actions workflows for:

### Continuous Integration (.github/workflows/ci.yml)
- Frontend linting and building
- Frontend unit tests
- Backend tests across multiple OS (Ubuntu, macOS, Windows)
- Backend E2E tests with real keychain (macOS only)

### NPM Publishing (.github/workflows/publish.yml)
- Automatic publishing to NPM on version changes in package.json
- Requires `NPM_ACCESS_TOKEN` secret in repository settings

## Security

- All secret values are stored in the OS keychain using the `keytar` library
- The backend HTTP API listens on `localhost:3001` (127.0.0.1) by default and is restricted to local connections only
- CORS is configured to only allow requests from localhost frontend origins (ports 3000, 5000, and 5173 for Vite dev server)
- Do not expose the backend port to untrusted networks or bind it to `0.0.0.0`
- No data is sent to any external servers
- Secret metadata (title, category, notes, timestamps) is stored in a local JSON file in your user directory
- Secret values are stored securely in the OS keychain
- Fallback to in-memory storage when OS keychain is unavailable

### Data Storage Locations

When using SecureVault, your data is stored in two places:

1. **Secret Values**: Stored securely in your OS keychain
   - **Windows**: Windows Credential Vault
   - **macOS**: Keychain
   - **Linux**: Secret Service API (GNOME Keyring, KWallet, etc.)

2. **Secret Metadata**: Stored in a local JSON file
   - **Windows**: `%LOCALAPPDATA%\SecureVault\metadata.json` (uses `LOCALAPPDATA` environment variable or defaults to `%USERPROFILE%\AppData\Local`)
   - **macOS**: `~/Library/Application Support/SecureVault/metadata.json`
   - **Linux**: `$XDG_CONFIG_HOME/securevault/metadata.json` (uses `XDG_CONFIG_HOME` environment variable or defaults to `~/.config`)

**Important**: These storage locations are independent of the application installation directory, which means your secrets automatically persist across application upgrades, reinstalls, and restarts.

## Uninstalling

To remove SecureVault:

```bash
npm uninstall -g @mcborov01/securevault
```

## Troubleshooting

### Backend won't start

Make sure you have the required system libraries:
- **macOS**: No additional setup needed
- **Linux**: `sudo apt-get install libsecret-1-dev` (Debian/Ubuntu)
- **Windows**: No additional setup needed

### Frontend can't connect to backend

- Ensure the backend server is running on port 3001
- Check that no firewall is blocking the connection
- Verify CORS is enabled in the backend (it should be by default)

### Port Already in Use

If ports 3001 or 5000 are already in use, you'll need to:
1. Stop the conflicting service
2. Or modify the ports in `server/index.js` and `bin/securevault.js`

### Clearing All Data

To completely remove all secrets and metadata:

1. Uninstall the package: `npm uninstall -g @mcborov01/securevault`
2. Remove the metadata file:
   - **Windows**: Delete `%LOCALAPPDATA%\SecureVault\metadata.json` (or `%USERPROFILE%\AppData\Local\SecureVault\metadata.json` if LOCALAPPDATA is not set)
   - **macOS**: Delete `~/Library/Application Support/SecureVault/metadata.json`
   - **Linux**: Delete `$XDG_CONFIG_HOME/securevault/metadata.json` (or `~/.config/securevault/metadata.json` if XDG_CONFIG_HOME is not set)
3. Remove secrets from your OS keychain:
   - **Windows**: Open "Credential Manager" and delete entries starting with "SecureVault"
   - **macOS**: Open "Keychain Access" and search for "SecureVault"
   - **Linux**: Use your system's keyring manager (e.g., Seahorse for GNOME)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [React](https://reactjs.org/), [Vite](https://vitejs.dev/), and [Express](https://expressjs.com/)
- Uses [keytar](https://github.com/atom/node-keytar) for OS keychain integration
- UI components from [Radix UI](https://www.radix-ui.com/)
- Styling with [Tailwind CSS](https://tailwindcss.com/)

---

**Version**: 1.0.0  
**Author**: andriyshevchenko  
**Repository**: https://github.com/andriyshevchenko/sandboxed-ui
