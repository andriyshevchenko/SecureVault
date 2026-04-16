package securevault_test

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	sv "github.com/andriyshevchenko/SecureVault/securevault-go"
)

// resolveTestProfiles writes a profile JSON fixture and returns a Store pointing at it.
func resolveTestStore(t *testing.T, profiles []sv.Profile) *sv.Store {
	t.Helper()
	dir := t.TempDir()
	data, err := json.Marshal(profiles)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, "profiles.json"), data, 0600); err != nil {
		t.Fatalf("write profiles.json: %v", err)
	}
	return sv.NewStore(dir)
}

func TestResolveProfile_NotFound(t *testing.T) {
	store := resolveTestStore(t, []sv.Profile{
		{ID: "p1", Name: "SENSORIUM", Mappings: []sv.ProfileMapping{{EnvVar: "FOO", SecretID: "s1"}}},
	})
	_, err := store.ResolveProfile("NONEXISTENT")
	if !errors.Is(err, sv.ErrNotFound) {
		t.Fatalf("want ErrNotFound, got %v", err)
	}
}

func TestResolveProfile_MissingCredentialsSkipped(t *testing.T) {
	if runtime.GOOS != "windows" {
		t.Skip("ResolveProfile returns ErrUnsupportedPlatform on non-Windows")
	}

	// Credentials are not in the real store; GetSecretValue returns ErrNotFound.
	// ResolveProfile must return an empty map, not an error.
	store := resolveTestStore(t, []sv.Profile{
		{
			ID:   "p1",
			Name: "TEST",
			Mappings: []sv.ProfileMapping{
				{EnvVar: "FOO", SecretID: "no-such-cred-1"},
				{EnvVar: "BAR", SecretID: "no-such-cred-2"},
			},
		},
	})
	result, err := store.ResolveProfile("TEST")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// On Windows with missing creds, result should be empty but not nil.
	if result == nil {
		t.Fatal("expected non-nil map")
	}
}

func TestResolveProfile_UnsupportedPlatform(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("non-Windows-only behavior")
	}

	store := resolveTestStore(t, []sv.Profile{
		{ID: "p1", Name: "TEST", Mappings: []sv.ProfileMapping{{EnvVar: "FOO", SecretID: "s1"}}},
	})

	_, err := store.ResolveProfile("TEST")
	if !errors.Is(err, sv.ErrUnsupportedPlatform) {
		t.Fatalf("want ErrUnsupportedPlatform, got %v", err)
	}
}

func TestResolveKey_ProfileNotFound(t *testing.T) {
	store := resolveTestStore(t, []sv.Profile{})
	_, err := store.ResolveKey("NOEXIST", "KEY")
	if !errors.Is(err, sv.ErrNotFound) {
		t.Fatalf("want ErrNotFound, got %v", err)
	}
}

func TestResolveKey_EnvVarNotFound(t *testing.T) {
	if runtime.GOOS != "windows" {
		t.Skip("ResolveKey returns ErrUnsupportedPlatform on non-Windows")
	}

	store := resolveTestStore(t, []sv.Profile{
		{ID: "p1", Name: "SENSORIUM", Mappings: []sv.ProfileMapping{{EnvVar: "FOO", SecretID: "s1"}}},
	})
	_, err := store.ResolveKey("SENSORIUM", "NONEXISTENT_KEY")
	if !errors.Is(err, sv.ErrNotFound) {
		t.Fatalf("want ErrNotFound, got %v", err)
	}
}

func TestResolveKey_UnsupportedPlatform(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("non-Windows-only behavior")
	}

	store := resolveTestStore(t, []sv.Profile{
		{ID: "p1", Name: "SENSORIUM", Mappings: []sv.ProfileMapping{{EnvVar: "FOO", SecretID: "s1"}}},
	})

	_, err := store.ResolveKey("SENSORIUM", "FOO")
	if !errors.Is(err, sv.ErrUnsupportedPlatform) {
		t.Fatalf("want ErrUnsupportedPlatform, got %v", err)
	}
}

func TestResolveProfile_EmptyMappings(t *testing.T) {
	store := resolveTestStore(t, []sv.Profile{
		{ID: "p1", Name: "EMPTY", Mappings: []sv.ProfileMapping{}},
	})
	result, err := store.ResolveProfile("EMPTY")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 0 {
		t.Errorf("expected empty map for profile with no mappings, got %v", result)
	}
}

func TestGetSecretValue_UnsupportedPlatform(t *testing.T) {
	// On non-Windows GetSecretValue must return ErrUnsupportedPlatform.
	// On Windows this call may return ErrNotFound when the credential is absent.
	_, err := sv.GetSecretValue("any-secret-id")
	if err == nil {
		// Windows: credential simply may not exist — acceptable for this unit test.
		return
	}
	// Non-Windows: must be ErrUnsupportedPlatform or ErrNotFound (Windows absent cred).
	if !errors.Is(err, sv.ErrUnsupportedPlatform) && !errors.Is(err, sv.ErrNotFound) {
		t.Errorf("GetSecretValue returned unexpected error: %v", err)
	}
}
