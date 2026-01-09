export const ANIMATION_CONFIG = {
  colorTransition: {
    duration: 300,
    easing: 'easeInOut' as const,
  },
  positionScale: {
    duration: 400,
    easing: 'easeInOut' as const,
  },
  alertPulse: {
    duration: 1000,
    easing: 'easeInOut' as const,
  },
  targetFPS: 60,
} as const;

export const ZONE_COLORS = {
  green: '#00ff00',
  yellow: '#ffff00',
  red: '#ff0000',
  default: '#808080',
} as const;

export type ZoneColor = keyof typeof ZONE_COLORS;
