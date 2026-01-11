import React, { useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Raycaster, Vector2, Mesh } from 'three';

interface InteractionManagerProps {
  onZoneClick?: (zoneId: string) => void;
  onBatteryClick?: (batteryId: string) => void;
  zones: Array<{ id: string; mesh: Mesh }>;
  batteries: Array<{ id: string; mesh: Mesh }>;
}

export const InteractionManager: React.FC<InteractionManagerProps> = ({
  onZoneClick,
  onBatteryClick,
  zones,
  batteries,
}) => {
  const { camera, gl } = useThree();
  const raycaster = useRef(new Raycaster());
  const mouse = useRef(new Vector2());
  const [hoveredObject, setHoveredObject] = useState<string | null>(null);

  const handlePointerMove = React.useCallback(
    (event: PointerEvent) => {
      const canvas = gl.domElement;
      const rect = canvas.getBoundingClientRect();

      // Calculate mouse position in normalized device coordinates (-1 to +1)
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Update raycaster
      raycaster.current.setFromCamera(mouse.current, camera);

      // Check intersections
      const allObjects = [
        ...zones.map((z) => ({ ...z, type: 'zone' as const })),
        ...batteries.map((b) => ({ ...b, type: 'battery' as const })),
      ];

      const intersects = raycaster.current.intersectObjects(
        allObjects.map((o) => o.mesh),
        true
      );

      if (intersects.length > 0) {
        const intersected = intersects[0].object;
        const found = allObjects.find(
          (o) => o.mesh === intersected || o.mesh.children.includes(intersected)
        );

        if (found) {
          setHoveredObject(found.id);
          // eslint-disable-next-line react-hooks/immutability
          gl.domElement.style.cursor = 'pointer';
        } else {
          setHoveredObject(null);

          gl.domElement.style.cursor = 'default';
        }
      } else {
        setHoveredObject(null);

        gl.domElement.style.cursor = 'default';
      }
    },
    [zones, batteries, camera, gl, raycaster]
  );

  const handleClick = React.useCallback(() => {
    if (!hoveredObject) return;

    const zone = zones.find((z) => z.id === hoveredObject);
    if (zone) {
      onZoneClick?.(zone.id);
      return;
    }

    const battery = batteries.find((b) => b.id === hoveredObject);
    if (battery) {
      onBatteryClick?.(battery.id);
    }
  }, [hoveredObject, zones, batteries, onZoneClick, onBatteryClick]);

  React.useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('click', handleClick);

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('click', handleClick);
    };
  }, [gl.domElement, handlePointerMove, handleClick]);

  return null;
};
