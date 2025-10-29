'use client'

import { useState, useEffect, useRef } from 'react'
import { Editor } from '@tiptap/react'
import { cn } from '@/lib/utils'

interface BlockControlsProps {
  editor: Editor | null
}

export function BlockControls({ editor }: BlockControlsProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [currentBlockPos, setCurrentBlockPos] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hideTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!editor) return

    const updatePosition = () => {
      try {
        const { selection } = editor.state
        const { $from } = selection
        
        // Get the start position of the current block
        const blockStart = $from.start($from.depth)
        
        // Get coordinates at the start of the block
        const coords = editor.view.coordsAtPos(blockStart)
        const editorElement = editor.view.dom as HTMLElement
        const editorRect = editorElement.getBoundingClientRect()
        const scrollContainer = editorElement.closest('[data-radix-scroll-area-viewport]') as HTMLElement
        
        const scrollTop = scrollContainer?.scrollTop || window.scrollY
        
        setPosition({
          top: coords.top - editorRect.top + scrollTop - 2,
          left: -40,
        })
        setCurrentBlockPos(blockStart)
        setIsVisible(true)
        
        // Clear any pending hide timeout
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current)
        }
      } catch (error) {
        // Silently handle errors
      }
    }

    const handleSelectionUpdate = () => {
      updatePosition()
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!editor) return
      
      const editorElement = editor.view.dom as HTMLElement
      const editorRect = editorElement.getBoundingClientRect()
      const mouseX = event.clientX - editorRect.left
      const mouseY = event.clientY - editorRect.top
      
      // Show controls when mouse is near the left edge (within 60px) or when hovering over controls
      const isNearLeftEdge = mouseX >= -40 && mouseX <= 60
      
      if (isNearLeftEdge || containerRef.current?.contains(event.target as Node)) {
        // Find the block at this mouse position
        try {
          const pos = editor.view.posAtCoords({ 
            left: event.clientX, 
            top: event.clientY 
          })
          
          if (pos) {
            const $pos = editor.state.doc.resolve(pos.pos)
            const blockStart = $pos.start($pos.depth)
            
            // Only update if we're on a different block
            if (blockStart !== currentBlockPos) {
              const coords = editor.view.coordsAtPos(blockStart)
              const scrollContainer = editorElement.closest('[data-radix-scroll-area-viewport]') as HTMLElement
              const scrollTopVal = scrollContainer?.scrollTop || window.scrollY
              
              setPosition({
                top: coords.top - editorRect.top + scrollTopVal - 2,
                left: -40,
              })
              setCurrentBlockPos(blockStart)
              setIsVisible(true)
              
              if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current)
              }
            } else {
              setIsVisible(true)
            }
          }
        } catch (error) {
          // Silently handle errors
        }
      } else {
        // Hide after a delay when mouse leaves
        if (!showMenu && !containerRef.current?.contains(event.target as Node)) {
          hideTimeoutRef.current = setTimeout(() => {
            setIsVisible(false)
          }, 200)
        }
      }
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    // Show controls on selection
    editor.on('selectionUpdate', handleSelectionUpdate)
    
    const editorElement = editor.view.dom as HTMLElement
    const editorWrapper = editorElement.closest('.flex.flex-col') as HTMLElement || editorElement
    
    editorWrapper.addEventListener('mousemove', handleMouseMove)
    editorWrapper.addEventListener('mouseleave', () => {
      if (!showMenu) {
        hideTimeoutRef.current = setTimeout(() => {
          setIsVisible(false)
        }, 300)
      }
    })
    document.addEventListener('click', handleClickOutside)

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate)
      editorWrapper.removeEventListener('mousemove', handleMouseMove)
      editorWrapper.removeEventListener('mouseleave', () => {})
      document.removeEventListener('click', handleClickOutside)
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [editor, currentBlockPos, showMenu])

  if (!editor || !isVisible || !position) return null

  const handleDelete = () => {
    if (!editor) return
    
    // Select the entire block
    const { selection } = editor.state
    const { $from } = selection
    const blockStart = $from.start($from.depth)
    const blockEnd = $from.end($from.depth)
    
    editor.chain()
      .focus()
      .setTextSelection({ from: blockStart, to: blockEnd })
      .deleteSelection()
      .run()
    
    setShowMenu(false)
  }

  const handleTransform = (transformFn: () => void) => {
    if (!editor) return
    
    // Select the entire block first
    const { selection } = editor.state
    const { $from } = selection
    const blockStart = $from.start($from.depth)
    const blockEnd = $from.end($from.depth)
    
    editor.chain()
      .focus()
      .setTextSelection({ from: blockStart, to: blockEnd })
      .run()
    
    // Then apply transformation
    transformFn()
    setShowMenu(false)
  }

  return (
    <div
      ref={containerRef}
      className="absolute z-20 flex items-center gap-0.5 bg-background/95 backdrop-blur-sm rounded border border-border/50 shadow-sm"
      style={{ 
        top: `${position.top}px`, 
        left: `${position.left}px`,
        transform: 'translateY(-50%)'
      }}
      onMouseEnter={() => {
        setIsVisible(true)
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current)
        }
      }}
      onMouseLeave={() => {
        if (!showMenu) {
          hideTimeoutRef.current = setTimeout(() => {
            setIsVisible(false)
          }, 200)
        }
      }}
    >
      {/* Drag Handle (6 dots) */}
      <button
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-accent rounded"
        title="Drag to move"
        onMouseDown={(e) => {
          e.preventDefault()
          // TODO: Implement drag functionality with drag-drop
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="opacity-60">
          <circle cx="6" cy="4" r="1"/>
          <circle cx="10" cy="4" r="1"/>
          <circle cx="6" cy="8" r="1"/>
          <circle cx="10" cy="8" r="1"/>
          <circle cx="6" cy="12" r="1"/>
          <circle cx="10" cy="12" r="1"/>
        </svg>
      </button>

      {/* Menu Button (3 dots) */}
      <div className="relative">
        <button
          className="text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-accent rounded"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setShowMenu(!showMenu)
          }}
          title="More options"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="opacity-60">
            <circle cx="8" cy="4" r="1.5"/>
            <circle cx="8" cy="8" r="1.5"/>
            <circle cx="8" cy="12" r="1.5"/>
          </svg>
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <div className="absolute left-0 top-7 mt-1 w-52 bg-background border border-border rounded-md shadow-lg z-50 overflow-hidden">
            <div className="py-1">
              <button
                onClick={() => handleTransform(() => {
                  editor.chain().focus().clearNodes().toggleHeading({ level: 1 }).run()
                })}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                Turn into Heading 1
              </button>
              <button
                onClick={() => handleTransform(() => {
                  editor.chain().focus().clearNodes().toggleHeading({ level: 2 }).run()
                })}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                Turn into Heading 2
              </button>
              <button
                onClick={() => handleTransform(() => {
                  editor.chain().focus().clearNodes().toggleHeading({ level: 3 }).run()
                })}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                Turn into Heading 3
              </button>
              <button
                onClick={() => handleTransform(() => {
                  editor.chain().focus().clearNodes().toggleBulletList().run()
                })}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                Turn into Bullet List
              </button>
              <button
                onClick={() => handleTransform(() => {
                  editor.chain().focus().clearNodes().toggleOrderedList().run()
                })}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                Turn into Numbered List
              </button>
              <button
                onClick={() => handleTransform(() => {
                  editor.chain().focus().clearNodes().toggleBlockquote().run()
                })}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                Turn into Quote
              </button>
              <button
                onClick={() => handleTransform(() => {
                  editor.chain().focus().clearNodes().toggleCodeBlock().run()
                })}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                Turn into Code Block
              </button>
              <button
                onClick={() => handleTransform(() => {
                  editor.chain().focus().clearNodes().toggleTaskList().run()
                })}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                Turn into Task List
              </button>
              <button
                onClick={() => {
                  editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
                  setShowMenu(false)
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                Insert Table
              </button>
              <div className="border-t border-border my-1" />
              <button
                onClick={() => {
                  const url = window.prompt('Enter image URL or paste base64:')
                  if (url) {
                    editor.chain().focus().setImage({ src: url }).run()
                  }
                  setShowMenu(false)
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                Insert Image
              </button>
              <button
                onClick={() => {
                  const url = window.prompt('Enter URL:')
                  if (url) {
                    editor.chain().focus().setLink({ href: url }).run()
                  }
                  setShowMenu(false)
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                Add Link
              </button>
              <div className="border-t border-border my-1" />
              <button
                onClick={handleDelete}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent text-destructive transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

