'use client'

import { useState, useEffect } from 'react'
import { useVaultStore } from '@/store/useVaultStore'
import { useNavStore } from '@/store/useNavStore'
import { readDirectory, FileEntry, isNote, isCanvas } from '@/lib/vault'
import { cn } from '@/lib/utils'

export function FolderView() {
  const { vaultPath, setCurrentFile } = useVaultStore()
  const { currentPath, setCurrentPath } = useNavStore()
  const [items, setItems] = useState<FileEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!vaultPath) return

    const loadFolder = async () => {
      setIsLoading(true)
      try {
        const entries = await readDirectory(vaultPath, currentPath || '')
        setItems(entries)
      } catch (error) {
        console.error('Error loading folder:', error)
        setItems([])
      } finally {
        setIsLoading(false)
      }
    }

    loadFolder()
  }, [vaultPath, currentPath])

  const handleClick = (item: FileEntry) => {
    if (item.isDirectory) {
      // Navigate into folder
      setCurrentPath(item.path)
      setCurrentFile(null) // Clear any file selection
    } else if (isNote(item.name) || isCanvas(item.name)) {
      // Open file
      setCurrentFile(item.path)
      setCurrentPath(null) // Clear folder path when opening file
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">This folder is empty</p>
          <p className="text-sm text-muted-foreground/60">Create a note or canvas to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold mb-1">
              {currentPath ? currentPath.split('/').pop() : 'Vault'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </p>
          </div>
          {currentPath && (
            <button
              onClick={() => {
                // Navigate back to parent or root
                const pathParts = currentPath.split('/').filter(Boolean)
                if (pathParts.length > 0) {
                  pathParts.pop()
                  setCurrentPath(pathParts.join('/'))
                  setCurrentFile(null)
                } else {
                  setCurrentPath('')
                  setCurrentFile(null)
                }
              }}
              className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded hover:bg-accent transition-colors"
            >
              ← Back
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {items.map((item) => {
            const isFolder = item.isDirectory
            const isNoteFile = isNote(item.name)
            const isCanvasFile = isCanvas(item.name)

            return (
              <button
                key={item.path}
                onClick={() => handleClick(item)}
                className={cn(
                  'group relative flex flex-col items-start p-4 rounded-lg border border-border',
                  'hover:border-primary/50 hover:bg-accent/50 transition-all',
                  'text-left'
                )}
              >
                <div className="flex items-center gap-3 w-full mb-2">
                  <span className="text-2xl flex-shrink-0">
                    {isFolder
                      ? '📁'
                      : isNoteFile
                        ? '📄'
                        : isCanvasFile
                          ? '🎨'
                          : '📎'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                      {item.name}
                    </h3>
                    {isFolder && item.children && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.children.length} {item.children.length === 1 ? 'item' : 'items'}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

