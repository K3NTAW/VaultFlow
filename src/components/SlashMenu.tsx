'use client'

import { useEffect, useState, useCallback } from 'react'
import { Editor } from '@tiptap/react'
import { cn } from '@/lib/utils'

interface SlashCommand {
  title: string
  description: string
  icon?: string
  command: (editor: Editor) => void
}

const slashCommands: SlashCommand[] = [
  {
    title: 'Heading 1',
    description: 'Big section heading',
    icon: 'H1',
    command: (editor) => editor.chain().focus().clearNodes().toggleHeading({ level: 1 }).run(),
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: 'H2',
    command: (editor) => editor.chain().focus().clearNodes().toggleHeading({ level: 2 }).run(),
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    icon: 'H3',
    command: (editor) => editor.chain().focus().clearNodes().toggleHeading({ level: 3 }).run(),
  },
  {
    title: 'Bullet List',
    description: 'Create a bulleted list',
    icon: '•',
    command: (editor) => editor.chain().focus().clearNodes().toggleBulletList().run(),
  },
  {
    title: 'Numbered List',
    description: 'Create a numbered list',
    icon: '1.',
    command: (editor) => editor.chain().focus().clearNodes().toggleOrderedList().run(),
  },
  {
    title: 'Quote',
    description: 'Create a quote block',
    icon: '"',
    command: (editor) => editor.chain().focus().clearNodes().toggleBlockquote().run(),
  },
  {
    title: 'Code Block',
    description: 'Create a code block',
    icon: '{ }',
    command: (editor) => editor.chain().focus().clearNodes().toggleCodeBlock().run(),
  },
  {
    title: 'Task List',
    description: 'Create a to-do list with checkboxes',
    icon: '☑',
    command: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    title: 'Table',
    description: 'Insert a table',
    icon: '⊞',
    command: (editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    title: 'Image',
    description: 'Insert an image',
    icon: '🖼',
    command: (editor) => {
      const url = window.prompt('Enter image URL or paste base64:')
      if (url) {
        editor.chain().focus().setImage({ src: url }).run()
      }
    },
  },
  {
    title: 'Link',
    description: 'Add a link',
    icon: '🔗',
    command: (editor) => {
      const url = window.prompt('Enter URL:')
      if (url) {
        editor.chain().focus().setLink({ href: url }).run()
      }
    },
  },
  {
    title: 'Divider',
    description: 'Insert a horizontal divider',
    icon: '─',
    command: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
]

interface SlashMenuProps {
  editor: Editor | null
  onClose: () => void
  position: { top: number; left: number } | null
  query?: string
}

export function SlashMenu({ editor, onClose, position, query = '' }: SlashMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const filteredCommands = query
    ? slashCommands.filter((cmd) =>
        cmd.title.toLowerCase().includes(query.toLowerCase()) ||
        cmd.description.toLowerCase().includes(query.toLowerCase())
      )
    : slashCommands

  const handleSelect = useCallback((command?: SlashCommand) => {
    if (!editor) return

    const cmd = command || filteredCommands[selectedIndex]
    if (!cmd) return

    // Delete the "/" and any query text
    const { from } = editor.state.selection
    const deleteFrom = Math.max(0, from - 1 - query.length)
    const tr = editor.state.tr
    if (deleteFrom < from) {
      tr.delete(deleteFrom, from)
      editor.view.dispatch(tr)
    }

    // Execute the command
    setTimeout(() => {
      cmd.command(editor)
    }, 10)
    
    onClose()
  }, [editor, selectedIndex, filteredCommands, query, onClose])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!editor) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        handleSelect(undefined)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editor, filteredCommands.length, selectedIndex, handleSelect, onClose])

  // Reset selected index when filtered results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [query, filteredCommands.length])

  if (!position || !editor) return null

  return (
    <div
      className="fixed z-50 bg-background border border-border rounded-lg shadow-lg overflow-hidden min-w-[280px] max-w-[320px]"
      style={{ top: position.top, left: position.left }}
    >
      <div className="max-h-[300px] overflow-y-auto">
        {filteredCommands.length === 0 ? (
          <div className="px-4 py-3 text-sm text-muted-foreground">No commands found</div>
        ) : (
          filteredCommands.map((command, index) => (
            <button
              key={command.title}
              onClick={() => handleSelect(command)}
              className={cn(
                'w-full px-4 py-2 text-left flex items-start gap-3 hover:bg-accent transition-colors',
                index === selectedIndex && 'bg-accent'
              )}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded bg-muted flex items-center justify-center text-xs font-semibold mt-0.5">
                {command.icon || command.title[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{command.title}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {command.description}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

