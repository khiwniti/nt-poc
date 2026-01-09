import { useSpring } from '@react-spring/three';
import { Color } from 'three';
import { ANIMATION_CONFIG } from './config';

export interface ColorTransitionConfig {
  targetColor: string;
  onComplete?: () => void;
}

export function useColorTransition({ targetColor, onComplete }: ColorTransitionConfig) {
  const colorObj = new Color(targetColor);

  const [springs, api] = useSpring(() => ({
    color: [colorObj.r, colorObj.g, colorObj.b],
    config: {
      duration: ANIMATION_CONFIG.colorTransition.duration,
      easing: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    },
    onRest: onComplete,
  }));

  const updateColor = (newColor: string) => {
    const newColorObj = new Color(newColor);
    api.start({
      color: [newColorObj.r, newColorObj.g, newColorObj.b],
    });
  };

  return {
    color: springs.color,
    updateColor,
  };
}
