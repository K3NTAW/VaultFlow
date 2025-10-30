'use client'

import { useState, useEffect } from 'react'
import { useVaultStore } from '@/store/useVaultStore'
import { useNavStore } from '@/store/useNavStore'
import { readDirectory, FileEntry, isNote, isCanvas, deleteFile, exportFile, renameFile } from '@/lib/vault'
import { ScrollArea } from './ui/scroll-area'
import { Separator } from './ui/separator'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

interface FolderTreeProps {
  entries: FileEntry[]
  vaultPath: string
  level?: number
}

function FolderTree({ entries, vaultPath, level = 0 }: FolderTreeProps) {
  const { currentFile, setCurrentFile, refresh } = useVaultStore()
  const { currentPath, setCurrentPath } = useNavStore()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [hovered, setHovered] = useState<string | null>(null)

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

  const handleRename = async (entry: FileEntry) => {
    const base = entry.name.replace(/\.(md|excalidraw\.json)$/, '')
    const newName = window.prompt('Enter new name:', base)
    if (!newName || newName.trim() === '' || newName === base) return
    const sanitized = newName.trim().replace(/[<>:"/\\|?*]/g, '-')
    const ext = entry.isDirectory ? '' : entry.name.includes('.') ? `.${entry.name.split('.').pop()}` : ''
    const parent = entry.path.split('/').slice(0, -1).join('/')
    const oldPath = entry.path
    const newPath = parent ? `${parent}/${sanitized}${ext}` : `${sanitized}${ext}`
    try {
      await renameFile(vaultPath, oldPath, newPath)
      if (currentFile === oldPath) setCurrentFile(newPath)
      if (currentPath === oldPath) setCurrentPath(newPath)
      refresh()
    } catch (e) {
      console.error('Rename failed', e)
      alert('Failed to rename')
    }
  }

  const handleDelete = async (entry: FileEntry) => {
    if (!confirm(`Delete "${entry.name}"?`)) return
    try {
      await deleteFile(vaultPath, entry.path)
      if (currentFile === entry.path) setCurrentFile(null)
      if (currentPath === entry.path) setCurrentPath('')
      refresh()
    } catch (e) {
      console.error('Delete failed', e)
      alert('Failed to delete')
    }
  }

  const handleExport = async (entry: FileEntry) => {
    if (entry.isDirectory) return
    try {
      await exportFile(vaultPath, entry.path)
    } catch (e) {
      console.error('Export failed', e)
      alert('Failed to export')
    }
  }

  return (
    <div className="space-y-0.5">
      {entries.map((entry) => {
        const isExpanded = expanded.has(entry.path)
        const isSelected = currentFile === entry.path || currentPath === entry.path
        const hasChildren = entry.children && entry.children.length > 0

        return (
          <div key={entry.path}
            onMouseEnter={() => setHovered(entry.path)}
            onMouseLeave={() => setHovered((h) => (h === entry.path ? null : h))}
          >
            <div
              onClick={() => handleClick(entry)}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2 text-sm cursor-pointer rounded-lg transition-all duration-150',
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

              {/* Three-dot menu */}
              <div
                className={cn(
                  'absolute right-2 top-1/2 -translate-y-1/2',
                  (hovered === entry.path || isSelected) ? 'opacity-100' : 'opacity-0',
                  'transition-opacity'
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      data-menu-trigger
                      className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="4" r="1" fill="currentColor" />
                        <circle cx="8" cy="8" r="1" fill="currentColor" />
                        <circle cx="8" cy="12" r="1" fill="currentColor" />
                      </svg>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => handleRename(entry)}>
                      <span className="mr-2">✏️</span> Rename
                    </DropdownMenuItem>
                    {!entry.isDirectory && (
                      <DropdownMenuItem onClick={() => handleExport(entry)}>
                        <span className="mr-2">📤</span> Export
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDelete(entry)}
                    >
                      <span className="mr-2">🗑️</span> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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

