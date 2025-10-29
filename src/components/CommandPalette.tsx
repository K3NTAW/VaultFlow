'use client'

import { useEffect } from 'react'
import {
  KBarProvider,
  KBarPortal,
  KBarPositioner,
  KBarAnimator,
  KBarSearch,
  useMatches,
  KBarResults,
} from 'kbar'
import { useVaultStore } from '@/store/useVaultStore'
import { useNavStore } from '@/store/useNavStore'
import { useAIStore } from '@/store/useAIStore'
import { queryVault, initializeAI } from '@/lib/ai'
import { writeFileToVault } from '@/lib/vault'

export function CommandPalette() {
  const { vaultPath, setVaultPath, refresh } = useVaultStore()
  const { setCurrentPath } = useNavStore()
  const { addMessage, setIsProcessing } = useAIStore()

  const actions = [
    {
      id: 'new-note',
      name: 'New Note',
      shortcut: ['n'],
      keywords: 'create note markdown',
      perform: async () => {
        if (!vaultPath) {
          alert('Please select a vault first')
          return
        }
        const fileName = `note-${Date.now()}.md`
        const content = `# New Note\n\nCreated: ${new Date().toLocaleString()}\n\n`
        try {
          await writeFileToVault(vaultPath, `notes/${fileName}`, content)
          refresh()
        } catch (error) {
          alert(`Failed to create note: ${error}`)
        }
      },
    },
    {
      id: 'new-canvas',
      name: 'New Canvas',
      shortcut: ['c'],
      keywords: 'create canvas drawing excalidraw',
      perform: async () => {
        if (!vaultPath) {
          alert('Please select a vault first')
          return
        }
        const fileName = `canvas-${Date.now()}.excalidraw.json`
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
          await writeFileToVault(vaultPath, `canvases/${fileName}`, content)
          refresh()
        } catch (error) {
          alert(`Failed to create canvas: ${error}`)
        }
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

  return (
    <KBarProvider actions={actions}>
      <KBarPortal>
        <KBarPositioner className="bg-black/50 backdrop-blur-sm z-50">
          <KBarAnimator className="bg-background border border-border rounded-lg shadow-lg overflow-hidden w-full max-w-2xl">
            <KBarSearch className="w-full px-4 py-3 text-sm outline-none border-b border-border" />
            <RenderResults />
          </KBarAnimator>
        </KBarPositioner>
      </KBarPortal>
    </KBarProvider>
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

