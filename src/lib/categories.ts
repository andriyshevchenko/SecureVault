import { SecretCategory } from './types'

export const CATEGORIES: { value: SecretCategory; label: string }[] = [
  { value: 'password', label: 'Password' },
  { value: 'api-key', label: 'API Key' },
  { value: 'token', label: 'Token' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'note', label: 'Note' },
  { value: 'other', label: 'Other' },
]

export const VALID_CATEGORY_VALUES = CATEGORIES.map(c => c.value)
