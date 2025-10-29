'use client'

import { useState, useEffect, useRef } from 'react'
import { useNavStore } from '@/store/useNavStore'
import { useVaultStore } from '@/store/useVaultStore'
import { parseCommand } from '@/lib/navParser'
import { Input } from './ui/input'
import { Separator } from './ui/separator'
import { ScrollArea } from './ui/scroll-area'
import { cn } from '@/lib/utils'

interface TerminalOutput {
  input: string
  output: string
  error?: boolean
  timestamp: Date
}

export function TerminalNav() {
  const { terminalVisible, setTerminalVisible } = useNavStore()
  const { vaultPath } = useVaultStore()
  const [input, setInput] = useState('')
  const [outputs, setOutputs] = useState<TerminalOutput[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault()
        setTerminalVisible(!terminalVisible)
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [outputs])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !vaultPath) return

    const command = input.trim()
    setHistory((prev) => [...prev, command])
    setHistoryIndex(-1)
    setInput('')

    try {
      const result = await parseCommand(command, vaultPath)
      setOutputs((prev) => [
        ...prev,
        {
          input: command,
          output: result.output,
          error: result.error,
          timestamp: new Date(),
        },
      ])
    } catch (error) {
      setOutputs((prev) => [
        ...prev,
        {
          input: command,
          output: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error: true,
          timestamp: new Date(),
        },
      ])
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
    }
  }

  if (!terminalVisible) {
    return null
  }

  return (
    <div className="h-64 border-b border-border flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <h3 className="text-sm font-semibold">Terminal</h3>
        <button
          onClick={() => setTerminalVisible(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Close (Ctrl+`)
        </button>
      </div>
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-2 font-mono text-sm">
          {outputs.length === 0 && (
            <div className="text-muted-foreground">
              Type commands like `ls`, `cd folder`, `open file.md`. Press Ctrl+` to toggle.
            </div>
          )}
          {outputs.map((output, index) => (
            <div key={index} className="space-y-1">
              <div className="text-muted-foreground">
                $ <span className="text-foreground">{output.input}</span>
              </div>
              {output.output && (
                <div
                  className={cn(
                    'whitespace-pre-wrap',
                    output.error ? 'text-destructive' : 'text-foreground'
                  )}
                >
                  {output.output}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      <Separator />
      <form onSubmit={handleSubmit} className="px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-mono text-sm">$</span>
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter command..."
            className="flex-1 font-mono text-sm border-0 focus-visible:ring-0 bg-transparent"
          />
        </div>
      </form>
    </div>
  )
}

