import { animated } from '@react-spring/three';
import { usePositionScale } from '../usePositionScale';
import { useAlertPulse } from '../useAlertPulse';
import { useEffect } from 'react';

export interface BatteryMarkerProps {
  position: [number, number, number];
  hasAlert?: boolean;
  color?: string;
  scale?: [number, number, number];
}

export function BatteryMarker({
  position,
  hasAlert = false,
  color = '#00ff00',
  scale: targetScale = [1, 1, 1],
}: BatteryMarkerProps) {
  const { position: animatedPosition, scale: baseScale, updatePosition, updateScale } = usePositionScale({
    initialPosition: position,
    initialScale: targetScale,
  });

  const { scale: pulseScale, opacity } = useAlertPulse({
    enabled: hasAlert,
    minScale: 1,
    maxScale: 1.3,
  });

  useEffect(() => {
    updatePosition(position);
  }, [position, updatePosition]);

  useEffect(() => {
    updateScale(targetScale);
  }, [targetScale, updateScale]);

  return (
    <animated.group position={animatedPosition as any}>
      <animated.mesh scale={baseScale.to((s: any) => pulseScale.to((p: any) => [s[0] * p, s[1] * p, s[2] * p]) as any) as any}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <animated.meshStandardMaterial
          color={color}
          transparent
          opacity={hasAlert ? opacity : 1}
        />
      </animated.mesh>
      {hasAlert && (
        <animated.mesh scale={pulseScale as any}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <animated.meshBasicMaterial
            color="#ff0000"
            transparent
            opacity={opacity.to((o) => o * 0.3)}
            wireframe
          />
        </animated.mesh>
      )}
    </animated.group>
  );
}
