import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ColorScheme = 'standard' | 'high-contrast' | 'protanopia' | 'deuteranopia' | 'tritanopia';

interface AccessibilityState {
  // High contrast mode
  highContrastEnabled: boolean;
  colorScheme: ColorScheme;

  // Keyboard navigation
  keyboardNavigationEnabled: boolean;
  
  // Screen reader
  screenReaderOptimized: boolean;
  reduceMotion: boolean;

  // 3D specific
  show3DLabels: boolean;
  use3DOutlines: boolean;

  // Actions
  setHighContrastEnabled: (enabled: boolean) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  setKeyboardNavigationEnabled: (enabled: boolean) => void;
  setScreenReaderOptimized: (enabled: boolean) => void;
  setReduceMotion: (enabled: boolean) => void;
  setShow3DLabels: (show: boolean) => void;
  setUse3DOutlines: (use: boolean) => void;
  toggleHighContrast: () => void;
}

export const useAccessibilityStore = create<AccessibilityState>()(
  persist(
    (set) => ({
      highContrastEnabled: false,
      colorScheme: 'standard',
      keyboardNavigationEnabled: true,
      screenReaderOptimized: false,
      reduceMotion: false,
      show3DLabels: true,
      use3DOutlines: true,

      setHighContrastEnabled: (enabled) => set({ 
        highContrastEnabled: enabled,
        colorScheme: enabled ? 'high-contrast' : 'standard'
      }),

      setColorScheme: (scheme) => set({ 
        colorScheme: scheme,
        highContrastEnabled: scheme === 'high-contrast'
      }),

      setKeyboardNavigationEnabled: (enabled) => set({ keyboardNavigationEnabled: enabled }),
      setScreenReaderOptimized: (enabled) => set({ screenReaderOptimized: enabled }),
      setReduceMotion: (enabled) => set({ reduceMotion: enabled }),
      setShow3DLabels: (show) => set({ show3DLabels: show }),
      setUse3DOutlines: (use) => set({ use3DOutlines: use }),
      
      toggleHighContrast: () => set((state) => ({ 
        highContrastEnabled: !state.highContrastEnabled,
        colorScheme: !state.highContrastEnabled ? 'high-contrast' : 'standard'
      })),
    }),
    {
      name: 'accessibility-settings',
    }
  )
);

// Color palettes for different modes
export const colorSchemes = {
  standard: {
    normal: '#4CAF50',
    warning: '#FF9800',
    critical: '#F44336',
    selected: '#2196F3',
    background: '#f5f5f5',
    text: '#000000',
  },
  'high-contrast': {
    normal: '#00FF00',      // Bright green
    warning: '#FFFF00',     // Bright yellow
    critical: '#FF0000',    // Bright red
    selected: '#00FFFF',    // Cyan
    background: '#000000',
    text: '#FFFFFF',
  },
  protanopia: {
    // Red-blind friendly
    normal: '#4CB5F5',      // Blue
    warning: '#FFD700',     // Gold
    critical: '#DC143C',    // Dark red (more distinguishable)
    selected: '#9370DB',    // Purple
    background: '#f5f5f5',
    text: '#000000',
  },
  deuteranopia: {
    // Green-blind friendly
    normal: '#4CB5F5',      // Blue
    warning: '#FFD700',     // Gold
    critical: '#DC143C',    // Dark red
    selected: '#9370DB',    // Purple
    background: '#f5f5f5',
    text: '#000000',
  },
  tritanopia: {
    // Blue-blind friendly
    normal: '#FF1493',      // Deep pink
    warning: '#FF8C00',     // Dark orange
    critical: '#8B0000',    // Dark red
    selected: '#00CED1',    // Dark turquoise
    background: '#f5f5f5',
    text: '#000000',
  },
};

export function getZoneColor(
  status: 'normal' | 'warning' | 'critical',
  scheme: ColorScheme = 'standard',
  isSelected: boolean = false
): string {
  if (isSelected) {
    return colorSchemes[scheme].selected;
  }
  return colorSchemes[scheme][status];
}

// Detect system preference for reduced motion
export function detectReducedMotionPreference(): boolean {
  if (typeof window === 'undefined') return false;
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  return mediaQuery.matches;
}

// Detect system preference for high contrast
export function detectHighContrastPreference(): boolean {
  if (typeof window === 'undefined') return false;
  const mediaQuery = window.matchMedia('(prefers-contrast: high)');
  return mediaQuery.matches;
}
