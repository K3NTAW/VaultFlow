'use client'

import { Editor } from '@tiptap/react'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'

interface EditorToolbarProps {
  editor: Editor | null
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) {
    return null
  }

  return (
    <div className="flex items-center gap-1 px-2 py-2 border-b border-border bg-muted/30">
      <div className="flex items-center gap-1">
        {/* Headings */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('heading', { level: 1 }) && 'bg-accent'
          )}
          title="Heading 1"
        >
          H1
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('heading', { level: 2 }) && 'bg-accent'
          )}
          title="Heading 2"
        >
          H2
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('heading', { level: 3 }) && 'bg-accent'
          )}
          title="Heading 3"
        >
          H3
        </Button>
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      <div className="flex items-center gap-1">
        {/* Text formatting */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={cn(
            'h-8 w-8 p-0 font-bold',
            editor.isActive('bold') && 'bg-accent'
          )}
          title="Bold (Cmd+B)"
        >
          B
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={cn(
            'h-8 w-8 p-0 italic',
            editor.isActive('italic') && 'bg-accent'
          )}
          title="Italic (Cmd+I)"
        >
          I
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          className={cn(
            'h-8 w-8 p-0 line-through',
            editor.isActive('strike') && 'bg-accent'
          )}
          title="Strikethrough"
        >
          S
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleCode().run()}
          disabled={!editor.can().chain().focus().toggleCode().run()}
          className={cn(
            'h-8 w-8 p-0 font-mono text-xs',
            editor.isActive('code') && 'bg-accent'
          )}
          title="Code"
        >
          {'</>'}
        </Button>
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      <div className="flex items-center gap-1">
        {/* Lists */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('bulletList') && 'bg-accent'
          )}
          title="Bullet List"
        >
          •
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('orderedList') && 'bg-accent'
          )}
          title="Numbered List"
        >
          1.
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('blockquote') && 'bg-accent'
          )}
          title="Quote"
        >
          "
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={cn(
            'h-8 w-8 p-0 font-mono text-xs',
            editor.isActive('codeBlock') && 'bg-accent'
          )}
          title="Code Block"
        >
          {'{}'}
        </Button>
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      <div className="flex items-center gap-1">
        {/* Other */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="h-8 w-8 p-0"
          title="Horizontal Rule"
        >
          ─
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="h-8 w-8 p-0"
          title="Undo (Cmd+Z)"
        >
          ↶
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="h-8 w-8 p-0"
          title="Redo (Cmd+Shift+Z)"
        >
          ↷
        </Button>
      </div>
    </div>
  )
}

