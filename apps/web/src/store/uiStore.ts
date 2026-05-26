import { create } from 'zustand';

interface UiState {
  paletteOpen: boolean;
  shortcutsOpen: boolean;
  perfOverlay: boolean;
  setPalette: (open: boolean) => void;
  setShortcuts: (open: boolean) => void;
  togglePerf: () => void;
  closeAll: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  paletteOpen: false,
  shortcutsOpen: false,
  perfOverlay: false,
  setPalette: (paletteOpen) => set({ paletteOpen }),
  setShortcuts: (shortcutsOpen) => set({ shortcutsOpen }),
  togglePerf: () => set((s) => ({ perfOverlay: !s.perfOverlay })),
  closeAll: () => set({ paletteOpen: false, shortcutsOpen: false }),
}));
