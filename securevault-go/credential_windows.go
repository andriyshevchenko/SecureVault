//go:build windows

package securevault

import (
	"unsafe"

	"golang.org/x/sys/windows"
)

// credential mirrors the Win32 CREDENTIALW structure. It is used by passing its address
// to CredReadW via unsafe.Pointer; the blob data is then accessed via unsafe.Slice.
// No CGo is required.
//
// https://learn.microsoft.com/en-us/windows/win32/api/wincred/ns-wincred-credentialw
type credential struct {
	Flags              uint32
	Type               uint32
	TargetName         *uint16
	Comment            *uint16
	LastWritten        windows.Filetime
	CredentialBlobSize uint32
	CredentialBlob     *byte
	Persist            uint32
	AttributeCount     uint32
	Attributes         uintptr
	TargetAlias        *uint16
	UserName           *uint16
}

var (
	modAdvapi32  = windows.NewLazySystemDLL("advapi32.dll")
	procCredRead = modAdvapi32.NewProc("CredReadW")
	procCredFree = modAdvapi32.NewProc("CredFree")
)

const credTypeGeneric = 1

// GetSecretValue fetches the credential blob for secretID from Windows Credential
// Manager using the target "SecureVault/<secretID>". The blob is treated as UTF-8.
// Returns ErrNotFound when the credential does not exist.
func GetSecretValue(secretID string) (string, error) {
	target := CredentialTarget(secretID)
	targetPtr, err := windows.UTF16PtrFromString(target)
	if err != nil {
		return "", err
	}

	var cred *credential
	ret, _, err := procCredRead.Call(
		uintptr(unsafe.Pointer(targetPtr)),
		uintptr(credTypeGeneric),
		0,
		uintptr(unsafe.Pointer(&cred)),
	)
	if ret == 0 {
		if err == windows.ERROR_NOT_FOUND {
			return "", ErrNotFound
		}
		return "", err
	}
	defer procCredFree.Call(uintptr(unsafe.Pointer(cred))) //nolint:errcheck

	if cred.CredentialBlobSize == 0 || cred.CredentialBlob == nil {
		return "", nil
	}

	blob := unsafe.Slice(cred.CredentialBlob, cred.CredentialBlobSize)
	return string(blob), nil
}
