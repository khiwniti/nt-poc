import { animated } from '@react-spring/three';
import { useColorTransition } from '../useColorTransition';
import { usePositionScale } from '../usePositionScale';
import { useEffect } from 'react';

export interface ZoneState {
  color: string;
  position?: [number, number, number];
  scale?: [number, number, number];
}

export interface AnimatedZoneProps {
  zoneState: ZoneState;
  onTransitionComplete?: () => void;
}

export function AnimatedZone({ zoneState, onTransitionComplete }: AnimatedZoneProps) {
  const { color, updateColor } = useColorTransition({
    targetColor: zoneState.color,
    onComplete: onTransitionComplete,
  });

  const { position, scale, updateBoth } = usePositionScale({
    initialPosition: zoneState.position || [0, 0, 0],
    initialScale: zoneState.scale || [1, 1, 1],
  });

  useEffect(() => {
    updateColor(zoneState.color);
  }, [zoneState.color, updateColor]);

  useEffect(() => {
    if (zoneState.position && zoneState.scale) {
      updateBoth(zoneState.position, zoneState.scale);
    }
  }, [zoneState.position, zoneState.scale, updateBoth]);

  return (
    <animated.mesh position={position as any} scale={scale as any}>
      <boxGeometry args={[1, 1, 1]} />
      <animated.meshStandardMaterial
        color={color.to((r, g, b) => `rgb(${Math.floor(r * 255)},${Math.floor(g * 255)},${Math.floor(b * 255)})`)}
      />
    </animated.mesh>
  );
}
