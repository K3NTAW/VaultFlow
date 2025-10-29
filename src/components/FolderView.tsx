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
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground">Loading folder...</p>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-8">
          <div className="text-6xl mb-4">📁</div>
          <h3 className="text-lg font-semibold text-foreground mb-2">This folder is empty</h3>
          <p className="text-sm text-muted-foreground">Create a note or canvas to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-background">
      <div className="max-w-7xl mx-auto px-12 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold mb-2 text-foreground">
              {currentPath ? currentPath.split('/').pop() : 'Vault'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </p>
          </div>
          {currentPath && (
            <button
              onClick={() => {
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
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-4 py-2 rounded-md hover:bg-accent transition-all font-medium"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mr-1">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {items.map((item) => {
            const isFolder = item.isDirectory
            const isNoteFile = isNote(item.name)
            const isCanvasFile = isCanvas(item.name)
            
            // Get file name without extension for display
            const displayName = item.name.replace(/\.(md|excalidraw\.json)$/, '')
            const itemCount = isFolder && item.children ? item.children.length : null

            return (
              <button
                key={item.path}
                onClick={() => handleClick(item)}
                className={cn(
                  'group relative flex flex-col p-5 rounded-xl border border-border/60',
                  'bg-card/40 hover:bg-card hover:border-border hover:shadow-md',
                  'transition-all duration-200 ease-out',
                  'text-left cursor-pointer'
                )}
              >
                {/* Icon */}
                <div className="mb-4">
                  <div className={cn(
                    'w-12 h-12 rounded-lg flex items-center justify-center',
                    'transition-colors duration-200',
                    isFolder 
                      ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                      : isNoteFile
                        ? 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400'
                        : isCanvasFile
                          ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400'
                          : 'bg-gray-50 dark:bg-gray-950/30 text-gray-600 dark:text-gray-400'
                  )}>
                    <span className="text-2xl">
                      {isFolder ? '📁' : isNoteFile ? '📄' : isCanvasFile ? '🎨' : '📎'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className={cn(
                    'font-semibold text-[15px] mb-1 truncate',
                    'text-foreground group-hover:text-primary',
                    'transition-colors duration-200'
                  )}>
                    {displayName}
                  </h3>
                  {itemCount !== null && (
                    <p className="text-xs text-muted-foreground font-medium">
                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </p>
                  )}
                  {!isFolder && (
                    <p className="text-xs text-muted-foreground/70 mt-1 font-mono">
                      {isNoteFile ? '.md' : isCanvasFile ? '.excalidraw' : ''}
                    </p>
                  )}
                </div>

                {/* Hover indicator */}
                <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-primary/20 transition-colors pointer-events-none" />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

