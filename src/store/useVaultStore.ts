import { create } from 'zustand'

interface VaultState {
  vaultPath: string | null
  setVaultPath: (path: string | null) => void
  currentFile: string | null
  setCurrentFile: (file: string | null) => void
  refreshTrigger: number
  refresh: () => void
}

export const useVaultStore = create<VaultState>((set) => ({
  vaultPath: null,
  setVaultPath: (path) => set({ vaultPath: path }),
  currentFile: null,
  setCurrentFile: (file) => set({ currentFile: file }),
  refreshTrigger: 0,
  refresh: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),
}))

