import { useState, useEffect } from 'react'
import { Secret, SecretCategory, SecretFormData } from '@/lib/types'
import { ApiClient } from '@/lib/api'
import { Plus } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from 'framer-motion'
import { SecretCard } from '@/components/SecretCard'
import { SecretDialog } from '@/components/SecretDialog'
import { EmptyState } from '@/components/EmptyState'
import { CategoryFilter } from '@/components/CategoryFilter'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'

function App() {
  const [secrets, setSecrets] = useState<Secret[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<SecretCategory | 'all'>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSecret, setEditingSecret] = useState<Secret | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load secrets from backend on mount
  useEffect(() => {
    const loadSecrets = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await ApiClient.getSecrets()
        setSecrets(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load secrets')
        toast.error('Failed to connect to backend. Please make sure the server is running.')
      } finally {
        setIsLoading(false)
      }
    }

    loadSecrets()
  }, [])

  const handleAddSecret = async (data: SecretFormData) => {
    try {
      const newSecret = await ApiClient.createSecret({
        id: crypto.randomUUID(),
        ...data,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      setSecrets((current) => [...current, newSecret])
      toast.success('Secret added successfully')
      setIsDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add secret')
    }
  }

  const handleEditSecret = async (data: SecretFormData) => {
    if (!editingSecret) return
    
    try {
      const updated = await ApiClient.updateSecret(editingSecret.id, {
        ...data,
        updatedAt: Date.now(),
      })
      setSecrets((current) =>
        current.map((secret) =>
          secret.id === editingSecret.id ? updated : secret
        )
      )
      toast.success('Secret updated successfully')
      setEditingSecret(null)
      setIsDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update secret')
    }
  }

  const handleDeleteSecret = async (id: string) => {
    try {
      await ApiClient.deleteSecret(id)
      setSecrets((current) => current.filter((secret) => secret.id !== id))
      toast.success('Secret deleted successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete secret')
    }
  }

  const handleOpenEdit = (secret: Secret) => {
    setEditingSecret(secret)
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingSecret(null)
  }

  const filteredSecrets = secrets.filter((secret) => {
    const matchesSearch = 
      secret.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      secret.notes?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || secret.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center" role="status" aria-live="polite" aria-busy="true">
          <div 
            className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"
            aria-hidden="true"
          ></div>
          <p className="mt-4 text-muted-foreground">Loading secrets...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center max-w-md">
          <div 
            className="text-red-500 text-4xl mb-4"
            role="img"
            aria-label="Warning: Connection error"
          >
            ⚠️
          </div>
          <h2 className="text-xl font-bold mb-2">Connection Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <p className="text-sm text-muted-foreground">
            Please start the backend server from the project root: <code className="bg-card px-2 py-1 rounded">npm run server</code> or, if installed globally, run <code className="bg-card px-2 py-1 rounded">securevault</code>.
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
      
      <div className="relative">
        <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">SecureVault</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage your secrets securely
                </p>
              </div>
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20"
              >
                <Plus className="mr-2" weight="bold" />
                Add Secret
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search secrets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-card/50 border-border/50 focus:border-accent/50 transition-colors"
              />
            </div>
            <CategoryFilter
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </div>

          {filteredSecrets.length === 0 ? (
            <EmptyState 
              hasSecrets={secrets.length > 0}
              onAddSecret={() => setIsDialogOpen(true)}
            />
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              layout
            >
              <AnimatePresence mode="popLayout">
                {filteredSecrets.map((secret, index) => (
                  <motion.div
                    key={secret.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    layout
                  >
                    <SecretCard
                      secret={secret}
                      onEdit={handleOpenEdit}
                      onDelete={handleDeleteSecret}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </main>
      </div>

      <SecretDialog
        open={isDialogOpen}
        onOpenChange={handleCloseDialog}
        onSubmit={editingSecret ? handleEditSecret : handleAddSecret}
        initialData={editingSecret || undefined}
        mode={editingSecret ? 'edit' : 'add'}
      />

      <Toaster position="top-right" />
    </div>
  )
}

export default App
