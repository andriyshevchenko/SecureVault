import { useState } from 'react'
import { Secret } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Eye, EyeSlash, Copy, PencilSimple, Trash, Check } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SecretCardProps {
  secret: Secret
  onEdit: (secret: Secret) => void
  onDelete: (id: string) => void
}

const categoryColors: Record<string, string> = {
  password: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'api-key': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  token: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  certificate: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  note: 'bg-green-500/10 text-green-400 border-green-500/20',
  other: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

const categoryLabels: Record<string, string> = {
  password: 'Password',
  'api-key': 'API Key',
  token: 'Token',
  certificate: 'Certificate',
  note: 'Note',
  other: 'Other',
}

export function SecretCard({ secret, onEdit, onDelete }: SecretCardProps) {
  const [isRevealed, setIsRevealed] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(secret.value)
      setIsCopied(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const handleDelete = () => {
    onDelete(secret.id)
    setShowDeleteDialog(false)
  }

  return (
    <>
      <Card className="group bg-card/50 border-border/50 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg font-semibold tracking-tight">
              {secret.title}
            </CardTitle>
            <Badge
              variant="outline"
              className={cn('text-xs border', categoryColors[secret.category])}
            >
              {categoryLabels[secret.category]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted/30 rounded px-3 py-2 font-mono text-sm overflow-hidden">
                {isRevealed ? (
                  <span className="break-all">{secret.value}</span>
                ) : (
                  <span className="text-muted-foreground">••••••••••••</span>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsRevealed(!isRevealed)}
                className="shrink-0 hover:bg-accent/10 hover:text-accent"
              >
                {isRevealed ? <EyeSlash weight="bold" /> : <Eye weight="bold" />}
              </Button>
              <motion.div whileTap={{ scale: 0.95 }}>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCopy}
                  className="shrink-0 hover:bg-accent/10 hover:text-accent"
                >
                  {isCopied ? (
                    <Check weight="bold" className="text-accent" />
                  ) : (
                    <Copy weight="bold" />
                  )}
                </Button>
              </motion.div>
            </div>
            
            {secret.notes && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {secret.notes}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <span className="text-xs text-muted-foreground">
              {new Date(secret.updatedAt).toLocaleDateString()}
            </span>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onEdit(secret)}
                className="h-8 w-8 hover:bg-accent/10 hover:text-accent"
              >
                <PencilSimple weight="bold" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowDeleteDialog(true)}
                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash weight="bold" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Secret</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{secret.title}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
