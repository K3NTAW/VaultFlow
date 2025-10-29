'use client'

import { useNavStore } from '@/store/useNavStore'
import { useVaultStore } from '@/store/useVaultStore'
import { cn } from '@/lib/utils'

export function Breadcrumbs() {
  const { currentPath, setCurrentPath } = useNavStore()
  const { currentFile } = useVaultStore()

  const displayPath = currentFile || currentPath
  const segments = displayPath.split('/').filter(Boolean)

  const handleClick = (index: number) => {
    if (index === -1) {
      setCurrentPath('/')
      useVaultStore.getState().setCurrentFile(null)
    } else {
      const newPath = '/' + segments.slice(0, index + 1).join('/')
      setCurrentPath(newPath)
      useVaultStore.getState().setCurrentFile(null)
    }
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
      <button
        onClick={() => handleClick(-1)}
        className={cn(
          'text-sm font-medium text-muted-foreground hover:text-foreground transition-colors',
          'px-2 py-1 rounded hover:bg-accent'
        )}
      >
        Vault
      </button>
      {segments.map((segment, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="text-muted-foreground">/</span>
          <button
            onClick={() => handleClick(index)}
            className={cn(
              'text-sm font-medium text-muted-foreground hover:text-foreground transition-colors',
              'px-2 py-1 rounded hover:bg-accent',
              index === segments.length - 1 && currentFile && 'text-foreground font-semibold'
            )}
          >
            {segment}
          </button>
        </div>
      ))}
    </div>
  )
}

