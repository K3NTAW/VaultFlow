'use client'

import { useState, useEffect, useRef } from 'react'
import { useNavStore } from '@/store/useNavStore'
import { useVaultStore } from '@/store/useVaultStore'
import { parseCommand } from '@/lib/navParser'
import { Input } from './ui/input'
import { cn } from '@/lib/utils'

export function TerminalNav() {
  const { terminalVisible, setTerminalVisible } = useNavStore()
  const { vaultPath } = useVaultStore()
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [lastOutput, setLastOutput] = useState<string | null>(null)
  const [lastError, setLastError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault()
        setTerminalVisible(!terminalVisible)
        // Focus input when opening
        if (!terminalVisible && inputRef.current) {
          setTimeout(() => inputRef.current?.focus(), 0)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [terminalVisible, setTerminalVisible])

  useEffect(() => {
    if (terminalVisible && inputRef.current) {
      inputRef.current.focus()
    }
  }, [terminalVisible])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !vaultPath) return

    const command = input.trim()
    setHistory((prev) => [...prev, command])
    setHistoryIndex(-1)
    setInput('')

    try {
      const result = await parseCommand(command, vaultPath)
      // Show output below input
      setLastOutput(result.output)
      setLastError(result.error || false)
      
      // Clear output after 5 seconds for successful commands
      if (!result.error && result.output) {
        setTimeout(() => {
          setLastOutput(null)
        }, 5000)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setLastOutput(`Error: ${errorMsg}`)
      setLastError(true)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length > 0) {
        const newIndex =
          historyIndex === -1
            ? history.length - 1
            : Math.max(0, historyIndex - 1)
        setHistoryIndex(newIndex)
        setInput(history[newIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex >= 0) {
        const newIndex = historyIndex + 1
        if (newIndex >= history.length) {
          setHistoryIndex(-1)
          setInput('')
        } else {
          setHistoryIndex(newIndex)
          setInput(history[newIndex])
        }
      }
    } else if (e.key === 'Escape') {
      setTerminalVisible(false)
    }
  }

  if (!terminalVisible) {
    return null
  }

  return (
    <div className="border-b border-border bg-muted/30">
      <div className="h-10 flex items-center px-4">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full">
          <span className="text-muted-foreground font-mono text-sm">$</span>
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ls, cd folder, mkdir foldername, touch filename, open file.md (Ctrl+` to toggle)"
            className="flex-1 font-mono text-sm h-8 bg-background"
            autoFocus
          />
        </form>
      </div>
      {lastOutput && (
        <div className={cn(
          "px-4 py-2 text-xs font-mono border-t border-border",
          lastError ? "text-destructive bg-destructive/10" : "text-muted-foreground bg-muted/50"
        )}>
          {lastOutput}
        </div>
      )}
    </div>
  )
}

