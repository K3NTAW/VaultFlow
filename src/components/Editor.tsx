'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { TextAlign } from '@tiptap/extension-text-align'
import { Subscript } from '@tiptap/extension-subscript'
import { Superscript } from '@tiptap/extension-superscript'
import { CharacterCount } from '@tiptap/extension-character-count'
import { useVaultStore } from '@/store/useVaultStore'
import { readFile, writeFileToVault } from '@/lib/vault'
import { ScrollArea } from './ui/scroll-area'
import { SlashMenu } from './SlashMenu'
import { BlockControls } from './BlockControls'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import { marked } from 'marked'
import TurndownService from 'turndown'

export function Editor() {
  const { vaultPath, currentFile } = useVaultStore()
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashMenuPosition, setSlashMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const [slashQuery, setSlashQuery] = useState('')
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const [slashIndex, setSlashIndex] = useState(-1)
  const slashMenuOpenRef = useRef(false)
  const editorInstanceRef = useRef<any>(null)
  const turndownService = useState(() => new TurndownService())[0]

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-md',
        },
      }),
      Underline,
      Placeholder.configure({
        placeholder: 'Start writing or type / for commands...',
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'list-none pl-0',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'flex items-start gap-2',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse border border-border',
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: 'bg-muted font-semibold',
        },
      }),
      TableCell,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Subscript,
      Superscript,
      CharacterCount,
    ],
    content: '<p></p>',
    editable: true,
    autofocus: false,
    immediatelyRender: false, // Fix SSR warning
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] p-8',
      },
      handleKeyDown: (view, event) => {
        // Intercept Enter key when slash menu is open
        if (slashMenuOpenRef.current && event.key === 'Enter') {
          event.preventDefault()
          event.stopPropagation()
          return true
        }
        // Cmd/Ctrl + K for links
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
          event.preventDefault()
          const url = window.prompt('Enter URL:')
          if (url && editorInstanceRef.current) {
            editorInstanceRef.current.chain().focus().setLink({ href: url }).run()
          }
          return true
        }
        return false
      },
    },
  })

  // Store editor reference for key handlers
  useEffect(() => {
    if (editor) {
      editorInstanceRef.current = editor
    }
  }, [editor])

  // Load file content
  useEffect(() => {
    if (!editor || !vaultPath || !currentFile) {
      setIsLoading(false)
      return
    }

    const loadFile = async () => {
      setIsLoading(true)
      try {
        const markdownContent = await readFile(vaultPath, currentFile)
        console.log('✓ Loaded markdown content:', markdownContent.substring(0, 100))
        
        // Configure marked options
        marked.setOptions({ breaks: true, gfm: true })
        
        // Convert markdown to HTML for Tiptap
        let htmlContent: string
        try {
          htmlContent = marked.parse(markdownContent) as string
          console.log('✓ Converted to HTML:', htmlContent.substring(0, 200))
        } catch (parseError) {
          console.error('✗ Markdown parse error:', parseError)
          htmlContent = '<p>Error parsing markdown</p>'
        }
        
        // Wait a tiny bit to ensure editor is ready
        await new Promise(resolve => setTimeout(resolve, 50))
        
        // Clear editor and set new content
        editor.commands.clearContent()
        editor.commands.setContent(htmlContent)
        console.log('✓ Editor content set')
      } catch (error) {
        console.error('✗ Error loading file:', error)
        // Create empty markdown heading
        const defaultMd = `# ${currentFile.replace('.md', '')}\n\nStart writing...`
        marked.setOptions({ breaks: true, gfm: true })
        const defaultContent = marked.parse(defaultMd) as string
        editor.commands.clearContent()
        editor.commands.setContent(defaultContent)
      } finally {
        setIsLoading(false)
      }
    }

    loadFile()
  }, [editor, vaultPath, currentFile])

  // Handle slash command detection
  useEffect(() => {
    if (!editor) return

    const handleUpdate = () => {
      const { selection } = editor.state
      const { $from } = selection
      
      // Get the text before cursor in current node
      const node = $from.parent
      const textBeforeCursor = node.textContent.substring(0, $from.parentOffset)
      const isStartOfLine = $from.parentOffset === 0 || 
        (node.textContent.length > 0 && $from.parentOffset <= 1)
      
      // Check if we're at start and just typed "/" or have "/" at start
      if (textBeforeCursor === '/' && isStartOfLine && 
          (node.type.name === 'paragraph' || node.type.name === 'heading')) {
        // Show slash menu
        setTimeout(() => {
          const coords = editor.view.coordsAtPos($from.pos)
          setSlashMenuPosition({
            top: coords.top,
            left: coords.left,
          })
          setShowSlashMenu(true)
          slashMenuOpenRef.current = true
          setSlashQuery('')
        }, 10)
      } else if (textBeforeCursor.startsWith('/') && 
                 (node.type.name === 'paragraph' || node.type.name === 'heading') &&
                 showSlashMenu) {
        // Update query if we're still in slash mode
        const query = textBeforeCursor.substring(1)
        setSlashQuery(query)
        
        // Update position
        const coords = editor.view.coordsAtPos($from.pos)
        setSlashMenuPosition({
          top: coords.top,
          left: coords.left,
        })
      } else if (!textBeforeCursor.startsWith('/') && showSlashMenu) {
        // Hide menu if we're no longer in slash mode
        setShowSlashMenu(false)
        slashMenuOpenRef.current = false
        setSlashMenuPosition(null)
      }
    }

    editor.on('update', handleUpdate)
    editor.on('selectionUpdate', handleUpdate)
    return () => {
      editor.off('update', handleUpdate)
      editor.off('selectionUpdate', handleUpdate)
    }
  }, [editor, showSlashMenu])

  // Auto-save on content change (debounced)
  useEffect(() => {
    if (!editor || !vaultPath || !currentFile || isLoading) return

    let timeoutId: NodeJS.Timeout

    const handleUpdate = async () => {
      if (isSaving) return

      clearTimeout(timeoutId)
      timeoutId = setTimeout(async () => {
        setIsSaving(true)
        try {
          const htmlContent = editor.getHTML()
          console.log('Saving HTML:', htmlContent.substring(0, 100))
          
          // Convert HTML back to markdown for saving
          const markdownContent = turndownService.turndown(htmlContent)
          console.log('Saving markdown:', markdownContent.substring(0, 100))
          
          await writeFileToVault(vaultPath, currentFile, markdownContent)
        } catch (error) {
          console.error('Error saving file:', error)
        } finally {
          setIsSaving(false)
        }
      }, 1000) // 1 second debounce
    }

    editor.on('update', handleUpdate)
    return () => {
      clearTimeout(timeoutId)
      editor.off('update', handleUpdate)
    }
  }, [editor, vaultPath, currentFile, isSaving, isLoading, turndownService])

  if (!currentFile) {
    return null
  }

  if (!editor) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Loading editor...</p>
      </div>
    )
  }

  return (
    <>
      <div ref={editorContainerRef} className="h-full flex flex-col relative">
        <div className="border-b border-border px-4 py-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{currentFile}</h2>
          <div className="flex items-center gap-4">
            {editor && (
              <span className="text-xs text-muted-foreground">
                {editor.storage.characterCount.characters()} chars / {editor.storage.characterCount.words()} words
              </span>
            )}
            {isLoading && <span className="text-xs text-muted-foreground">Loading...</span>}
            {isSaving && <span className="text-xs text-muted-foreground">Saving...</span>}
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="relative">
            <EditorContent editor={editor} className="h-full" />
            <BlockControls editor={editor} />
            
            {/* Bubble Menu - Shows when text is selected */}
            {editor && (
              <BubbleMenu
                editor={editor}
                className="flex items-center gap-1 bg-background border border-border rounded-md shadow-lg p-1"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={cn('h-8 w-8 p-0', editor.isActive('bold') && 'bg-accent')}
                  title="Bold"
                >
                  <span className="font-bold text-xs">B</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={cn('h-8 w-8 p-0', editor.isActive('italic') && 'bg-accent')}
                  title="Italic"
                >
                  <span className="italic text-xs">I</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                  className={cn('h-8 w-8 p-0', editor.isActive('underline') && 'bg-accent')}
                  title="Underline"
                >
                  <span className="underline text-xs">U</span>
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                  className={cn('h-8 w-8 p-0', editor.isActive('strike') && 'bg-accent')}
                  title="Strikethrough"
                >
                  <span className="line-through text-xs">S</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleCode().run()}
                  className={cn('h-8 w-8 p-0 font-mono text-xs', editor.isActive('code') && 'bg-accent')}
                  title="Code"
                >
                  {'</>'}
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleSubscript().run()}
                  className={cn('h-8 w-8 p-0 text-xs', editor.isActive('subscript') && 'bg-accent')}
                  title="Subscript"
                >
                  x<sub className="text-[0.6em]">2</sub>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleSuperscript().run()}
                  className={cn('h-8 w-8 p-0 text-xs', editor.isActive('superscript') && 'bg-accent')}
                  title="Superscript"
                >
                  x<sup className="text-[0.6em]">2</sup>
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const url = window.prompt('Enter URL:')
                    if (url) {
                      editor.chain().focus().setLink({ href: url }).run()
                    }
                  }}
                  className={cn('h-8 w-8 p-0', editor.isActive('link') && 'bg-accent')}
                  title="Link"
                >
                  🔗
                </Button>
              </BubbleMenu>
            )}
          </div>
        </ScrollArea>
      </div>
      {showSlashMenu && (
        <SlashMenu
          editor={editor}
          onClose={() => {
            setShowSlashMenu(false)
            slashMenuOpenRef.current = false
            setSlashMenuPosition(null)
          }}
          position={slashMenuPosition}
          query={slashQuery}
        />
      )}
    </>
  )
}

