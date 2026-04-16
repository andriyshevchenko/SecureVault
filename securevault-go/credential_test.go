package securevault_test

import (
	"testing"

	sv "github.com/andriyshevchenko/SecureVault/securevault-go"
)

func TestCredentialTarget(t *testing.T) {
	cases := []struct {
		secretID string
		want     string
	}{
		{"abc-123-xyz", "SecureVault/abc-123-xyz"},
		{"43c7f2b7-4b65-49e7-a527-88252920efd7", "SecureVault/43c7f2b7-4b65-49e7-a527-88252920efd7"},
		{"", "SecureVault/"},
	}
	for _, tc := range cases {
		got := sv.CredentialTarget(tc.secretID)
		if got != tc.want {
			t.Errorf("CredentialTarget(%q) = %q, want %q", tc.secretID, got, tc.want)
		}
	}
}
