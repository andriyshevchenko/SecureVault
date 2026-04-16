// Package securevault provides read-only access to SecureVault profiles and secrets.
//
// Profiles are stored as JSON under %LOCALAPPDATA%\SecureVault\profiles.json.
// Secret values are stored in the Windows Credential Manager under targets of
// the form "SecureVault/<secretId>". This package reads both sources without any
// dependency on the SecureVault Node.js server or HTTP API.
package securevault

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"runtime"
)

// ErrNotFound is returned when a requested credential or profile does not exist.
var ErrNotFound = errors.New("securevault: not found")

// ErrUnsupportedPlatform is returned by credential operations on non-Windows platforms.
var ErrUnsupportedPlatform = errors.New("securevault: unsupported platform: " + runtime.GOOS)

// SecretCategory classifies the type of a stored secret.
type SecretCategory string

const (
	CategoryPassword    SecretCategory = "password"
	CategoryAPIKey      SecretCategory = "api-key"
	CategoryToken       SecretCategory = "token"
	CategoryCertificate SecretCategory = "certificate"
	CategoryNote        SecretCategory = "note"
	CategoryOther       SecretCategory = "other"
)

// ProfileMapping links an environment variable name to a SecureVault secret ID.
type ProfileMapping struct {
	EnvVar   string `json:"envVar"`
	SecretID string `json:"secretId"`
}

// Profile represents a named group of env-var-to-secret mappings.
type Profile struct {
	ID        string           `json:"id"`
	Name      string           `json:"name"`
	Mappings  []ProfileMapping `json:"mappings"`
	CreatedAt int64            `json:"createdAt"` // Unix milliseconds
	UpdatedAt int64            `json:"updatedAt"` // Unix milliseconds
}

// SecretMetadata holds descriptive information about a stored secret.
// Secret values are never stored here; use GetSecretValue to retrieve them.
type SecretMetadata struct {
	ID        string         `json:"id"`
	Title     string         `json:"title"`
	Category  SecretCategory `json:"category"`
	Notes     string         `json:"notes,omitempty"`
	CreatedAt int64          `json:"createdAt"`
	UpdatedAt int64          `json:"updatedAt"`
}

// Store provides access to SecureVault profile and metadata files.
// Use NewStore to create one.
type Store struct {
	baseDir string
}

// NewStore returns a Store rooted at baseDir. If baseDir is empty, it defaults to
// %LOCALAPPDATA%\SecureVault on Windows, ~/Library/Application Support/SecureVault
// on macOS, and $XDG_CONFIG_HOME/securevault (or ~/.config/securevault) on Linux.
func NewStore(baseDir string) *Store {
	return &Store{baseDir: baseDir}
}

// resolveBaseDir returns the effective base directory, computing the platform-specific
// default if s.baseDir is empty.
func (s *Store) resolveBaseDir() (string, error) {
	if s.baseDir != "" {
		return s.baseDir, nil
	}
	switch runtime.GOOS {
	case "windows":
		local := os.Getenv("LOCALAPPDATA")
		if local == "" {
			return "", errors.New("securevault: LOCALAPPDATA not set")
		}
		return filepath.Join(local, "SecureVault"), nil
	case "darwin":
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		return filepath.Join(home, "Library", "Application Support", "SecureVault"), nil
	default:
		cfgHome := os.Getenv("XDG_CONFIG_HOME")
		if cfgHome == "" {
			home, err := os.UserHomeDir()
			if err != nil {
				return "", err
			}
			cfgHome = filepath.Join(home, ".config")
		}
		return filepath.Join(cfgHome, "securevault"), nil
	}
}

// ProfilesPath returns the absolute path to the profiles JSON file.
func (s *Store) ProfilesPath() (string, error) {
	base, err := s.resolveBaseDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(base, "profiles.json"), nil
}

// LoadProfiles reads and parses the profiles file.
// Returns an empty slice (not an error) if the file does not exist.
func (s *Store) LoadProfiles() ([]Profile, error) {
	path, err := s.ProfilesPath()
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return []Profile{}, nil
	}
	if err != nil {
		return nil, err
	}
	var profiles []Profile
	if err := json.Unmarshal(data, &profiles); err != nil {
		return nil, err
	}
	return profiles, nil
}

// MetadataPath returns the absolute path to the metadata JSON file.
func (s *Store) MetadataPath() (string, error) {
	base, err := s.resolveBaseDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(base, "metadata.json"), nil
}

// LoadMetadata reads and parses the metadata file.
// Returns an empty slice (not an error) if the file does not exist.
func (s *Store) LoadMetadata() ([]SecretMetadata, error) {
	path, err := s.MetadataPath()
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return []SecretMetadata{}, nil
	}
	if err != nil {
		return nil, err
	}
	var meta []SecretMetadata
	if err := json.Unmarshal(data, &meta); err != nil {
		return nil, err
	}
	return meta, nil
}

// CredentialTarget returns the Windows Credential Manager target name for a secret ID.
// The format matches keytar's convention: "SecureVault/<secretID>".
func CredentialTarget(secretID string) string {
	return "SecureVault/" + secretID
}

// ResolveProfile loads the named profile and resolves each env-var mapping to its
// secret value from Windows Credential Manager. Secrets missing from the credential
// store are silently skipped (matching server behaviour). Returns an error only when
// profile file I/O fails or the named profile does not exist.
func (s *Store) ResolveProfile(profileName string) (map[string]string, error) {
	profiles, err := s.LoadProfiles()
	if err != nil {
		return nil, err
	}
	var found *Profile
	for i := range profiles {
		if profiles[i].Name == profileName {
			found = &profiles[i]
			break
		}
	}
	if found == nil {
		return nil, ErrNotFound
	}

	result := make(map[string]string, len(found.Mappings))
	for _, m := range found.Mappings {
		val, err := GetSecretValue(m.SecretID)
		if err != nil {
			// Silently skip only expected "not present" cases.
			// Unexpected errors (permission failures, corrupted state, etc.) are returned.
			if errors.Is(err, ErrNotFound) || errors.Is(err, ErrUnsupportedPlatform) {
				continue
			}
			return nil, err
		}
		result[m.EnvVar] = val
	}
	return result, nil
}

// ResolveKey returns the secret value for a single env-var key within a named profile.
// Returns ErrNotFound if the profile, the env-var mapping, or the credential does not exist.
// Returns ErrUnsupportedPlatform on non-Windows systems.
func (s *Store) ResolveKey(profileName, envVar string) (string, error) {
	profiles, err := s.LoadProfiles()
	if err != nil {
		return "", err
	}
	for _, p := range profiles {
		if p.Name != profileName {
			continue
		}
		for _, m := range p.Mappings {
			if m.EnvVar == envVar {
				return GetSecretValue(m.SecretID)
			}
		}
		return "", ErrNotFound
	}
	return "", ErrNotFound
}
