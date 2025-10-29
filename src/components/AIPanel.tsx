'use client'

import { useState, useEffect } from 'react'
import { useAIStore } from '@/store/useAIStore'
import { useVaultStore } from '@/store/useVaultStore'
import { useNavStore } from '@/store/useNavStore'
import { queryVault, initializeAI } from '@/lib/ai'
import { ScrollArea } from './ui/scroll-area'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Separator } from './ui/separator'

export function AIPanel() {
  const { setAIPanelVisible } = useNavStore()
  const { vaultPath } = useVaultStore()
  const { messages, addMessage, clearMessages, isProcessing, setIsProcessing } = useAIStore()
  const [query, setQuery] = useState('')
  const [apiKey, setApiKey] = useState('')

  useEffect(() => {
    const savedKey = localStorage.getItem('openai_api_key')
    if (savedKey) {
      setApiKey(savedKey)
      initializeAI(savedKey)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || !vaultPath) return

    if (!apiKey) {
      const key = prompt('Enter your OpenAI API key:')
      if (!key) return
      setApiKey(key)
      localStorage.setItem('openai_api_key', key)
      initializeAI(key)
    }

    const userQuery = query.trim()
    setQuery('')
    addMessage({ role: 'user', content: userQuery })

    setIsProcessing(true)
    try {
      const result = await queryVault(vaultPath, userQuery)
      addMessage({
        role: 'assistant',
        content: result.answer,
        citations: result.citations,
      })
    } catch (error) {
      addMessage({
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const renderCitations = (citations?: string[]) => {
    if (!citations || citations.length === 0) return null
    return (
      <div className="mt-2 text-xs text-muted-foreground">
        <div className="font-semibold mb-1">Sources:</div>
        <ul className="list-disc list-inside space-y-1">
          {citations.map((citation, idx) => (
            <li key={idx}>{citation}</li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="w-80 border-l border-border flex flex-col bg-background">
      <div className="h-12 border-b border-border flex items-center justify-between px-4">
        <h2 className="text-sm font-semibold">AI Assistant</h2>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearMessages}
              className="text-xs"
            >
              Clear
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAIPanelVisible(false)}
            className="text-xs"
          >
            ×
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-sm text-muted-foreground">
              <p>Ask questions about your vault content.</p>
              <p className="mt-2">The AI will search through your notes and provide contextual answers.</p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`space-y-2 ${
                message.role === 'user' ? 'text-right' : 'text-left'
              }`}
            >
              <div
                className={`inline-block rounded-lg px-3 py-2 text-sm ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {message.content}
              </div>
              {message.role === 'assistant' && renderCitations(message.citations)}
            </div>
          ))}

          {isProcessing && (
            <div className="text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="animate-spin">⏳</div>
                <span>Processing...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <Separator />
      <form onSubmit={handleSubmit} className="p-4">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about your notes..."
            disabled={isProcessing || !vaultPath}
            className="flex-1"
          />
          <Button type="submit" disabled={isProcessing || !query.trim() || !vaultPath}>
            Send
          </Button>
        </div>
      </form>
    </div>
  )
}

