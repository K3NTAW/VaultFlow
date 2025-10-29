'use client'

import { useEffect, useState } from 'react'
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


export function CommandPalette() {
  const { vaultPath, setVaultPath, refresh } = useVaultStore()
  const { setCurrentPath } = useNavStore()
  const { addMessage, setIsProcessing } = useAIStore()
  
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [showCanvasInput, setShowCanvasInput] = useState(false)

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
      id: 'search-notes',
      name: 'Search Notes',
      shortcut: ['f'],
      keywords: 'find search',
      perform: () => {
        // This could open a search modal or focus search input
        alert('Search functionality - to be implemented')
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
        <CommandPaletteContent />
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

function CommandPaletteContent() {
  return (
    <KBarPortal>
      <KBarPositioner className="bg-black/50 backdrop-blur-sm z-50">
        <KBarAnimator className="bg-background border border-border rounded-lg shadow-lg overflow-hidden w-full max-w-2xl">
          <KBarSearch className="w-full px-4 py-3 text-sm outline-none border-b border-border" />
          <RenderResults />
        </KBarAnimator>
      </KBarPositioner>
    </KBarPortal>
  )
}

function RenderResults() {
  const { results } = useMatches()

  return (
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
}

// Export a hook to trigger the command palette
export function useRegisterActions() {
  // This is handled by KBarProvider
}

// Default export for dynamic import
export default CommandPalette

