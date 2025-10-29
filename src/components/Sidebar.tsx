'use client'

import { useState, useEffect } from 'react'
import { useVaultStore } from '@/store/useVaultStore'
import { useNavStore } from '@/store/useNavStore'
import { readDirectory, FileEntry, isNote, isCanvas } from '@/lib/vault'
import { ScrollArea } from './ui/scroll-area'
import { Separator } from './ui/separator'
import { cn } from '@/lib/utils'

interface FolderTreeProps {
  entries: FileEntry[]
  vaultPath: string
  level?: number
}

function FolderTree({ entries, vaultPath, level = 0 }: FolderTreeProps) {
  const { currentFile, setCurrentFile } = useVaultStore()
  const { currentPath, setCurrentPath } = useNavStore()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggleExpand = (path: string) => {
    const newExpanded = new Set(expanded)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpanded(newExpanded)
  }

  const handleClick = (entry: FileEntry) => {
    if (entry.isDirectory) {
      toggleExpand(entry.path)
      setCurrentPath(entry.path)
      setCurrentFile(null) // Clear file selection when opening folder
    } else if (isNote(entry.name) || isCanvas(entry.name)) {
      setCurrentFile(entry.path)
      setCurrentPath(null) // Clear folder path when opening file
    }
  }

  return (
    <div className="space-y-0.5">
      {entries.map((entry) => {
        const isExpanded = expanded.has(entry.path)
        const isSelected = currentFile === entry.path || currentPath === entry.path
        const hasChildren = entry.children && entry.children.length > 0

        return (
          <div key={entry.path}>
            <div
              onClick={() => handleClick(entry)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 text-sm cursor-pointer rounded-lg transition-all duration-150',
                'hover:bg-accent/70',
                isSelected && 'bg-accent font-medium text-foreground',
                !isSelected && 'text-muted-foreground hover:text-foreground',
                level > 0 && 'pl-6'
              )}
              style={{ paddingLeft: `${12 + level * 20}px` }}
            >
              {entry.isDirectory ? (
                <>
                  <span className="text-base select-none flex-shrink-0">
                    {isExpanded ? '📂' : '📁'}
                  </span>
                  <span className="flex-1 truncate font-medium">{entry.name}</span>
                </>
              ) : (
                <>
                  <span className="text-base flex-shrink-0">
                    {isNote(entry.name) ? '📄' : isCanvas(entry.name) ? '🎨' : '📎'}
                  </span>
                  <span className="flex-1 truncate">{entry.name.replace(/\.(md|excalidraw\.json)$/, '')}</span>
                </>
              )}
            </div>
            {entry.isDirectory && isExpanded && hasChildren && (
              <FolderTree
                entries={entry.children!}
                vaultPath={vaultPath}
                level={level + 1}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export function Sidebar() {
  const { vaultPath, refreshTrigger } = useVaultStore()
  const [tree, setTree] = useState<FileEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!vaultPath) return

    const loadTree = async () => {
      setIsLoading(true)
      try {
        const entries = await readDirectory(vaultPath, '')
        setTree(entries)
      } catch (error) {
        console.error('Error loading directory tree:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadTree()
  }, [vaultPath, refreshTrigger])

  if (!vaultPath) {
    return null
  }

  return (
    <div className="w-64 border-r border-border/60 bg-sidebar flex flex-col">
      <div className="h-14 border-b border-border/60 flex items-center px-5 bg-sidebar/50">
        <h2 className="text-sm font-semibold text-foreground">Vault</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="text-sm text-muted-foreground p-6 text-center">Loading...</div>
          ) : tree.length === 0 ? (
            <div className="text-sm text-muted-foreground p-6 text-center">
              Vault is empty. Create a note or canvas to get started.
            </div>
          ) : (
            <FolderTree entries={tree} vaultPath={vaultPath} />
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

