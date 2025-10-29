import { create } from 'zustand'

interface NavState {
  currentPath: string
  setCurrentPath: (path: string) => void
  terminalVisible: boolean
  setTerminalVisible: (visible: boolean) => void
}

export const useNavStore = create<NavState>((set) => ({
  currentPath: '/',
  setCurrentPath: (path) => set({ currentPath: path }),
  terminalVisible: false,
  setTerminalVisible: (visible) => set({ terminalVisible: visible }),
}))

