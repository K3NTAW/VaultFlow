'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  KBarProvider,
  KBarPortal,
  KBarPositioner,
  KBarAnimator,
  KBarSearch,
  useMatches,
  KBarResults,
  useKBar,
} from 'kbar'
import { useVaultStore } from '@/store/useVaultStore'
import { useNavStore } from '@/store/useNavStore'
import { useAIStore } from '@/store/useAIStore'
import { queryVault, initializeAI } from '@/lib/ai'
import { writeFileToVault } from '@/lib/vault'
import { FileNameInput } from './FileNameInput'
import Fuse from 'fuse.js'
import { readDirectory, readFile, FileEntry, isNote, isCanvas } from '@/lib/vault'


export function CommandPalette() {
  const { vaultPath, setVaultPath, refresh } = useVaultStore()
  const { setCurrentPath } = useNavStore()
  const { addMessage, setIsProcessing } = useAIStore()
  
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [showCanvasInput, setShowCanvasInput] = useState(false)
  const [fileIndex, setFileIndex] = useState<Array<{ path: string; name: string; content?: string; kind: 'note' | 'canvas' | 'other' }>>([])
  const [isBuildingIndex, setIsBuildingIndex] = useState(false)

  // Note: We use useVaultStore.getState() and useNavStore.getState() inside actions
  // to get the latest state when the action is performed, since hooks can't be used in callbacks

  const actions = [
    {
      id: 'new-note',
      name: 'New Note',
      shortcut: ['n'],
      keywords: 'create note markdown',
      perform: async () => {
        console.log('New Note action triggered')
        
        const { vaultPath: currentVaultPath } = useVaultStore.getState()
        
        if (!currentVaultPath) {
          alert('Please select a vault first')
          return
        }

        // Show custom input modal instead of prompt
        setShowNoteInput(true)
      },
    },
    {
      id: 'new-canvas',
      name: 'New Canvas',
      shortcut: ['c'],
      keywords: 'create canvas drawing excalidraw',
      perform: async () => {
        console.log('New Canvas action triggered')
        
        const { vaultPath: currentVaultPath } = useVaultStore.getState()
        
        if (!currentVaultPath) {
          alert('Please select a vault first')
          return
        }

        // Show custom input modal instead of prompt
        setShowCanvasInput(true)
      },
    },
    {
      id: 'ai-summarize',
      name: 'AI Summarize',
      shortcut: ['s'],
      keywords: 'ai summarize assistant',
      perform: async () => {
        if (!vaultPath) {
          alert('Please select a vault first')
          return
        }
        const prompt = 'Summarize the contents of this vault'
        setIsProcessing(true)
        try {
          const apiKey = localStorage.getItem('openai_api_key')
          if (!apiKey) {
            const key = prompt('Enter your OpenAI API key:')
            if (!key) return
            localStorage.setItem('openai_api_key', key)
            initializeAI(key)
          } else {
            initializeAI(apiKey)
          }

          const result = await queryVault(vaultPath, prompt)
          addMessage({
            role: 'assistant',
            content: result.answer,
            citations: result.citations,
          })
        } catch (error) {
          alert(`AI query failed: ${error}`)
        } finally {
          setIsProcessing(false)
        }
      },
    },
    {
      id: 'switch-vault',
      name: 'Switch Vault',
      shortcut: ['v'],
      keywords: 'change vault folder',
      perform: async () => {
        const { open } = await import('@tauri-apps/plugin-dialog')
        const { Store } = await import('@tauri-apps/plugin-store')
        try {
          const selected = await open({
            directory: true,
            multiple: false,
            title: 'Select Vault Folder',
          })
          if (selected && typeof selected === 'string') {
            const appStore = await Store.load('vaultflow.dat')
            await appStore.set('vaultPath', selected)
            await appStore.save()
            setVaultPath(selected)
            setCurrentPath('/')
          }
        } catch (error) {
          alert(`Failed to switch vault: ${error}`)
        }
      },
    },
    {
      id: 'toggle-ai',
      name: 'Toggle AI Assistant',
      shortcut: ['i'],
      keywords: 'ai assistant panel',
      perform: () => {
        const { aiPanelVisible, setAIPanelVisible } = useNavStore.getState()
        setAIPanelVisible(!aiPanelVisible)
      },
    },
  ]

  // Build a fuzzy index of files (name, path, and a short content snippet) like zoxide-style search
  useEffect(() => {
    const buildIndex = async () => {
      if (!vaultPath) { setFileIndex([]); return }
      setIsBuildingIndex(true)
      try {
        const collect = async (entries: FileEntry[], base: string): Promise<Array<{ path: string; name: string; content?: string; kind: 'note' | 'canvas' | 'other' }>> => {
          const out: Array<{ path: string; name: string; content?: string; kind: 'note' | 'canvas' | 'other' }> = []
          for (const e of entries) {
            if (e.isDirectory) {
              const children = e.children || []
              out.push(...(await collect(children, base)))
            } else {
              const p = e.path
              const name = e.name
              let content: string | undefined
              if (isNote(name)) {
                try {
                  const text = await readFile(vaultPath, p)
                  content = text.slice(0, 2000) // sample first 2k for speed
                } catch {}
              }
              const kind: 'note' | 'canvas' | 'other' = isNote(name) ? 'note' : isCanvas(name) ? 'canvas' : 'other'
              out.push({ path: p, name, content, kind })
            }
          }
          return out
        }
        const root = await readDirectory(vaultPath, '')
        const flat = await collect(root, '')
        setFileIndex(flat)
        // @ts-ignore
        window.__vaultflow_file_index = flat
      } finally {
        setIsBuildingIndex(false)
      }
    }
    buildIndex()
  }, [vaultPath, refresh])

  const handleNoteCreate = async (fileName: string) => {
    const { vaultPath: currentVaultPath, setCurrentFile } = useVaultStore.getState()
    const { currentPath: currentFolderPath } = useNavStore.getState()
    
    console.log('Creating note:', { fileName, currentFolderPath })
    
    // Sanitize filename: remove invalid characters and ensure .md extension
    const sanitized = fileName.trim().replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, ' ')
    const fileWithExt = sanitized.endsWith('.md') ? sanitized : `${sanitized}.md`
    
    // Use current folder path if available, otherwise create at root
    const relativePath = currentFolderPath 
      ? `${currentFolderPath}/${fileWithExt}`
      : fileWithExt

    console.log('Creating file:', { relativePath, fileWithExt })

    const content = `# ${sanitized.replace(/\.md$/, '')}\n\nCreated: ${new Date().toLocaleString()}\n\n`
    
    try {
      await writeFileToVault(currentVaultPath!, relativePath, content)
      console.log('File created, opening...')
      // Open the newly created file
      setCurrentFile(relativePath)
      // Clear folder path to show the editor
      useNavStore.getState().setCurrentPath(null)
      // Refresh sidebar
      refresh()
      console.log('File opened and sidebar refreshed')
    } catch (error) {
      console.error('Error creating note:', error)
      alert(`Failed to create note: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const handleCanvasCreate = async (fileName: string) => {
    const { vaultPath: currentVaultPath, setCurrentFile } = useVaultStore.getState()
    const { currentPath: currentFolderPath } = useNavStore.getState()
    
    console.log('Creating canvas:', { fileName, currentFolderPath })
    
    // Sanitize filename: remove invalid characters
    const sanitized = fileName.trim().replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, ' ')
    const fileWithExt = sanitized.endsWith('.excalidraw.json') 
      ? sanitized 
      : `${sanitized}.excalidraw.json`
    
    // Use current folder path if available, otherwise create at root
    const relativePath = currentFolderPath 
      ? `${currentFolderPath}/${fileWithExt}`
      : fileWithExt

    console.log('Creating canvas:', { relativePath, fileWithExt })

    const content = JSON.stringify(
      {
        type: 'excalidraw',
        version: 2,
        source: 'https://excalidraw.com',
        elements: [],
        appState: { gridSize: null, viewBackgroundColor: '#ffffff' },
      },
      null,
      2
    )
    
    try {
      await writeFileToVault(currentVaultPath!, relativePath, content)
      console.log('Canvas created, opening...')
      // Open the newly created canvas
      setCurrentFile(relativePath)
      // Clear folder path to show the canvas
      useNavStore.getState().setCurrentPath(null)
      // Refresh sidebar
      refresh()
      console.log('Canvas opened and sidebar refreshed')
    } catch (error) {
      console.error('Error creating canvas:', error)
      alert(`Failed to create canvas: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <>
      <KBarProvider actions={actions}>
        <CommandPaletteContent fileIndex={fileIndex} />
      </KBarProvider>
      <FileNameInput
        isOpen={showNoteInput}
        onClose={() => setShowNoteInput(false)}
        onConfirm={handleNoteCreate}
        placeholder="Enter note name (without .md)"
        defaultName="New Note"
        title="Create New Note"
      />
      <FileNameInput
        isOpen={showCanvasInput}
        onClose={() => setShowCanvasInput(false)}
        onConfirm={handleCanvasCreate}
        placeholder="Enter canvas name (without .excalidraw.json)"
        defaultName="New Canvas"
        title="Create New Canvas"
      />
    </>
  )
}

function CommandPaletteContent({ fileIndex }: { fileIndex: Array<{ path: string; name: string; content?: string; kind: 'note' | 'canvas' | 'other' }> }) {
  return (
    <KBarPortal>
      <KBarPositioner className="bg-black/50 backdrop-blur-sm z-50">
        <KBarAnimator className="bg-background border border-border rounded-lg shadow-lg overflow-hidden w-full max-w-2xl">
          <KBarSearch className="w-full px-4 py-3 text-sm outline-none border-b border-border" />
          <RenderResults fileIndex={fileIndex} />
        </KBarAnimator>
      </KBarPositioner>
    </KBarPortal>
  )
}

function RenderResults({ fileIndex }: { fileIndex: Array<{ path: string; name: string; content?: string; kind: 'note' | 'canvas' | 'other' }> }) {
  const { results } = useMatches()
  const { searchQuery } = useKBar((state) => ({ searchQuery: state.searchQuery }))
  const { setCurrentFile } = useVaultStore()
  const { setCurrentPath } = useNavStore()
  const fuse = useMemo(() => {
    if (!fileIndex || fileIndex.length === 0) return null
    return new Fuse(fileIndex, {
      keys: [
        { name: 'name', weight: 0.6 },
        { name: 'path', weight: 0.25 },
        { name: 'content', weight: 0.15 },
      ],
      threshold: 0.38,
      ignoreLocation: true,
      includeScore: true,
      minMatchCharLength: 2,
    })
  }, [fileIndex])

  const sq = typeof searchQuery === 'string' ? searchQuery.trim() : ''
  const fileMatches = useMemo(() => {
    if (!fuse || !sq) return []
    // Support multi-token AND like zoxide: split by spaces and filter intersect
    const tokens = sq.split(/\s+/).filter(Boolean)
    let matches = fuse.search(tokens[0])
    for (let i = 1; i < tokens.length; i++) {
      const set = new Set(fuse.search(tokens[i]).map(r => r.item.path))
      matches = matches.filter(m => set.has(m.item.path))
    }
    return matches.slice(0, 20)
  }, [fuse, sq])

  const rendered = (
    <KBarResults
      items={results}
      onRender={({ item, active }) => {
        if (typeof item === 'string') {
          return (
            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">
              {item}
            </div>
          )
        }
        return (
          <div
            className={`px-4 py-3 flex items-center justify-between cursor-pointer ${
              active ? 'bg-accent' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{item.name}</span>
            </div>
            {item.shortcut && (
              <div className="flex gap-1">
                {item.shortcut.map((key) => (
                  <kbd
                    key={key}
                    className="px-2 py-1 text-xs bg-muted rounded border border-border"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            )}
          </div>
        )
      }}
    />
  )

  if (!sq || !fileMatches.length) return rendered

  // Merge actions (top) and file results (below)
  return (
    <div className="max-h-[60vh] overflow-y-auto">
      {rendered}
      {(() => {
        const notes = fileMatches.filter(m => m.item.kind === 'note')
        const canvases = fileMatches.filter(m => m.item.kind === 'canvas')
        return (
          <>
            {!!notes.length && (
              <>
                <div className="px-4 pt-3 pb-2 text-xs font-semibold text-muted-foreground uppercase">Notes</div>
                <div className="py-1">
                  {notes.map(({ item }) => (
                    <button
                      key={item.path}
                      className="w-full text-left px-4 py-2 hover:bg-accent flex items-center gap-2"
                      onClick={() => {
                        setCurrentFile(item.path)
                        setCurrentPath('')
                      }}
                    >
                      <span>📄</span>
                      <span className="text-xs text-muted-foreground">{item.path}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            {!!canvases.length && (
              <>
                <div className="px-4 pt-3 pb-2 text-xs font-semibold text-muted-foreground uppercase">Canvases</div>
                <div className="py-1">
                  {canvases.map(({ item }) => (
                    <button
                      key={item.path}
                      className="w-full text-left px-4 py-2 hover:bg-accent flex items-center gap-2"
                      onClick={() => {
                        setCurrentFile(item.path)
                        setCurrentPath('')
                      }}
                    >
                      <span>🎨</span>
                      <span className="text-xs text-muted-foreground">{item.path}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )
      })()}
    </div>
  )
}

// Export a hook to trigger the command palette
export function useRegisterActions() {
  // This is handled by KBarProvider
}

// Default export for dynamic import
export default CommandPalette

