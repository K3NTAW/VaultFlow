'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const Excalidraw = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  { ssr: false }
)
import { useVaultStore } from '@/store/useVaultStore'
import { readFile, writeFileToVault } from '@/lib/vault'

export function Canvas() {
  const { vaultPath, currentFile } = useVaultStore()
  const [canvasData, setCanvasData] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!vaultPath || !currentFile) return

    const loadCanvas = async () => {
      try {
        const content = await readFile(vaultPath, currentFile)
        const data = JSON.parse(content)
        setCanvasData(data)
      } catch (error) {
        console.error('Error loading canvas:', error)
        // Initialize empty canvas
        setCanvasData({
          type: 'excalidraw',
          version: 2,
          source: 'https://excalidraw.com',
          elements: [],
          appState: { gridSize: null, viewBackgroundColor: '#ffffff' },
        })
      }
    }

    loadCanvas()
  }, [vaultPath, currentFile])

  const handleChange = async (elements: any[], appState: any, files: any) => {
    if (!vaultPath || !currentFile || isSaving) return

    setIsSaving(true)
    const updatedData = {
      type: 'excalidraw',
      version: 2,
      source: 'https://excalidraw.com',
      elements,
      appState,
      files: files || {},
    }

    setCanvasData(updatedData)

    try {
      // Debounce save
      await new Promise((resolve) => setTimeout(resolve, 1000))
      await writeFileToVault(vaultPath, currentFile, JSON.stringify(updatedData, null, 2))
    } catch (error) {
      console.error('Error saving canvas:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!currentFile) {
    return null
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border px-4 py-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{currentFile}</h2>
        {isSaving && <span className="text-xs text-muted-foreground">Saving...</span>}
      </div>
      <div className="flex-1 relative">
        {canvasData && (
          <Excalidraw
            initialData={{
              elements: canvasData.elements || [],
              appState: canvasData.appState || {},
            }}
            onChange={handleChange}
            theme="light"
          />
        )}
      </div>
    </div>
  )
}

