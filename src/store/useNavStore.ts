import { create } from 'zustand'

interface NavState {
  currentPath: string
  setCurrentPath: (path: string) => void
  terminalVisible: boolean
  setTerminalVisible: (visible: boolean) => void
  aiPanelVisible: boolean
  setAIPanelVisible: (visible: boolean) => void
}

export const useNavStore = create<NavState>((set) => ({
  currentPath: '/',
  setCurrentPath: (path) => set({ currentPath: path }),
  terminalVisible: true, // Visible by default
  setTerminalVisible: (visible) => set({ terminalVisible: visible }),
  aiPanelVisible: false, // Hidden by default
  setAIPanelVisible: (visible) => set({ aiPanelVisible: visible }),
}))

