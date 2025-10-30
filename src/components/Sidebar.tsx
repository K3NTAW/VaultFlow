'use client'

import { useState, useEffect, useMemo } from 'react'
import { useVaultStore } from '@/store/useVaultStore'
import { useNavStore } from '@/store/useNavStore'
import { readDirectory, FileEntry, isNote, isCanvas, deleteFile, exportFile, renameFile, writeFileToVault, createDirectoryInVault, deleteEntryRecursive } from '@/lib/vault'
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
import { motion, AnimatePresence } from 'framer-motion'
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverEvent, useDroppable, useDraggable } from '@dnd-kit/core'

interface FolderTreeProps {
  entries: FileEntry[]
  vaultPath: string
  level?: number
}

function Chevron({ open }: { open: boolean }) {
  return (
    <motion.svg
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="none"
      className="text-[#6b6b6b] dark:text-[#a0a0a0] flex-shrink-0"
      animate={{ rotate: open ? 90 : 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      <path d="M7 5l6 5-6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </motion.svg>
  )
}

function FolderTree({ entries, vaultPath, level = 0 }: FolderTreeProps) {
  const { currentFile, setCurrentFile, refresh } = useVaultStore()
  const { currentPath, setCurrentPath } = useNavStore()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [hovered, setHovered] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

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
      setCurrentPath("") // was setCurrentPath(null)
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
    const { confirm } = await import('@tauri-apps/plugin-dialog')
    const approved = await confirm(`Delete "${entry.name}"?`, { title: 'Confirm Deletion', kind: 'warning', okLabel: 'Delete', cancelLabel: 'Cancel' })
    if (!approved) return
    try {
      if (entry.isDirectory) {
        await deleteEntryRecursive(vaultPath, entry.path)
      } else {
        await deleteFile(vaultPath, entry.path)
      }
      // If we're deleting the current file or path, clear both
      if (currentFile === entry.path) setCurrentFile(null)
      if (currentPath === entry.path) setCurrentPath("")
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

  const getBaseName = (p: string) => p.split('/').pop() || p
  const getParent = (p: string) => p.split('/').slice(0, -1).join('/')
  const isDescendant = (parent: string, child: string) => {
    if (!parent) return false
    const pref = parent.endsWith('/') ? parent : parent + '/'
    return child.startsWith(pref)
  }

  // dnd-kit helpers for each row
  const Row = ({ entry, children }: { entry: FileEntry; children: React.ReactNode }) => {
    const drag = useDraggable({ id: entry.path, data: { path: entry.path, isDirectory: entry.isDirectory } })
    const drop = useDroppable({ id: `drop:${entry.path}`, data: { path: entry.path, isDirectory: entry.isDirectory } })
    const setBothRefs = (node: HTMLElement | null) => { drag.setNodeRef(node); drop.setNodeRef(node) }
    return (
      <div ref={setBothRefs} {...drag.listeners} {...drag.attributes} data-over={drop.isOver}>
        {children}
      </div>
    )
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
            <Row entry={entry}>
            <div
              onClick={() => handleClick(entry)}
              className={cn(
                'relative flex items-center gap-1.5 pr-2 py-1.5 text-[13px] cursor-pointer rounded-md transition-colors',
                'hover:bg-[#ebeced] dark:hover:bg-[#202020]',
                isSelected ? 'bg-[#ebeced] dark:bg-[#202020] text-[#2f3437] dark:text-[#d1d1d1] font-medium' : 'text-[#6b6b6b] dark:text-[#a0a0a0]',
                dragOver === entry.path && 'ring-1 ring-[#9b9b9b] dark:ring-[#3a3a3a]'
              )}
              style={{ paddingLeft: `${8 + level * 14}px` }}
            >
              {entry.isDirectory ? (
                <>
                  <Chevron open={isExpanded} />
                  <span className="flex-1 truncate">{entry.name}</span>
                </>
              ) : (
                <>
                  <span className="w-[14px]" />
                  <span className="flex-1 truncate text-[13px] font-normal">
                    {entry.name.replace(/\.(md|excalidraw\.json)$/, '')}
                  </span>
                </>
              )}

              <div
                className={cn(
                  'absolute right-1 top-1/2 -translate-y-1/2',
                  (hovered === entry.path || isSelected) ? 'opacity-100' : 'opacity-0',
                  'transition-opacity'
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      data-menu-trigger
                      className="px-1.5 py-1 rounded-md hover:bg-[#ebeced] dark:hover:bg-[#202020] text-[#6b6b6b] dark:text-[#a0a0a0]"
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
                      Rename
                    </DropdownMenuItem>
                    {!entry.isDirectory && (
                      <DropdownMenuItem onClick={() => handleExport(entry)}>
                        Export
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDelete(entry)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            </Row>
            <AnimatePresence initial={false}>
              {entry.isDirectory && isExpanded && hasChildren && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  <FolderTree
                    entries={entry.children!}
                    vaultPath={vaultPath}
                    level={level + 1}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

export function Sidebar() {
  const { vaultPath, refreshTrigger, setCurrentFile, refresh } = useVaultStore()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const moveToTarget = async (src: { path: string; isDirectory: boolean }, targetPath: string) => {
    if (src.path === targetPath) return
    // Prevent moving into own descendant
    if (targetPath && src.path !== '' && targetPath.startsWith(src.path + '/')) return
    const base = src.path.split('/').pop() as string
    const targetEntries = await readDirectory(vaultPath!, targetPath)
    const existing = new Set(targetEntries.map((t) => t.name))
    let name = base
    if (existing.has(name)) {
      const ext = src.isDirectory ? '' : (name.includes('.') ? '.' + name.split('.').pop() : '')
      const stem = src.isDirectory ? name : name.replace(new RegExp(`${ext.replace('.', '\\.')}$`), '')
      let idx = 1
      let candidate = `${stem} ${idx}${ext}`
      while (existing.has(candidate)) { idx++; candidate = `${stem} ${idx}${ext}` }
      name = candidate
    }
    const newRel = targetPath ? `${targetPath}/${name}` : name
    if (newRel === src.path) return
    await renameFile(vaultPath!, src.path, newRel)
    if (useVaultStore.getState().currentFile === src.path) useVaultStore.getState().setCurrentFile(newRel)
    if (useNavStore.getState().currentPath === src.path) useNavStore.getState().setCurrentPath(newRel)
    refresh()
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const src = active.data.current as { path: string; isDirectory: boolean } | undefined
    const overData = over.data.current as { path: string; isDirectory: boolean } | undefined
    if (!src) return
    // Dropping onto a folder row uses droppable id `drop:<path>`
    const overId = String(over.id)
    if (overId.startsWith('drop:') && overData && overData.isDirectory) {
      const targetPath = overData.path
      await moveToTarget(src, targetPath)
      return
    }
    // Dropping anywhere else (e.g., header root) if we made it droppable elsewhere
  }
  const [tree, setTree] = useState<FileEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [query, setQuery] = useState('')

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

  const handleNewPage = async () => {
    try {
      // Determine the active folder (empty string means root)
      const { currentPath } = useNavStore.getState()
      const parentFolder = currentPath ? currentPath : ''

      // Read contents of the active folder
      const entries: FileEntry[] = await readDirectory(vaultPath, parentFolder)
      const existingFiles = new Set(entries.filter((e) => !e.isDirectory).map((e) => e.name))

      // Generate Untitled, Untitled 2, Untitled 3, ...
      let index = 1
      let baseName = 'Untitled'
      let displayName = baseName
      let fileName = `${displayName}.md`
      while (existingFiles.has(fileName)) {
        index += 1
        displayName = `${baseName} ${index}`
        fileName = `${displayName}.md`
      }

      const relativePath = parentFolder ? `${parentFolder}/${fileName}` : fileName
      await writeFileToVault(vaultPath, relativePath, `# ${displayName}\n\n`)
      setCurrentFile(relativePath)
      refresh()
    } catch (e) {
      console.error('Failed to create page', e)
      alert('Failed to create page')
    }
  }

  const filteredTree = useMemo(() => {
    if (!query.trim()) return tree
    const q = query.toLowerCase()
    const filterEntries = (entries: FileEntry[]): FileEntry[] =>
      entries
        .map((e) => ({
          ...e,
          children: e.children ? filterEntries(e.children) : undefined,
        }))
        .filter((e) =>
          e.isDirectory
            ? (e.children && e.children.length > 0) || e.name.toLowerCase().includes(q)
            : e.name.toLowerCase().includes(q)
        )
    return filterEntries(tree)
  }, [tree, query])

  return (
    <motion.aside
      className={cn(
        'flex flex-col h-full',
        'bg-[#f8f9fa] dark:bg-[#191919]',
        'text-[#2f3437] dark:text-[#d1d1d1]'
      )}
      style={{ width: 260, minWidth: 260 }}
      animate={{ opacity: 1 }}
      initial={{ opacity: 0.98 }}
      transition={{ duration: 0.15 }}
    >
      <div
        className="flex items-center px-3 py-3 border-b border-[#e2e3e4] dark:border-[#2a2a2a]"
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={async (e) => {
          try {
            const data = e.dataTransfer.getData('application/json')
            if (!data) return
            const src = JSON.parse(data) as { path: string; isDirectory: boolean }
            const base = src.path.split('/').pop() as string
            const targetEntries = await readDirectory(vaultPath, '')
            const existing = new Set(targetEntries.map((t) => t.name))
            let name = base
            if (existing.has(name)) {
              const ext = src.isDirectory ? '' : (name.includes('.') ? '.' + name.split('.').pop() : '')
              const stem = src.isDirectory ? name : name.replace(new RegExp(`${ext.replace('.', '\\.')}$`), '')
              let idx = 1
              let candidate = `${stem} ${idx}${ext}`
              while (existing.has(candidate)) { idx++; candidate = `${stem} ${idx}${ext}` }
              name = candidate
            }
            const newRelative = name
            if (newRelative !== src.path) {
              await renameFile(vaultPath, src.path, newRelative)
              if (useVaultStore.getState().currentFile === src.path) useVaultStore.getState().setCurrentFile(newRelative)
              if (useNavStore.getState().currentPath === src.path) useNavStore.getState().setCurrentPath(newRelative)
              refresh()
            }
          } catch (err) {
            console.error('Move to root failed', err)
            alert('Failed to move item to root')
          }
        }}
      >
        <div className="text-[14px] font-semibold text-[#2f3437] dark:text-[#e4e4e4] truncate">Vault</div>
      </div>

      <div className="px-3 py-2 space-y-2">
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#999]">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.2" />
              <path d="M14.5 14.5L18 18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className={cn(
              'w-full bg-transparent border border-[#e2e3e4] dark:border-[#2a2a2a]',
              'rounded-md pl-7 pr-3 py-1.5 text-sm',
              'focus:outline-none focus:ring-1 focus:ring-[#9b9b9b]',
              'placeholder:text-[#999]'
            )}
          />
        </div>
      </div>

      <div className="relative flex-1 min-h-0 group/sidebar">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <ScrollArea className="h-full notion-scroll px-2">
          <div className="pb-3">
            {isLoading ? (
              <div className="text-sm text-[#6b6b6b] dark:text-[#a0a0a0] p-4 text-center">Loading...</div>
            ) : filteredTree.length === 0 ? (
              <div className="text-sm text-[#6b6b6b] dark:text-[#a0a0a0] p-4 text-center">No results</div>
            ) : (
              <FolderTree entries={filteredTree} vaultPath={vaultPath} />
            )}
          </div>
        </ScrollArea>
        </DndContext>
      </div>

      <div className="px-3 py-2 border-t border-[#e2e3e4] dark:border-[#2a2a2a]">
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-md text-[#6b6b6b] dark:text-[#a0a0a0] hover:bg-[#ebeced] dark:hover:bg-[#202020]" aria-label="Add">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuItem onClick={handleNewPage}>New Page</DropdownMenuItem>
              <DropdownMenuItem onClick={async () => {
                try {
                  const { currentPath } = useNavStore.getState()
                  const parentFolder = currentPath ? currentPath : ''
                  const entries: FileEntry[] = await readDirectory(vaultPath, parentFolder)
                  const existingFolders = new Set(entries.filter((e) => e.isDirectory).map((e) => e.name))
                  let idx = 1
                  let name = 'Untitled'
                  let folderName = name
                  while (existingFolders.has(folderName)) {
                    idx += 1
                    folderName = `Untitled ${idx}`
                  }
                  const relativePath = parentFolder ? `${parentFolder}/${folderName}` : folderName
                  await createDirectoryInVault(vaultPath, relativePath)
                  refresh()
                } catch (e) {
                  console.error('Failed to create folder', e)
                  alert('Failed to create folder')
                }
              }}>New Folder</DropdownMenuItem>
              <DropdownMenuItem onClick={async () => {
                try {
                  const { currentPath } = useNavStore.getState()
                  const parentFolder = currentPath ? currentPath : ''
                  const entries: FileEntry[] = await readDirectory(vaultPath, parentFolder)
                  const existingFiles = new Set(entries.filter((e) => !e.isDirectory).map((e) => e.name))
                  let idx = 1
                  let base = 'Untitled'
                  let name = base
                  let fileName = `${name}.excalidraw.json`
                  while (existingFiles.has(fileName)) {
                    idx += 1
                    name = `${base} ${idx}`
                    fileName = `${name}.excalidraw.json`
                  }
                  const relativePath = parentFolder ? `${parentFolder}/${fileName}` : fileName
                  const content = JSON.stringify({
                    type: 'excalidraw',
                    version: 2,
                    source: 'https://excalidraw.com',
                    elements: [],
                    appState: { gridSize: null, viewBackgroundColor: '#ffffff' },
                  }, null, 2)
                  await writeFileToVault(vaultPath, relativePath, content)
                  setCurrentFile(relativePath)
                  refresh()
                } catch (e) {
                  console.error('Failed to create canvas', e)
                  alert('Failed to create canvas')
                }
              }}>New Canvas</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={() => {
              // placeholder: wire to settings route or modal later
            }}
            className="text-sm text-[#6b6b6b] dark:text-[#a0a0a0] hover:text-black dark:hover:text-white transition-colors"
          >
            Settings
          </button>
        </div>
      </div>
    </motion.aside>
  )
}

