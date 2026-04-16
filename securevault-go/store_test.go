package securevault_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	sv "github.com/andriyshevchenko/sandboxed-ui/securevault-go"
)

func writeJSON(t *testing.T, dir, name string, v any) {
	t.Helper()
	data, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, name), data, 0600); err != nil {
		t.Fatalf("write: %v", err)
	}
}

func TestLoadProfiles_OK(t *testing.T) {
	dir := t.TempDir()
	profiles := []sv.Profile{
		{
			ID:        "p1",
			Name:      "SENSORIUM",
			CreatedAt: time.Now().UnixMilli(),
			Mappings: []sv.ProfileMapping{
				{EnvVar: "MCP_HTTP_PORT", SecretID: "abc-123"},
				{EnvVar: "TELEGRAM_TOKEN", SecretID: "def-456"},
			},
		},
	}
	writeJSON(t, dir, "profiles.json", profiles)

	store := sv.NewStore(dir)
	got, err := store.LoadProfiles()
	if err != nil {
		t.Fatalf("LoadProfiles: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("got %d profiles, want 1", len(got))
	}
	if got[0].Name != "SENSORIUM" {
		t.Errorf("Name = %q, want SENSORIUM", got[0].Name)
	}
	if len(got[0].Mappings) != 2 {
		t.Errorf("Mappings len = %d, want 2", len(got[0].Mappings))
	}
}

func TestLoadProfiles_Missing(t *testing.T) {
	store := sv.NewStore(t.TempDir())
	got, err := store.LoadProfiles()
	if err != nil {
		t.Fatalf("LoadProfiles missing: %v", err)
	}
	if len(got) != 0 {
		t.Errorf("expected empty slice for missing file, got %d", len(got))
	}
}

func TestLoadProfiles_InvalidJSON(t *testing.T) {
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, "profiles.json"), []byte("not-json"), 0600)

	store := sv.NewStore(dir)
	_, err := store.LoadProfiles()
	if err == nil {
		t.Fatal("expected error for invalid JSON")
	}
}

func TestLoadMetadata_OK(t *testing.T) {
	dir := t.TempDir()
	meta := []sv.SecretMetadata{
		{ID: "abc-123", Title: "MCP Port", Category: sv.CategoryOther, CreatedAt: 1000, UpdatedAt: 1000},
	}
	writeJSON(t, dir, "metadata.json", meta)

	store := sv.NewStore(dir)
	got, err := store.LoadMetadata()
	if err != nil {
		t.Fatalf("LoadMetadata: %v", err)
	}
	if len(got) != 1 || got[0].ID != "abc-123" {
		t.Errorf("unexpected metadata: %+v", got)
	}
}

func TestLoadMetadata_Missing(t *testing.T) {
	store := sv.NewStore(t.TempDir())
	got, err := store.LoadMetadata()
	if err != nil {
		t.Fatalf("LoadMetadata missing: %v", err)
	}
	if len(got) != 0 {
		t.Errorf("expected empty slice, got %d", len(got))
	}
}

func TestProfilesPath(t *testing.T) {
	dir := t.TempDir()
	store := sv.NewStore(dir)
	p, err := store.ProfilesPath()
	if err != nil {
		t.Fatalf("ProfilesPath: %v", err)
	}
	want := filepath.Join(dir, "profiles.json")
	if p != want {
		t.Errorf("ProfilesPath() = %q, want %q", p, want)
	}
}

func TestMetadataPath(t *testing.T) {
	dir := t.TempDir()
	store := sv.NewStore(dir)
	p, err := store.MetadataPath()
	if err != nil {
		t.Fatalf("MetadataPath: %v", err)
	}
	want := filepath.Join(dir, "metadata.json")
	if p != want {
		t.Errorf("MetadataPath() = %q, want %q", p, want)
	}
}
