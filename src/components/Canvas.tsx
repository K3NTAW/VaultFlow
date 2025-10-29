'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'

const Excalidraw = dynamic(
  async () => {
    const excalidrawModule = await import('@excalidraw/excalidraw')
    // Import Excalidraw CSS
    await import('@excalidraw/excalidraw/index.css')
    return { default: excalidrawModule.Excalidraw }
  },
  { ssr: false }
)

import { useVaultStore } from '@/store/useVaultStore'
import { readFile, writeFileToVault } from '@/lib/vault'

export function Canvas() {
  const { vaultPath, currentFile } = useVaultStore()
  const [canvasData, setCanvasData] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  // Detect app theme (based on dark class on html/body element)
  useEffect(() => {
    const checkTheme = () => {
      // Check if document has dark class (Tailwind class-based dark mode)
      const isDark = document.documentElement.classList.contains('dark') || 
                     document.body.classList.contains('dark')
      setTheme(isDark ? 'dark' : 'light')
    }
    
    checkTheme()
    
    // Watch for class changes on the document root
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    })
    
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!vaultPath || !currentFile) {
      setIsLoading(false)
      return
    }

    const loadCanvas = async () => {
      setIsLoading(true)
      try {
        const content = await readFile(vaultPath, currentFile)
        const data = JSON.parse(content)
        
        // Clean and normalize appState to prevent Excalidraw errors
        if (data.appState) {
          // Remove collaborators if it exists (we don't use collaboration)
          const { collaborators, ...cleanAppState } = data.appState
          data.appState = {
            ...cleanAppState,
            theme: cleanAppState.theme || theme,
            // Ensure required fields exist
            viewBackgroundColor: cleanAppState.viewBackgroundColor || (theme === 'dark' ? '#1e1e1e' : '#ffffff'),
          }
        } else {
          // Initialize appState if missing
          const bgColor = theme === 'dark' ? '#1e1e1e' : '#ffffff'
          data.appState = {
            gridSize: null,
            viewBackgroundColor: bgColor,
            theme: theme,
          }
        }
        
        setCanvasData(data)
      } catch (error) {
        console.error('Error loading canvas:', error)
        // Initialize empty canvas with proper theme background
        const bgColor = theme === 'dark' ? '#1e1e1e' : '#ffffff'
        setCanvasData({
          type: 'excalidraw',
          version: 2,
          source: 'https://excalidraw.com',
          elements: [],
          appState: { 
            gridSize: null, 
            viewBackgroundColor: bgColor,
            theme: theme,
          },
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadCanvas()
  }, [vaultPath, currentFile, theme])

  const handleChange = useCallback(async (elements: any[], appState: any, files: any) => {
    if (!vaultPath || !currentFile || isSaving) return

    setIsSaving(true)
    
    // Clean appState - remove collaborators and other non-serializable fields
    const { collaborators, ...cleanAppState } = appState || {}
    
    const updatedData = {
      type: 'excalidraw',
      version: 2,
      source: 'https://excalidraw.com',
      elements: elements || [],
      appState: {
        ...cleanAppState,
        theme: cleanAppState.theme || theme,
        // Ensure viewBackgroundColor exists
        viewBackgroundColor: cleanAppState.viewBackgroundColor || (theme === 'dark' ? '#1e1e1e' : '#ffffff'),
      },
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
  }, [vaultPath, currentFile, isSaving, theme])

  if (!currentFile) {
    return null
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground">Loading canvas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="border-b border-border/60 px-6 py-3 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <h2 className="text-sm font-medium text-muted-foreground truncate max-w-md">
          {currentFile?.replace(/\.excalidraw\.json$/, '')}
        </h2>
        <div className="flex items-center gap-4">
          {isSaving && (
            <span className="text-xs text-muted-foreground">Saving...</span>
          )}
        </div>
      </div>
      <div className="flex-1 relative overflow-hidden bg-background" style={{ minHeight: 0 }}>
        {canvasData && (
          <div className="h-full w-full excalidraw-container">
            <Excalidraw
              initialData={{
                elements: canvasData.elements || [],
                appState: (() => {
                  // Create clean appState without collaborators
                  const { collaborators, ...cleanAppState } = canvasData.appState || {}
                  return {
                    ...cleanAppState,
                    theme: cleanAppState.theme || theme,
                  }
                })(),
              }}
              onChange={handleChange}
              theme={theme}
              UIOptions={{
                canvasActions: {
                  saveToActiveFile: false,
                  loadScene: false,
                  export: false,
                  toggleTheme: true,
                },
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

