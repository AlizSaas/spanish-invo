import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Language } from '@/lib/constants'

interface UiState {
  /** App-shell language. Defaults to Spanish; synced from settings.locale once signed in. */
  locale: Language
  setLocale: (locale: Language) => void
  /** Collapsed state of the desktop sidebar */
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  /** Set once persisted state has been read on the client (avoids SSR hydration mismatch) */
  hydrated: boolean
  setHydrated: () => void
  /** AI assistant: closed, side panel, or full-width */
  assistantOpen: boolean
  assistantMode: 'panel' | 'full'
  openAssistant: (mode?: 'panel' | 'full') => void
  closeAssistant: () => void
  toggleAssistant: () => void
  setAssistantMode: (mode: 'panel' | 'full') => void
  /** Free-plan limit hit: which upgrade dialog is open (not persisted) */
  upgradeReason: UpgradeReason | null
  openUpgrade: (reason: UpgradeReason) => void
  closeUpgrade: () => void
}

export type UpgradeReason = 'documents' | 'ai'

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      locale: 'es',
      setLocale: (locale) => set({ locale }),
      sidebarCollapsed: false,
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      assistantOpen: false,
      assistantMode: 'panel',
      openAssistant: (mode) =>
        set((s) => ({
          assistantOpen: true,
          assistantMode: mode ?? s.assistantMode,
        })),
      closeAssistant: () => set({ assistantOpen: false }),
      toggleAssistant: () => set((s) => ({ assistantOpen: !s.assistantOpen })),
      setAssistantMode: (assistantMode) => set({ assistantMode }),
      upgradeReason: null,
      openUpgrade: (upgradeReason) => set({ upgradeReason }),
      closeUpgrade: () => set({ upgradeReason: null }),
    }),
    {
      name: 'spanish-invo:ui',
      storage: createJSONStorage(() =>
        typeof window === 'undefined' ? noopStorage : window.localStorage,
      ),
      partialize: (s) => ({
        locale: s.locale,
        sidebarCollapsed: s.sidebarCollapsed,
        assistantMode: s.assistantMode,
      }),
      // Rehydrate manually after mount so server and first client render match.
      skipHydration: true,
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
)

const noopStorage: Storage = {
  length: 0,
  clear: () => {},
  getItem: () => null,
  key: () => null,
  removeItem: () => {},
  setItem: () => {},
}
