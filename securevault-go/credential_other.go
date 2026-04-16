//go:build !windows

package securevault

// GetSecretValue is not supported on non-Windows platforms.
// It always returns ErrUnsupportedPlatform.
func GetSecretValue(secretID string) (string, error) {
	return "", ErrUnsupportedPlatform
}
