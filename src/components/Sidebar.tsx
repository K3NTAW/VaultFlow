'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useVaultStore } from '@/store/useVaultStore'
import { useNavStore } from '@/store/useNavStore'
import { readDirectory, FileEntry, isNote, isCanvas, deleteFile, exportFile, renameFile, writeFileToVault, createDirectoryInVault, deleteEntryRecursive } from '@/lib/vault'
import { ScrollArea } from './ui/scroll-area'
import { FileNameInput } from './FileNameInput'
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
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverEvent, useDroppable, useDraggable, DragOverlay, pointerWithin } from '@dnd-kit/core'

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

function FolderTree({ entries, vaultPath, level = 0, draggedId }: FolderTreeProps & { draggedId?: string | null }) {
  const { currentFile, setCurrentFile, refresh } = useVaultStore()
  const { currentPath, setCurrentPath } = useNavStore()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [hovered, setHovered] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const expandTimers = useRef<Record<string, any>>({})

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

  const [renameTarget, setRenameTarget] = useState<FileEntry | null>(null)
  const handleRename = async (entry: FileEntry) => {
    setRenameTarget(entry)
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
  const Row = ({ entry, children }: { entry: FileEntry; children: (over: boolean) => React.ReactNode }) => {
    const drag = useDraggable({ id: entry.path, data: { path: entry.path, isDirectory: entry.isDirectory } })
    const drop = useDroppable({ id: `drop:${entry.path}`, data: { path: entry.path, isDirectory: entry.isDirectory } })
    const setBothRefs = (node: HTMLElement | null) => { drag.setNodeRef(node); drop.setNodeRef(node) }
    // fade/lighten if this is the dragged row
    const isDragging = draggedId === entry.path
    // Auto-expand folder on hover while dragging
    if (drop.isOver && entry.isDirectory && !expanded.has(entry.path) && draggedId) {
      if (!expandTimers.current[entry.path]) {
        expandTimers.current[entry.path] = setTimeout(() => {
          const next = new Set(expanded)
          next.add(entry.path)
          setExpanded(next)
          clearTimeout(expandTimers.current[entry.path])
          delete expandTimers.current[entry.path]
        }, 250)
      }
    } else {
      if (expandTimers.current[entry.path]) {
        clearTimeout(expandTimers.current[entry.path])
        delete expandTimers.current[entry.path]
      }
    }
    return (
      <div
        ref={setBothRefs}
        {...drag.listeners}
        {...drag.attributes}
        data-over={drop.isOver}
        style={{
          opacity: isDragging ? 0.26 : 1,
          filter: isDragging ? 'blur(1px)' : undefined,
        }}
      >
        {children(drop.isOver)}
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
            {(over) => (
            <div
              onClick={() => handleClick(entry)}
              className={cn(
                'relative flex items-center gap-1.5 pr-2 py-1.5 text-[13px] cursor-pointer rounded-md transition-colors',
                'hover:bg-[#ebeced] dark:hover:bg-[#202020]',
                isSelected ? 'bg-[#ebeced] dark:bg-[#202020] text-[#2f3437] dark:text-[#d1d1d1] font-medium' : 'text-[#6b6b6b] dark:text-[#a0a0a0]',
                over && 'bg-[#ebeced] dark:bg-[#202020]'
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
                style={{ pointerEvents: draggedId ? 'none' as const : 'auto' }}
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
            )}
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
                    draggedId={draggedId}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    {/* Rename modal */}
    {renameTarget && (
      <FileNameInput
        isOpen={true}
        onClose={() => setRenameTarget(null)}
        onConfirm={async (name) => {
          try {
            const base = name.trim().replace(/[<>:"/\\|?*]/g, '-') || 'Untitled'
            const parent = renameTarget.path.split('/').slice(0, -1).join('/')
            const siblings = await readDirectory(vaultPath, parent)
            const existing = new Set(siblings.map(s => s.name))
            const ext = renameTarget.isDirectory ? '' : (renameTarget.name.includes('.') ? `.${renameTarget.name.split('.').pop()}` : '')
            let finalName = `${base}${ext}`
            if (existing.has(finalName) && finalName !== renameTarget.name) {
              let idx = 2
              let candidate = `${base} ${idx}${ext}`
              while (existing.has(candidate)) { idx++; candidate = `${base} ${idx}${ext}` }
              finalName = candidate
            }
            const oldPath = renameTarget.path
            const newPath = parent ? `${parent}/${finalName}` : finalName
            if (newPath !== oldPath) {
              await renameFile(vaultPath, oldPath, newPath)
              refresh()
            }
          } finally {
            setRenameTarget(null)
          }
        }}
        placeholder="Enter new name"
        defaultName={renameTarget.name.replace(/\.(md|excalidraw\.json)$/, '')}
        title="Rename"
      />
    )}
    </div>
  )
}

export function Sidebar() {
  const { vaultPath, refreshTrigger, setCurrentFile, refresh } = useVaultStore()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const moveToTarget = async (src: { path: string; isDirectory: boolean }, targetPath: string) => {
    // If dropping onto itself (shouldn't happen) or same parent, no-op
    const srcParent = src.path.split('/').slice(0, -1).join('/')
    if (srcParent === targetPath) return
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
    // Update selections
    const vs = useVaultStore.getState()
    const ns = useNavStore.getState()
    const curFile = vs.currentFile
    const curPath = ns.currentPath
    if (src.isDirectory) {
      const prefix = src.path + '/'
      const newPrefix = newRel + '/'
      if (curFile && curFile.startsWith(prefix)) {
        vs.setCurrentFile(curFile.replace(prefix, newPrefix))
      }
      if (curPath && curPath.startsWith(prefix)) {
        ns.setCurrentPath(curPath.replace(prefix, newPrefix))
      }
      if (curPath === src.path) ns.setCurrentPath(newRel)
    } else {
      if (curFile === src.path) vs.setCurrentFile(newRel)
      if (curPath === src.path) ns.setCurrentPath(newRel)
    }
    refresh()
  }

  // Drag and Droppable for root (Vault header)
  const rootDrop = useDroppable({ id: 'drop:VaultRoot', data: { path: '', isDirectory: true } })
  const rootZoneDrop = useDroppable({ id: 'drop:RootZone', data: { path: '', isDirectory: true } })

  const handleDragEnd = async (event: DragEndEvent) => {
    setDraggedId(null)
    const { active, over } = event
    if (!over) return
    const src = active.data.current as { path: string; isDirectory: boolean } | undefined
    const overData = over.data.current as { path: string; isDirectory: boolean } | undefined
    if (!src) return
    const overId = String(over.id)
    const isRoot = overId === 'drop:VaultRoot' || overId === 'drop:RootZone' || (overData && overData.path === '')
    if (isRoot) {
      await moveToTarget(src, '')
      return
    }
    if (overId.startsWith('drop:') && overData && overData.isDirectory) {
      await moveToTarget(src, overData.path)
      return
    }
  }

  const handleDragStart = (event: any) => {
    setDraggedId(event.active.id as string)
  }

  const handleDragMove = (_event: any) => {
    const el = scrollRef.current
    if (!el) return
    const { top, bottom } = el.getBoundingClientRect()
    const y = _event?.delta?.y !== undefined ? _event.delta.y : _event?.activatorEvent?.clientY
    const clientY = typeof y === 'number' ? y : _event?.sensor?.coords?.y
    if (typeof clientY !== 'number') return
    const threshold = 28
    const speed = 16
    if (clientY < top + threshold) {
      el.scrollTop -= speed
    } else if (clientY > bottom - threshold) {
      el.scrollTop += speed
    }
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
      const { currentPath } = useNavStore.getState()
      const parentFolder = currentPath ? currentPath : ''
      const raw = window.prompt('New page name:', 'Untitled')
      if (raw === null) return
      const base = (raw.trim() || 'Untitled').replace(/[<>:"/\\|?*]/g, '-')
      const entries: FileEntry[] = await readDirectory(vaultPath, parentFolder)
      const existingFiles = new Set(entries.filter((e) => !e.isDirectory).map((e) => e.name))
      let fileName = `${base}.md`
      if (existingFiles.has(fileName)) {
        let idx = 2
        let candidate = `${base} ${idx}.md`
        while (existingFiles.has(candidate)) { idx++; candidate = `${base} ${idx}.md` }
        fileName = candidate
      }
      const relativePath = parentFolder ? `${parentFolder}/${fileName}` : fileName
      await writeFileToVault(vaultPath, relativePath, `# ${fileName.replace(/\.md$/, '')}\n\n`)
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
        ref={rootDrop.setNodeRef}
        className={cn(
          'flex items-center px-3 py-3 border-b border-[#e2e3e4] dark:border-[#2a2a2a]',
          rootDrop.isOver && 'bg-[#ebeced] dark:bg-[#202020] shadow-sm rounded-md transition-colors'
        )}
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
        <DndContext sensors={sensors} onDragEnd={handleDragEnd} onDragStart={handleDragStart} onDragMove={handleDragMove} collisionDetection={pointerWithin}>
          <ScrollArea className="h-full notion-scroll px-2" ref={scrollRef}>
            {/* Thin root drop zone at very top to move to Vault when dragging */}
            <div
              ref={rootZoneDrop.setNodeRef}
              className={cn(
                'sticky top-0 z-30 mx-[-8px] rounded-md transition-all',
                draggedId ? 'h-10 my-1 px-3 flex items-center border border-dashed border-[#e2e3e4] dark:border-[#2a2a2a] bg-transparent pointer-events-auto' : 'h-0 pointer-events-none',
                rootZoneDrop.isOver && 'bg-[#ebeced] dark:bg-[#202020]'
              )}
            >
              {draggedId && (
                <span className="text-[12px] leading-none text-[#6b6b6b] dark:text-[#a0a0a0]">
                  Drop here to move to Vault
                </span>
              )}
            </div>
            <div className="pb-3"> 
            {isLoading ? (
              <div className="text-sm text-[#6b6b6b] dark:text-[#a0a0a0] p-4 text-center">Loading...</div>
            ) : filteredTree.length === 0 ? (
              <div className="text-sm text-[#6b6b6b] dark:text-[#a0a0a0] p-4 text-center">No results</div>
            ) : (
              <FolderTree entries={filteredTree} vaultPath={vaultPath} draggedId={draggedId} />
            )}
          </div>
        </ScrollArea>
          <DragOverlay adjustScale dropAnimation={{ duration: 140 }} >
            {!!draggedId && (() => {
              // Find in tree
              function findEntry(entries: FileEntry[], id: string): FileEntry | null {
                for (const entry of entries) {
                  if (entry.path === id) return entry
                  if (entry.children) {
                    const found = findEntry(entry.children, id)
                    if (found) return found
                  }
                }
                return null
              }
              const entry = findEntry(tree, draggedId as string)
              if (!entry) return null
              return (
                <div
                  className={cn(
                    'px-2.5 py-1 rounded-md shadow-sm border text-[12px] leading-[14px]',
                    'bg-[#f8f9fa] dark:bg-[#232323] text-[#2f3437] dark:text-[#d1d1d1]',
                    entry.isDirectory ? 'font-medium' : 'font-normal',
                  )}
                  style={{ transform: 'scale(0.92)' }}
                >
                  <span className="mr-1">
                    {entry.isDirectory ? '📁' : isNote(entry.name) ? '📄' : isCanvas(entry.name) ? '🎨' : ''}
                  </span>
                  <span className="truncate inline-block max-w-[180px] align-middle">
                    {entry.name.replace(/\.(md|excalidraw\.json)$/, '')}
                  </span>
                </div>
              )
            })()}
          </DragOverlay>
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
                  const raw = window.prompt('New folder name:', 'Untitled')
                  if (raw === null) return
                  const base = (raw.trim() || 'Untitled').replace(/[<>:"/\\|?*]/g, '-')
                  let folderName = base
                  if (existingFolders.has(folderName)) {
                    let idx = 2
                    let candidate = `${base} ${idx}`
                    while (existingFolders.has(candidate)) { idx++; candidate = `${base} ${idx}` }
                    folderName = candidate
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
                  const raw = window.prompt('New canvas name:', 'Untitled')
                  if (raw === null) return
                  const base = (raw.trim() || 'Untitled').replace(/[<>:"/\\|?*]/g, '-')
                  let fileName = `${base}.excalidraw.json`
                  if (existingFiles.has(fileName)) {
                    let idx = 2
                    let candidate = `${base} ${idx}.excalidraw.json`
                    while (existingFiles.has(candidate)) { idx++; candidate = `${base} ${idx}.excalidraw.json` }
                    fileName = candidate
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

