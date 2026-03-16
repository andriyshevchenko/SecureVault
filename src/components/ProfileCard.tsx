import { useState } from 'react'
import { Profile, Secret } from '@/lib/types'
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
import { PencilSimple, Trash, Terminal, Copy, Check } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

interface ProfileCardProps {
  profile: Profile
  secrets: Secret[]
  onEdit: (profile: Profile) => void
  onDelete: (id: string) => void
}

export function ProfileCard({ profile, secrets, onEdit, onDelete }: ProfileCardProps) {
  const [isCopied, setIsCopied] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const resolveSecretTitle = (secretId: string): string => {
    const secret = secrets.find((s) => s.id === secretId)
    return secret?.title ?? 'Unknown Secret'
  }

  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText(`--profile ${profile.name}`)
      setIsCopied(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setIsCopied(false), 2000)
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

  const handleDelete = () => {
    onDelete(profile.id)
    setShowDeleteDialog(false)
  }

  return (
    <>
      <Card className="group bg-card/50 border-border/50 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg font-semibold tracking-tight">
              {profile.name}
            </CardTitle>
            <Badge
              variant="outline"
              className="text-xs border bg-purple-500/10 text-purple-400 border-purple-500/20"
            >
              {profile.mappings.length} var{profile.mappings.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="space-y-1">
              {profile.mappings.map((mapping) => (
                <div
                  key={mapping.envVar}
                  className="flex items-center gap-2 bg-muted/30 rounded px-3 py-2 font-mono text-sm overflow-hidden"
                >
                  <Terminal weight="bold" className="shrink-0 text-muted-foreground" />
                  <span className="text-accent">{mapping.envVar}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="truncate">{resolveSecretTitle(mapping.secretId)}</span>
                </div>
              ))}
            </div>

            <motion.div whileTap={{ scale: 0.95 }} className="inline-block">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyCommand}
                className="gap-1.5 text-xs text-muted-foreground hover:bg-accent/10 hover:text-accent"
              >
                {isCopied ? (
                  <Check weight="bold" className="text-accent" />
                ) : (
                  <Copy weight="bold" />
                )}
                <code>--profile {profile.name}</code>
              </Button>
            </motion.div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <span className="text-xs text-muted-foreground">
              {new Date(profile.updatedAt).toLocaleDateString()}
            </span>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onEdit(profile)}
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
            <AlertDialogTitle>Delete Profile</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{profile.name}"? This action cannot be
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
