'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useVaultStore } from '@/store/useVaultStore'
import { Sidebar } from '@/components/Sidebar'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { TerminalNav } from '@/components/TerminalNav'
import { Editor } from '@/components/Editor'
import { Canvas } from '@/components/Canvas'
import { AIPanel } from '@/components/AIPanel'
import { VaultSelector } from '@/components/VaultSelector'

const CommandPalette = dynamic(() => import('@/components/CommandPalette'), {
  ssr: false,
})

export default function Home() {
  const { vaultPath, setVaultPath, currentFile, setCurrentFile } = useVaultStore()

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
      <div className="h-12 border-b border-border flex items-center px-4 gap-4">
        <Breadcrumbs />
      </div>

      {/* Terminal Navigation (Toggleable) */}
      <TerminalNav />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Editor/Canvas Area */}
        <main className="flex-1 overflow-auto">
          {isCanvas && <Canvas />}
          {isNote && <Editor />}
          {!currentFile && (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <p>Select a note or canvas to get started</p>
            </div>
          )}
        </main>

        {/* Right AI Panel */}
        <AIPanel />
      </div>
      <CommandPalette />
    </div>
  )
}

