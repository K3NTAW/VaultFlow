'use client'

import { useEffect, useCallback, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useVaultStore } from '@/store/useVaultStore'
import { readFile, writeFileToVault } from '@/lib/vault'
import { ScrollArea } from './ui/scroll-area'

export function Editor() {
  const { vaultPath, currentFile } = useVaultStore()
  const [isSaving, setIsSaving] = useState(false)

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-full p-8',
      },
    },
  })

  // Load file content
  useEffect(() => {
    if (!editor || !vaultPath || !currentFile) return

    const loadFile = async () => {
      try {
        const content = await readFile(vaultPath, currentFile)
        editor.commands.setContent(content)
      } catch (error) {
        console.error('Error loading file:', error)
        editor.commands.setContent(`# ${currentFile}\n\n`)
      }
    }

    loadFile()
  }, [editor, vaultPath, currentFile])

  // Auto-save on content change
  const handleUpdate = useCallback(async () => {
    if (!editor || !vaultPath || !currentFile || isSaving) return

    const content = editor.getHTML()
    setIsSaving(true)

    try {
      // Debounce save operations
      await new Promise((resolve) => setTimeout(resolve, 500))
      await writeFileToVault(vaultPath, currentFile, content)
    } catch (error) {
      console.error('Error saving file:', error)
    } finally {
      setIsSaving(false)
    }
  }, [editor, vaultPath, currentFile, isSaving])

  useEffect(() => {
    if (!editor) return

    editor.on('update', handleUpdate)
    return () => {
      editor.off('update', handleUpdate)
    }
  }, [editor, handleUpdate])

  if (!currentFile) {
    return null
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border px-4 py-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{currentFile}</h2>
        {isSaving && <span className="text-xs text-muted-foreground">Saving...</span>}
      </div>
      <ScrollArea className="flex-1">
        <EditorContent editor={editor} />
      </ScrollArea>
    </div>
  )
}

