import { useEffect, useState } from 'react'
import { Profile, ProfileFormData, ProfileMapping, Secret } from '@/lib/types'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash } from '@phosphor-icons/react'

interface ProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ProfileFormData) => void
  initialData?: Profile
  mode: 'add' | 'edit'
  secrets: Secret[]
}

const emptyMapping: ProfileMapping = { envVar: '', secretId: '' }

export function ProfileDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  mode,
  secrets,
}: ProfileDialogProps) {
  const [name, setName] = useState('')
  const [mappings, setMappings] = useState<ProfileMapping[]>([{ ...emptyMapping }])

  useEffect(() => {
    if (initialData) {
      setName(initialData.name)
      setMappings(
        initialData.mappings.length > 0
          ? initialData.mappings.map((m) => ({ ...m }))
          : [{ ...emptyMapping }]
      )
    } else {
      setName('')
      setMappings([{ ...emptyMapping }])
    }
  }, [initialData, open])

  const updateMapping = (index: number, field: keyof ProfileMapping, value: string) => {
    setMappings((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    )
  }

  const addMapping = () => {
    setMappings((prev) => [...prev, { ...emptyMapping }])
  }

  const removeMapping = (index: number) => {
    setMappings((prev) => prev.filter((_, i) => i !== index))
  }

  const isValid =
    name.trim() !== '' &&
    mappings.length > 0 &&
    mappings.every((m) => m.envVar.trim() !== '' && m.secretId !== '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    onSubmit({ name: name.trim(), mappings })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {mode === 'add' ? 'Create Profile' : 'Edit Profile'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'add'
              ? 'Create a new profile to map environment variables to secrets.'
              : 'Update your profile configuration.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Profile Name</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Production, Staging"
                required
                className="bg-muted/30 border-border/50"
              />
            </div>

            <div className="space-y-3">
              <Label>Environment Variable Mappings</Label>
              <div className="space-y-2">
                {mappings.map((mapping, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2"
                  >
                    <Input
                      value={mapping.envVar}
                      onChange={(e) => updateMapping(index, 'envVar', e.target.value)}
                      placeholder="ENV_VAR_NAME"
                      className="bg-muted/30 border-border/50 font-mono flex-1"
                    />
                    <Select
                      value={mapping.secretId}
                      onValueChange={(value) => updateMapping(index, 'secretId', value)}
                    >
                      <SelectTrigger className="bg-muted/30 border-border/50 flex-1">
                        <SelectValue placeholder="Select a secret" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {secrets.map((secret) => (
                          <SelectItem key={secret.id} value={secret.id}>
                            {secret.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMapping(index)}
                      disabled={mappings.length === 1}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash size={18} />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMapping}
                className="mt-1"
              >
                <Plus size={16} className="mr-1" />
                Add Variable
              </Button>
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
              disabled={!isValid}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {mode === 'add' ? 'Create Profile' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
