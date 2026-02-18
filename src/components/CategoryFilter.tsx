import { SecretCategory } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Folders } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface CategoryFilterProps {
  selected: SecretCategory | 'all'
  onSelect: (category: SecretCategory | 'all') => void
}

const categories: { value: SecretCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'password', label: 'Passwords' },
  { value: 'api-key', label: 'API Keys' },
  { value: 'token', label: 'Tokens' },
  { value: 'certificate', label: 'Certificates' },
  { value: 'note', label: 'Notes' },
  { value: 'other', label: 'Other' },
]

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Folders className="text-muted-foreground hidden md:block" weight="duotone" />
      {categories.map((category) => (
        <Button
          key={category.value}
          variant="outline"
          size="sm"
          onClick={() => onSelect(category.value)}
          className={cn(
            'transition-all',
            selected === category.value
              ? 'bg-accent text-accent-foreground border-accent hover:bg-accent/90'
              : 'hover:bg-accent/10 hover:border-accent/30'
          )}
        >
          {category.label}
        </Button>
      ))}
    </div>
  )
}
