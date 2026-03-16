export type SecretCategory = 'password' | 'api-key' | 'token' | 'certificate' | 'note' | 'other'

export interface Secret {
  id: string
  title: string
  value: string
  category: SecretCategory
  notes?: string
  createdAt: number
  updatedAt: number
}

export interface SecretFormData {
  title: string
  value: string
  category: SecretCategory
  notes?: string
}

export interface ProfileMapping {
  envVar: string
  secretId: string
}

export interface Profile {
  id: string
  name: string
  mappings: ProfileMapping[]
  createdAt: number
  updatedAt: number
}

export interface ProfileFormData {
  name: string
  mappings: ProfileMapping[]
}
