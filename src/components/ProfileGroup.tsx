import { useState } from 'react'
import { Secret, Profile } from '@/lib/types'
import { SecretCard } from './SecretCard'
import { CaretDown, CaretRight, Stack } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ProfileGroupProps {
  profile: Profile
  secrets: Secret[]
  onEditSecret: (secret: Secret) => void
  onDeleteSecret: (id: string) => void
  defaultExpanded?: boolean
}

export function ProfileGroup({
  profile,
  secrets,
  onEditSecret,
  onDeleteSecret,
  defaultExpanded = false,
}: ProfileGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
          'bg-card/30 border border-border/50 hover:bg-card/50 hover:border-accent/20',
          isExpanded && 'bg-card/50 border-accent/20'
        )}
      >
        <Stack weight="duotone" className="text-accent shrink-0" size={20} />
        <span className="font-semibold text-sm tracking-tight">{profile.name}</span>
        <span className="text-xs text-muted-foreground">
          {secrets.length} secret{secrets.length !== 1 ? 's' : ''}
        </span>
        <div className="flex-1" />
        {isExpanded ? (
          <CaretDown weight="bold" className="text-muted-foreground" size={14} />
        ) : (
          <CaretRight weight="bold" className="text-muted-foreground" size={14} />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-3 pl-2">
              {secrets.map((secret, index) => (
                <motion.div
                  key={secret.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.15, delay: index * 0.03 }}
                >
                  <SecretCard
                    secret={secret}
                    onEdit={onEditSecret}
                    onDelete={onDeleteSecret}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
