'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useVaultStore } from '@/store/useVaultStore'
import { useNavStore } from '@/store/useNavStore'
import { Sidebar } from '@/components/Sidebar'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Editor } from '@/components/Editor'
import { Canvas } from '@/components/Canvas'
import { AIPanel } from '@/components/AIPanel'
import { VaultSelector } from '@/components/VaultSelector'
import { FolderView } from '@/components/FolderView'

const CommandPalette = dynamic(() => import('@/components/CommandPalette'), {
  ssr: false,
})

export default function Home() {
  const { vaultPath, setVaultPath, currentFile, setCurrentFile } = useVaultStore()
  const { aiPanelVisible, setAIPanelVisible, sidebarVisible, setSidebarVisible, currentPath } = useNavStore()

  useEffect(() => {
    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+I for AI panel
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault()
        setAIPanelVisible(!aiPanelVisible)
      }
      // Cmd/Ctrl+B for sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault()
        setSidebarVisible(!sidebarVisible)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [aiPanelVisible, setAIPanelVisible, sidebarVisible, setSidebarVisible])

  useEffect(() => {
    // Check if vault is already set
    const checkVault = async () => {
      try {
        const { Store } = await import('@tauri-apps/plugin-store')
        const appStore = await Store.load('vaultflow.dat')
        const savedPath = await appStore.get<string>('vaultPath')
        if (savedPath) {
          setVaultPath(savedPath)
        }
      } catch (error) {
        console.error('Error loading vault path:', error)
      }
    }
    checkVault()
  }, [setVaultPath])

  if (!vaultPath) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <VaultSelector />
      </div>
    )
  }

  const isCanvas = currentFile?.endsWith('.excalidraw.json')
  const isNote = currentFile?.endsWith('.md')

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      {/* Top Bar with Breadcrumbs */}
      <div className="h-14 border-b border-border/60 flex items-center justify-between px-6 gap-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarVisible(!sidebarVisible)}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-accent transition-colors"
            title="Toggle Sidebar (Cmd+B)"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M2 4H14M2 8H14M2 12H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <Breadcrumbs />
        </div>
        <div className="flex items-center gap-2">
          {!aiPanelVisible && (
            <button
              onClick={() => setAIPanelVisible(true)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-accent transition-colors"
              title="Open AI Assistant (Cmd+I)"
            >
              AI
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        {sidebarVisible && <Sidebar />}

        {/* Editor/Canvas Area */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {isCanvas && <Canvas />}
          {isNote && <Editor />}
          {!currentFile && <FolderView />}
        </main>

        {/* Right AI Panel (Toggleable) */}
        {aiPanelVisible && <AIPanel />}
      </div>
      <CommandPalette />
    </div>
  )
}

