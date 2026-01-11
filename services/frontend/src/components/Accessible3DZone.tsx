import { useMemo, useRef, useEffect, useState } from 'react';
import { useAccessibilityStore, getZoneColor } from '../stores/accessibilityStore';
import { useAccessible3DZone, type Accessible3DZoneProps } from '../hooks/useAccessible3DZone';
import { Html } from '@react-three/drei';
import { Mesh } from 'three';

export interface Accessible3DZoneComponentProps extends Accessible3DZoneProps {
  size?: [number, number, number];
  showLabel?: boolean;
  onClick?: () => void;
}

export function Accessible3DZone({
  zoneId,
  zoneName,
  status,
  temperature,
  batteryLevel,
  alertCount,
  position,
  isSelected = false,
  onSelect,
  size = [1, 1, 1],
  showLabel = true,
  onClick,
}: Accessible3DZoneComponentProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const { 
    colorScheme, 
    use3DOutlines, 
    show3DLabels,
    highContrastEnabled 
  } = useAccessibilityStore();

  const {
    ariaLabel,
    ariaDescription,
    tabIndex,
  } = useAccessible3DZone({
    zoneId,
    zoneName,
    status,
    temperature,
    batteryLevel,
    alertCount,
    position,
    isSelected,
    onSelect,
  });

  const color = useMemo(
    () => getZoneColor(status, colorScheme, isSelected),
    [status, colorScheme, isSelected]
  );

  const emissiveIntensity = useMemo(() => {
    if (highContrastEnabled) return 0.5;
    if (isSelected) return 0.3;
    if (hovered) return 0.2;
    return 0;
  }, [highContrastEnabled, isSelected, hovered]);

  const outlineWidth = useMemo(() => {
    if (isSelected) return 0.05;
    if (hovered) return 0.03;
    return 0;
  }, [isSelected, hovered]);

  useEffect(() => {
    if (meshRef.current) {
      // Store accessibility data in mesh userData
      meshRef.current.userData = {
        ...meshRef.current.userData,
        accessible: true,
        zoneId,
        zoneName,
        status,
        ariaLabel,
        ariaDescription,
      };
    }
  }, [zoneId, zoneName, status, ariaLabel, ariaDescription]);

  const handleClick = () => {
    onSelect?.();
    onClick?.();
  };

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          metalness={0.2}
          roughness={0.8}
        />
      </mesh>

      {/* Outline for better visibility */}
      {use3DOutlines && (isSelected || hovered) && (
        <mesh>
          <boxGeometry args={[
            size[0] + outlineWidth * 2,
            size[1] + outlineWidth * 2,
            size[2] + outlineWidth * 2
          ]} />
          <meshBasicMaterial
            color={isSelected ? '#FFFFFF' : '#CCCCCC'}
            wireframe
            transparent
            opacity={isSelected ? 1.0 : 0.5}
          />
        </mesh>
      )}

      {/* HTML Label for accessibility */}
      {show3DLabels && showLabel && (
        <Html
          position={[0, size[1] / 2 + 0.3, 0]}
          center
          distanceFactor={10}
          occlude={false}
          style={{
            transition: 'opacity 0.2s',
            opacity: isSelected || hovered ? 1 : 0.7,
            pointerEvents: 'none',
          }}
        >
          <div
            role="tooltip"
            aria-label={ariaLabel}
            style={{
              background: highContrastEnabled ? '#000' : 'rgba(0, 0, 0, 0.8)',
              color: highContrastEnabled ? '#FFF' : '#fff',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: isSelected ? 'bold' : 'normal',
              whiteSpace: 'nowrap',
              border: highContrastEnabled ? '2px solid #FFF' : 'none',
            }}
          >
            {zoneName}
            {alertCount > 0 && (
              <span
                style={{
                  marginLeft: '4px',
                  padding: '2px 4px',
                  background: status === 'critical' ? '#F44336' : '#FF9800',
                  borderRadius: '3px',
                  fontSize: '10px',
                }}
              >
                {alertCount}
              </span>
            )}
          </div>
        </Html>
      )}

      {/* Focus indicator for keyboard navigation */}
      {isSelected && (
        <Html center>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: `3px solid ${highContrastEnabled ? '#FFFF00' : '#2196F3'}`,
              borderRadius: '50%',
              pointerEvents: 'none',
              animation: 'pulse 2s infinite',
            }}
          />
        </Html>
      )}
    </group>
  );
}
