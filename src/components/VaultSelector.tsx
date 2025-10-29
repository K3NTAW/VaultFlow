'use client'

import { useState } from 'react'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { Store } from '@tauri-apps/plugin-store'
import { useVaultStore } from '@/store/useVaultStore'
import { Button } from './ui/button'
import { Input } from './ui/input'

export function VaultSelector() {
  const [isLoading, setIsLoading] = useState(false)
  const { setVaultPath } = useVaultStore()

  const handleSelectVault = async () => {
    console.log('Button clicked, starting vault selection...')
    setIsLoading(true)
    try {
      console.log('Calling open()...')
      // In Tauri v2, open() returns the path directly or null
      const selected = await openDialog({
        directory: true,
        multiple: false,
        title: 'Select Vault Folder',
      })

      console.log('Dialog returned:', selected, typeof selected)

      // Handle both string and null (user cancelled)
      if (selected) {
        console.log('Saving vault path:', selected)
        // Save vault path to Tauri store
        const appStore = await Store.load('vaultflow.dat')
        await appStore.set('vaultPath', selected)
        await appStore.save()
        console.log('Vault path saved')

        setVaultPath(selected)
      } else {
        console.log('User cancelled folder selection')
      }
    } catch (error) {
      console.error('Error selecting vault:', error)
      // Show more detailed error
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('Full error details:', error)
      alert(`Failed to select vault folder: ${errorMsg}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-md w-full space-y-6 p-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Welcome to VaultFlow</h1>
        <p className="text-muted-foreground">
          Select a folder to use as your vault. All notes and canvases will be stored here.
        </p>
      </div>

      <div className="space-y-4">
        <Button
          onClick={handleSelectVault}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? 'Selecting...' : 'Select Vault Folder'}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Your vault folder will contain a `notes/` directory for markdown files
          and a `canvases/` directory for Excalidraw canvases.
        </p>
      </div>
    </div>
  )
}

