import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiClient } from '../lib/api'

// Mock fetch
global.fetch = vi.fn()

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getSecrets', () => {
    it('should fetch secrets from API', async () => {
      const mockSecrets = [
        {
          id: '1',
          title: 'Test Secret',
          value: 'test-value',
          category: 'password' as const,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSecrets,
      })

      const result = await ApiClient.getSecrets()

      // GET requests should not set Content-Type header to avoid CORS preflights
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/secrets',
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'Content-Type': expect.anything(),
          }),
        })
      )
      expect(result).toEqual(mockSecrets)
    })

    it('should throw error on API failure', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      })

      await expect(ApiClient.getSecrets()).rejects.toThrow()
    })
  })

  describe('createSecret', () => {
    it('should create a new secret', async () => {
      const newSecret = {
        id: '2',
        title: 'New Secret',
        value: 'new-value',
        category: 'api-key' as const,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => newSecret,
      })

      const result = await ApiClient.createSecret(newSecret)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/secrets',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newSecret),
        })
      )
      expect(result).toEqual(newSecret)
    })
  })

  describe('updateSecret', () => {
    it('should update an existing secret', async () => {
      const updatedSecret = {
        title: 'Updated Secret',
        value: 'updated-value',
        category: 'password' as const,
        updatedAt: Date.now(),
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '1', ...updatedSecret }),
      })

      const result = await ApiClient.updateSecret('1', updatedSecret)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/secrets/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updatedSecret),
        })
      )
    })
  })

  describe('deleteSecret', () => {
    it('should delete a secret', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

      await ApiClient.deleteSecret('1')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/secrets/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })
  })

  describe('checkHealth', () => {
    it('should check API health', async () => {
      const healthResponse = { status: 'ok', service: 'SecureVault Backend' }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => healthResponse,
      })

      const result = await ApiClient.checkHealth()

      expect(result).toEqual(healthResponse)
    })
  })
})
