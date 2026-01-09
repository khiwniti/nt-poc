import { useSpring } from '@react-spring/three';
import { useEffect } from 'react';
import { ANIMATION_CONFIG } from './config';

export interface AlertPulseConfig {
  enabled?: boolean;
  minScale?: number;
  maxScale?: number;
}

export function useAlertPulse({
  enabled = true,
  minScale = 1,
  maxScale = 1.3,
}: AlertPulseConfig = {}) {
  const [springs, api] = useSpring(() => ({
    scale: minScale,
    opacity: 1,
    config: {
      duration: ANIMATION_CONFIG.alertPulse.duration / 2,
      easing: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    },
  }));

  useEffect(() => {
    if (!enabled) {
      api.start({
        scale: minScale,
        opacity: 1,
      });
      return;
    }

    const pulse = () => {
      api.start({
        from: { scale: minScale, opacity: 1 },
        to: async (next) => {
          await next({ scale: maxScale, opacity: 0.7 });
          await next({ scale: minScale, opacity: 1 });
        },
        loop: true,
      });
    };

    pulse();

    return () => {
      api.stop();
    };
  }, [enabled, minScale, maxScale, api]);

  return {
    scale: springs.scale,
    opacity: springs.opacity,
    stop: () => api.stop(),
    start: () => api.start(),
  };
}
