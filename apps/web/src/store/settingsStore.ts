import { type UserSettings } from '@pulsegrid/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState extends UserSettings {
  set: (patch: Partial<UserSettings>) => void;
  reset: () => void;
}

const DEFAULTS: UserSettings = {
  reducedMotion: false,
  density: 'comfortable',
  defaultSymbol: 'BTCUSD',
  orderBookDepth: 10,
  colorblindSafe: false,
  numberFormat: 'standard',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (patch) => set(patch),
      reset: () => set(DEFAULTS),
    }),
    { name: 'pulsegrid.settings' },
  ),
);
