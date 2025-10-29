import { create } from 'zustand'

interface NavState {
  currentPath: string
  setCurrentPath: (path: string) => void
  aiPanelVisible: boolean
  setAIPanelVisible: (visible: boolean) => void
  sidebarVisible: boolean
  setSidebarVisible: (visible: boolean) => void
}

export const useNavStore = create<NavState>((set) => ({
  currentPath: '', // Start at root vault
  setCurrentPath: (path) => set({ currentPath: path }),
  aiPanelVisible: false, // Hidden by default
  setAIPanelVisible: (visible) => set({ aiPanelVisible: visible }),
  sidebarVisible: true, // Visible by default
  setSidebarVisible: (visible) => set({ sidebarVisible: visible }),
}))

