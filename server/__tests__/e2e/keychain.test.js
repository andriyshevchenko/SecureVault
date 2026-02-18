import keytar from 'keytar';

const SERVICE_NAME = 'SecureVault-E2E-Test';
const TEST_ACCOUNT = 'test-account';

describe('E2E: Real Keychain Integration', () => {
  beforeAll(async () => {
    // Clean up any existing test data
    try {
      await keytar.deletePassword(SERVICE_NAME, TEST_ACCOUNT);
    } catch (err) {
      // Ignore if not found
    }
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await keytar.deletePassword(SERVICE_NAME, TEST_ACCOUNT);
    } catch (err) {
      // Ignore if not found
    }
  });

  it('should store and retrieve a password from real keychain', async () => {
    const testPassword = 'my-super-secret-password-123';

    // Store password
    await keytar.setPassword(SERVICE_NAME, TEST_ACCOUNT, testPassword);

    // Retrieve password
    const retrieved = await keytar.getPassword(SERVICE_NAME, TEST_ACCOUNT);

    expect(retrieved).toBe(testPassword);
  });

  it('should update an existing password in keychain', async () => {
    const initialPassword = 'initial-password';
    const updatedPassword = 'updated-password';

    // Store initial password
    await keytar.setPassword(SERVICE_NAME, TEST_ACCOUNT, initialPassword);

    // Verify initial storage
    let retrieved = await keytar.getPassword(SERVICE_NAME, TEST_ACCOUNT);
    expect(retrieved).toBe(initialPassword);

    // Update password
    await keytar.setPassword(SERVICE_NAME, TEST_ACCOUNT, updatedPassword);

    // Verify update
    retrieved = await keytar.getPassword(SERVICE_NAME, TEST_ACCOUNT);
    expect(retrieved).toBe(updatedPassword);
  });

  it('should delete a password from keychain', async () => {
    const testPassword = 'password-to-delete';

    // Store password
    await keytar.setPassword(SERVICE_NAME, TEST_ACCOUNT, testPassword);

    // Verify it exists
    let retrieved = await keytar.getPassword(SERVICE_NAME, TEST_ACCOUNT);
    expect(retrieved).toBe(testPassword);

    // Delete password
    const deleted = await keytar.deletePassword(SERVICE_NAME, TEST_ACCOUNT);
    expect(deleted).toBe(true);

    // Verify deletion
    retrieved = await keytar.getPassword(SERVICE_NAME, TEST_ACCOUNT);
    expect(retrieved).toBeNull();
  });

  it('should return null for non-existent password', async () => {
    const retrieved = await keytar.getPassword(SERVICE_NAME, 'non-existent-account');
    expect(retrieved).toBeNull();
  });

  it('should handle multiple accounts for the same service', async () => {
    const account1 = 'account-1';
    const account2 = 'account-2';
    const password1 = 'password-1';
    const password2 = 'password-2';

    try {
      // Store passwords for different accounts
      await keytar.setPassword(SERVICE_NAME, account1, password1);
      await keytar.setPassword(SERVICE_NAME, account2, password2);

      // Retrieve and verify
      const retrieved1 = await keytar.getPassword(SERVICE_NAME, account1);
      const retrieved2 = await keytar.getPassword(SERVICE_NAME, account2);

      expect(retrieved1).toBe(password1);
      expect(retrieved2).toBe(password2);
    } finally {
      // Cleanup
      await keytar.deletePassword(SERVICE_NAME, account1);
      await keytar.deletePassword(SERVICE_NAME, account2);
    }
  });

  it('should handle special characters in passwords', async () => {
    const specialPassword = 'p@ssw0rd!#$%^&*()_+-=[]{}|;:\'",.<>?/~`';

    await keytar.setPassword(SERVICE_NAME, TEST_ACCOUNT, specialPassword);
    const retrieved = await keytar.getPassword(SERVICE_NAME, TEST_ACCOUNT);

    expect(retrieved).toBe(specialPassword);
  });

  it('should handle unicode characters in passwords', async () => {
    const unicodePassword = 'пароль密碼🔒🔑';

    await keytar.setPassword(SERVICE_NAME, TEST_ACCOUNT, unicodePassword);
    const retrieved = await keytar.getPassword(SERVICE_NAME, TEST_ACCOUNT);

    expect(retrieved).toBe(unicodePassword);
  });
});
