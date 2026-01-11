import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AlertSoundSettings {
  enabled: boolean;
  volume: number; // 0.0 to 1.0
  respectReducedMotion: boolean;
}

interface AlertSoundStore {
  settings: AlertSoundSettings;
  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  setRespectReducedMotion: (respect: boolean) => void;
  toggleMute: () => void;
  shouldPlaySound: () => boolean;
}

const DEFAULT_SETTINGS: AlertSoundSettings = {
  enabled: true,
  volume: 0.7,
  respectReducedMotion: true,
};

export const useAlertSoundStore = create<AlertSoundStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,

      setEnabled: (enabled: boolean) =>
        set((state) => ({
          settings: { ...state.settings, enabled },
        })),

      setVolume: (volume: number) =>
        set((state) => ({
          settings: { ...state.settings, volume: Math.max(0, Math.min(1, volume)) },
        })),

      setRespectReducedMotion: (respect: boolean) =>
        set((state) => ({
          settings: { ...state.settings, respectReducedMotion: respect },
        })),

      toggleMute: () =>
        set((state) => ({
          settings: { ...state.settings, enabled: !state.settings.enabled },
        })),

      shouldPlaySound: () => {
        const { settings } = get();

        if (!settings.enabled) {
          return false;
        }

        // Check if user prefers reduced motion
        if (settings.respectReducedMotion) {
          const prefersReducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
          ).matches;
          if (prefersReducedMotion) {
            return false;
          }
        }

        return true;
      },
    }),
    {
      name: 'alert-sound-settings',
    }
  )
);
