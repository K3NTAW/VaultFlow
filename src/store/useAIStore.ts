import { create } from 'zustand'

interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: string[]
  timestamp: Date
}

interface AIState {
  messages: AIMessage[]
  addMessage: (message: Omit<AIMessage, 'id' | 'timestamp'>) => void
  clearMessages: () => void
  isProcessing: boolean
  setIsProcessing: (processing: boolean) => void
}

export const useAIStore = create<AIState>((set) => ({
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
}))

