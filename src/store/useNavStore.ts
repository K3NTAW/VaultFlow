import { create } from 'zustand'

interface NavState {
  currentPath: string
  setCurrentPath: (path: string) => void
  aiPanelVisible: boolean
  setAIPanelVisible: (visible: boolean) => void
}

export const useNavStore = create<NavState>((set) => ({
  currentPath: '/',
  setCurrentPath: (path) => set({ currentPath: path }),
  aiPanelVisible: false, // Hidden by default
  setAIPanelVisible: (visible) => set({ aiPanelVisible: visible }),
}))

