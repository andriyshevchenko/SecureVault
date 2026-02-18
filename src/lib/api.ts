import { Secret, SecretFormData } from './types'

const API_BASE_URL = 'http://localhost:3001/api'

export class ApiClient {
  private static async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    // Normalize headers to a Headers instance to correctly handle all supported shapes
    const headers = new Headers(options?.headers)

    // Only set Content-Type when a body is present to avoid unnecessary CORS preflights
    const hasContentType = headers.has('content-type')

    if (options?.body && !hasContentType) {
      headers.set('Content-Type', 'application/json')
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    if (response.status === 204) {
      return null as T
    }

    return response.json()
  }

  static async getSecrets(): Promise<Secret[]> {
    return this.request<Secret[]>('/secrets')
  }

  static async createSecret(data: SecretFormData & { id: string; createdAt: number; updatedAt: number }): Promise<Secret> {
    return this.request<Secret>('/secrets', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  static async updateSecret(id: string, data: SecretFormData & { updatedAt: number }): Promise<Secret> {
    return this.request<Secret>(`/secrets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  static async deleteSecret(id: string): Promise<void> {
    return this.request<void>(`/secrets/${id}`, {
      method: 'DELETE',
    })
  }

  static async checkHealth(): Promise<{ status: string; service: string }> {
    return this.request<{ status: string; service: string }>('/health')
  }
}
