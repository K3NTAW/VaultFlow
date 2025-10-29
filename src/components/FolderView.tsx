'use client'

import { useState, useEffect } from 'react'
import { useVaultStore } from '@/store/useVaultStore'
import { useNavStore } from '@/store/useNavStore'
import { readDirectory, FileEntry, isNote, isCanvas, deleteFile, exportFile, renameFile } from '@/lib/vault'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

export function FolderView() {
  const { vaultPath, setCurrentFile, refresh } = useVaultStore()
  const { currentPath, setCurrentPath } = useNavStore()
  const [items, setItems] = useState<FileEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState<string | null>(null)

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

  const handleClick = (item: FileEntry, e?: React.MouseEvent) => {
    // Don't navigate if clicking on the menu button
    if (e && (e.target as HTMLElement).closest('[data-menu-trigger]')) {
      e.stopPropagation()
      return
    }
    
    // Set selection for highlighting
    setSelectedItem(item.path)
    
    if (item.isDirectory) {
      // Navigate into folder
      setCurrentPath(item.path)
      setCurrentFile(null) // Clear any file selection
      setSelectedItem(null) // Clear selection when navigating
    } else if (isNote(item.name) || isCanvas(item.name)) {
      // Open file
      setCurrentFile(item.path)
      setCurrentPath(null) // Clear folder path when opening file
    }
  }

  const handleRename = async (item: FileEntry) => {
    const newName = window.prompt('Enter new name:', item.name.replace(/\.(md|excalidraw\.json)$/, ''))
    if (!newName || newName.trim() === '' || newName === item.name) {
      return
    }

    const sanitized = newName.trim().replace(/[<>:"/\\|?*]/g, '-')
    const extension = item.name.includes('.') ? item.name.split('.').pop() : ''
    const newFileName = extension ? `${sanitized}.${extension}` : sanitized
    
    try {
      const parentPath = currentPath || ''
      const oldPath = parentPath ? `${parentPath}/${item.name}` : item.name
      const newPath = parentPath ? `${parentPath}/${newFileName}` : newFileName
      
      await renameFile(vaultPath!, oldPath, newPath)
      
      // Update current file if it was the renamed file
      if (useVaultStore.getState().currentFile === oldPath) {
        setCurrentFile(newPath)
      }
      
      refresh()
      setSelectedItem(null)
    } catch (error) {
      console.error('Error renaming:', error)
      alert(`Failed to rename: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const handleDelete = async (item: FileEntry) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return
    }

    try {
      const filePath = currentPath ? `${currentPath}/${item.name}` : item.name
      await deleteFile(vaultPath!, filePath)
      
      // Clear selection if deleted item was selected
      if (useVaultStore.getState().currentFile === filePath) {
        setCurrentFile(null)
      }
      
      refresh()
      setSelectedItem(null)
    } catch (error) {
      console.error('Error deleting:', error)
      alert(`Failed to delete: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const handleExport = async (item: FileEntry) => {
    try {
      const filePath = currentPath ? `${currentPath}/${item.name}` : item.name
      await exportFile(vaultPath!, filePath)
    } catch (error) {
      console.error('Error exporting:', error)
      alert(`Failed to export: ${error instanceof Error ? error.message : String(error)}`)
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

            const isSelected = selectedItem === item.path

            return (
              <div
                key={item.path}
                className={cn(
                  'group relative flex flex-col rounded-xl border-2 transition-all duration-200',
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-border/60 bg-card/40 hover:bg-card hover:border-border hover:shadow-md'
                )}
              >
                <button
                  onClick={(e) => handleClick(item, e)}
                  className={cn(
                    'flex-1 flex flex-col p-5 text-left cursor-pointer',
                    'transition-all duration-200 ease-out'
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
                </button>

                {/* Three-dot menu */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      data-menu-trigger
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <circle cx="8" cy="4" r="1" fill="currentColor" />
                          <circle cx="8" cy="8" r="1" fill="currentColor" />
                          <circle cx="8" cy="12" r="1" fill="currentColor" />
                        </svg>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRename(item)
                        }}
                      >
                        <span className="mr-2">✏️</span>
                        Rename
                      </DropdownMenuItem>
                      {!isFolder && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleExport(item)
                          }}
                        >
                          <span className="mr-2">📤</span>
                          Export
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(item)
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <span className="mr-2">🗑️</span>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

