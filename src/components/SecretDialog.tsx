import { useEffect, useState } from 'react'
import { Secret, SecretCategory, SecretFormData } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface SecretDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: SecretFormData) => void
  initialData?: Secret
  mode: 'add' | 'edit'
}

const categories: { value: SecretCategory; label: string }[] = [
  { value: 'password', label: 'Password' },
  { value: 'api-key', label: 'API Key' },
  { value: 'token', label: 'Token' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'note', label: 'Note' },
  { value: 'other', label: 'Other' },
]

export function SecretDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  mode,
}: SecretDialogProps) {
  const [formData, setFormData] = useState<SecretFormData>({
    title: '',
    value: '',
    category: 'password',
    notes: '',
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        value: initialData.value,
        category: initialData.category,
        notes: initialData.notes || '',
      })
    } else {
      setFormData({
        title: '',
        value: '',
        category: 'password',
        notes: '',
      })
    }
  }, [initialData, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.value.trim()) return
    onSubmit(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {mode === 'add' ? 'Add New Secret' : 'Edit Secret'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'add'
              ? 'Store a new secret securely in your vault.'
              : 'Update your secret information.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="My Secret"
                required
                className="bg-muted/30 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value: SecretCategory) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger className="bg-muted/30 border-border/50">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Secret Value</Label>
              <Input
                id="value"
                type="password"
                value={formData.value}
                onChange={(e) =>
                  setFormData({ ...formData, value: e.target.value })
                }
                placeholder="Enter your secret"
                required
                className="bg-muted/30 border-border/50 font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Additional notes..."
                className="bg-muted/30 border-border/50 resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {mode === 'add' ? 'Add Secret' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
