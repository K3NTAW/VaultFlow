import { create } from 'zustand'

interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: string[]
  timestamp: Date
}

interface ConversationContext {
  role: 'user' | 'assistant'
  content: string
}

interface AIState {
  messages: AIMessage[]
  addMessage: (message: Omit<AIMessage, 'id' | 'timestamp'>) => void
  clearMessages: () => void
  isProcessing: boolean
  setIsProcessing: (processing: boolean) => void
  getConversationContext: (maxMessages?: number) => ConversationContext[]
}

export const useAIStore = create<AIState>((set, get) => ({
  messages: [],
  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: Date.now().toString(),
          timestamp: new Date(),
        },
      ],
    })),
  clearMessages: () => set({ messages: [] }),
  isProcessing: false,
  setIsProcessing: (processing) => set({ isProcessing: processing }),
  getConversationContext: (maxMessages = 6) => {
    const state = get()
    const recentMessages = state.messages.slice(-maxMessages)
    return recentMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  },
}))

