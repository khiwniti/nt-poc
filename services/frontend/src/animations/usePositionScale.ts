import { useSpring } from '@react-spring/three';
import { ANIMATION_CONFIG } from './config';

export interface PositionScaleConfig {
  initialPosition?: [number, number, number];
  initialScale?: [number, number, number];
  onComplete?: () => void;
}

export function usePositionScale({
  initialPosition = [0, 0, 0],
  initialScale = [1, 1, 1],
  onComplete,
}: PositionScaleConfig = {}) {
  const [springs, api] = useSpring(() => ({
    position: initialPosition,
    scale: initialScale,
    config: {
      duration: ANIMATION_CONFIG.positionScale.duration,
      easing: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    },
    onRest: onComplete,
  }));

  const updatePosition = (newPosition: [number, number, number]) => {
    api.start({
      position: newPosition,
    });
  };

  const updateScale = (newScale: [number, number, number]) => {
    api.start({
      scale: newScale,
    });
  };

  const updateBoth = (
    newPosition: [number, number, number],
    newScale: [number, number, number]
  ) => {
    api.start({
      position: newPosition,
      scale: newScale,
    });
  };

  return {
    position: springs.position,
    scale: springs.scale,
    updatePosition,
    updateScale,
    updateBoth,
  };
}
