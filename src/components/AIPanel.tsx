'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useVaultStore } from '@/store/useVaultStore'
import { useNavStore } from '@/store/useNavStore'
import { queryVault, initializeAI, initializeLocalAI, setAIMode, type AIMode, getModelLoadingProgress, isModelBeingLoaded, setHuggingFaceToken } from '@/lib/ai'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

type LocalMessage = { id: string; role: 'user' | 'assistant'; content: string; citations?: string[] }

export function AIPanel() {
  const { setAIPanelVisible } = useNavStore()
  const { vaultPath } = useVaultStore()
  const [query, setQuery] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [mode, setMode] = useState<AIMode>('local')
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [modelLoading, setModelLoading] = useState(false)
  const [modelProgress, setModelProgress] = useState(0)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const savedKey = localStorage.getItem('openai_api_key')
    const savedMode = (localStorage.getItem('ai_mode') || 'local') as AIMode
    setMode(savedMode)
    setAIMode(savedMode)
    
    if (savedMode === 'local') {
      initializeLocalAI()
    } else if (savedKey) {
      setApiKey(savedKey)
      initializeAI(savedKey, 'openai')
    }
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isProcessing])

  // Monitor model loading progress
  useEffect(() => {
    if (mode === 'local') {
      const interval = setInterval(() => {
        setModelLoading(isModelBeingLoaded())
        setModelProgress(getModelLoadingProgress())
      }, 100)
      return () => clearInterval(interval)
    }
  }, [mode])

  const handleModeChange = (newMode: AIMode) => {
    setMode(newMode)
    setAIMode(newMode)
    localStorage.setItem('ai_mode', newMode)
    
    if (newMode === 'local') {
      initializeLocalAI()
    } else if (apiKey) {
      initializeAI(apiKey, 'openai')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || !vaultPath) return

    // Always use local mode - initialize if not already done
    try {
      initializeLocalAI()
    } catch {
      // Errors handled below
    }

    const userQuery = query.trim()
    setQuery('')
    const currentId = `${Date.now()}-u`
    setMessages((prev) => [...prev, { id: currentId, role: 'user', content: userQuery }])

    setIsProcessing(true)
    try {
      const result = await queryVault(vaultPath, userQuery)
      const msgId = `${Date.now()}-a`
      setMessages((prev) => [...prev, { id: msgId, role: 'assistant', content: result.answer, citations: result.citations }])
    } catch (error) {
      const msgId = `${Date.now()}-e`
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setMessages((prev) => [...prev, { id: msgId, role: 'assistant', content: `Error: ${errorMsg}` }])
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

  const currentMessages = messages
  const clearCurrent = () => setMessages([])

  return (
    <motion.aside
      className="flex flex-col h-screen w-[440px] min-w-[380px] max-w-[500px] bg-[#fafafa] dark:bg-[#191919] border-l border-[#e4e4e4] dark:border-[#2a2a2a]"
      initial={{ opacity: 0.98 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      {/* Top border for separation */}
      <div className="px-4 py-3 border-b border-[#e2e3e4] dark:border-[#2a2a2a]">
        <span className="font-semibold text-[#2f3437] dark:text-[#e4e4e4] text-[14px] leading-[15px]">AI (Local)</span>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 notion-scroll">
        <AnimatePresence initial={false}>
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            {currentMessages.length === 0 && (
              <div className="text-sm text-[#6b6b6b] dark:text-[#a0a0a0]">
                <p>Ask questions about your vault content.</p>
                <p className="mt-2">
                  {mode === 'local' 
                    ? 'Using local AI models - everything runs in your browser with no external APIs.'
                    : 'Using OpenAI for text generation.'}
                </p>
                {mode === 'local' && (
                  <p className="mt-2 text-xs text-[#999]">
                    If you see authentication errors, get a free HuggingFace token at{' '}
                    <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="underline">
                      huggingface.co/settings/tokens
                    </a>
                    {' '}and we can add it.
                  </p>
                )}
                {mode === 'local' && modelLoading && (
                  <div className="mt-4 p-3 bg-[#f0f0f0] dark:bg-[#1f1f1f] rounded-lg">
                    <p className="text-xs mb-2">Loading AI model...</p>
                    <div className="w-full bg-[#e2e3e4] dark:bg-[#2a2a2a] rounded-full h-2">
                      <div 
                        className="bg-[#2f3437] dark:bg-[#d1d1d1] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${modelProgress}%` }}
                      />
                    </div>
                    <p className="text-xs mt-2 text-[#999]">
                      {modelProgress < 50 ? 'Loading embedding model...' : 'Loading text generation model...'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {currentMessages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
              >
                <div className="max-w-[90%]">
                  <div
                    className={
                      message.role === 'user'
                        ? 'bg-[#e2e3e4] dark:bg-[#2c2c2c] px-3 py-2 rounded-lg ml-auto text-[14px] leading-[15px]'
                        : 'bg-[#f0f0f0] dark:bg-[#1f1f1f] px-3 py-2 rounded-lg text-[14px] leading-[15px]'
                    }
                  >
                    {message.content}
                  </div>
                  {message.role === 'assistant' && renderCitations(message.citations)}
                </div>
              </motion.div>
            ))}

            {isProcessing && (
              <div className="text-sm text-[#6b6b6b] dark:text-[#a0a0a0]">
                <div className="flex items-center gap-2">
                  <div className="animate-spin">⏳</div>
                  <span>Processing...</span>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Input Bar */}
      <div className="sticky bottom-0 bg-[#fafafa] dark:bg-[#191919] border-t border-[#e2e3e4] dark:border-[#2a2a2a] px-3 py-2">
        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2"
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              const el = inputRef.current
              if (el) {
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 120) + 'px'
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (query.trim()) {
                  handleSubmit(e as unknown as React.FormEvent)
                }
              }
            }}
            placeholder={'Chat with Agent…'}
            disabled={isProcessing || !vaultPath}
            className="w-full bg-transparent focus:outline-none placeholder:text-[#999] text-sm px-2 py-1 text-[#2f3437] dark:text-[#d1d1d1] resize-none"
          />
          <button
            type="submit"
            disabled={isProcessing || !query.trim() || !vaultPath}
            className="p-1.5 rounded-md text-[#6b6b6b] dark:text-[#a0a0a0] hover:bg-[#ebeced] dark:hover:bg-[#202020] disabled:opacity-50"
            aria-label="Send"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M5 12l14-7-4 7 4 7-14-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setAIPanelVisible(false)}
            className="p-1.5 rounded-md text-[#6b6b6b] dark:text-[#a0a0a0] hover:bg-[#ebeced] dark:hover:bg-[#202020]"
            aria-label="Close"
          >
            ×
          </button>
        </form>
        {currentMessages.length > 0 && (
          <div className="mt-2">
            <button
              onClick={clearCurrent}
              className="text-xs text-[#6b6b6b] dark:text-[#a0a0a0] hover:text-black dark:hover:text-white transition-colors"
            >
              Clear Conversation
            </button>
          </div>
        )}
      </div>
    </motion.aside>
  )
}

