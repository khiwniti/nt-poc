import { useEffect, useCallback, useRef } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { Camera } from 'three';

export interface KeyboardNavigation3DConfig {
  enabled?: boolean;
  panSpeed?: number;
  zoomSpeed?: number;
  rotateSpeed?: number;
  onZoneSelect?: (zoneIndex: number) => void;
  onAnnouncement?: (message: string) => void;
}

export function useKeyboardNavigation3D(
  controlsRef: React.RefObject<OrbitControlsImpl>,
  cameraRef: React.RefObject<Camera>,
  config: KeyboardNavigation3DConfig = {}
) {
  const {
    enabled = true,
    panSpeed = 0.5,
    zoomSpeed = 0.3,
    rotateSpeed = 0.05,
    onZoneSelect,
    onAnnouncement,
  } = config;

  const selectedZoneIndexRef = useRef<number>(0);
  const totalZonesRef = useRef<number>(0);

  const announce = useCallback(
    (message: string) => {
      onAnnouncement?.(message);
    },
    [onAnnouncement]
  );

  useEffect(() => {
    if (!enabled || !controlsRef.current || !cameraRef.current) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const controls = controlsRef.current;
      const camera = cameraRef.current;

      if (!controls || !camera) return;

      // Prevent default for navigation keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', '+', '-', '='].includes(event.key)) {
        event.preventDefault();
      }

      switch (event.key) {
        case 'ArrowUp':
          if (event.shiftKey) {
            // Pan up
            controls.target.y += panSpeed;
            camera.position.y += panSpeed;
            announce('Panned up');
          } else {
            // Rotate up
            const phi = Math.atan2(
              camera.position.x - controls.target.x,
              camera.position.z - controls.target.z
            );
            const radius = Math.sqrt(
              Math.pow(camera.position.x - controls.target.x, 2) +
              Math.pow(camera.position.z - controls.target.z, 2)
            );
            
            camera.position.y += rotateSpeed * 5;
            announce('Rotated view up');
          }
          controls.update();
          break;

        case 'ArrowDown':
          if (event.shiftKey) {
            // Pan down
            controls.target.y -= panSpeed;
            camera.position.y -= panSpeed;
            announce('Panned down');
          } else {
            // Rotate down
            camera.position.y -= rotateSpeed * 5;
            announce('Rotated view down');
          }
          controls.update();
          break;

        case 'ArrowLeft':
          if (event.shiftKey) {
            // Pan left
            controls.target.x -= panSpeed;
            camera.position.x -= panSpeed;
            announce('Panned left');
          } else {
            // Rotate left
            const angle = Math.atan2(
              camera.position.z - controls.target.z,
              camera.position.x - controls.target.x
            );
            const radius = Math.sqrt(
              Math.pow(camera.position.x - controls.target.x, 2) +
              Math.pow(camera.position.z - controls.target.z, 2)
            );
            
            const newAngle = angle + rotateSpeed;
            camera.position.x = controls.target.x + radius * Math.cos(newAngle);
            camera.position.z = controls.target.z + radius * Math.sin(newAngle);
            announce('Rotated view left');
          }
          controls.update();
          break;

        case 'ArrowRight':
          if (event.shiftKey) {
            // Pan right
            controls.target.x += panSpeed;
            camera.position.x += panSpeed;
            announce('Panned right');
          } else {
            // Rotate right
            const angle = Math.atan2(
              camera.position.z - controls.target.z,
              camera.position.x - controls.target.x
            );
            const radius = Math.sqrt(
              Math.pow(camera.position.x - controls.target.x, 2) +
              Math.pow(camera.position.z - controls.target.z, 2)
            );
            
            const newAngle = angle - rotateSpeed;
            camera.position.x = controls.target.x + radius * Math.cos(newAngle);
            camera.position.z = controls.target.z + radius * Math.sin(newAngle);
            announce('Rotated view right');
          }
          controls.update();
          break;

        case '+':
        case '=':
          // Zoom in
          const zoomInDistance = Math.sqrt(
            Math.pow(camera.position.x - controls.target.x, 2) +
            Math.pow(camera.position.y - controls.target.y, 2) +
            Math.pow(camera.position.z - controls.target.z, 2)
          );
          
          const zoomInFactor = 1 - zoomSpeed;
          camera.position.x = controls.target.x + (camera.position.x - controls.target.x) * zoomInFactor;
          camera.position.y = controls.target.y + (camera.position.y - controls.target.y) * zoomInFactor;
          camera.position.z = controls.target.z + (camera.position.z - controls.target.z) * zoomInFactor;
          controls.update();
          announce('Zoomed in');
          break;

        case '-':
        case '_':
          // Zoom out
          const zoomOutDistance = Math.sqrt(
            Math.pow(camera.position.x - controls.target.x, 2) +
            Math.pow(camera.position.y - controls.target.y, 2) +
            Math.pow(camera.position.z - controls.target.z, 2)
          );
          
          const zoomOutFactor = 1 + zoomSpeed;
          camera.position.x = controls.target.x + (camera.position.x - controls.target.x) * zoomOutFactor;
          camera.position.y = controls.target.y + (camera.position.y - controls.target.y) * zoomOutFactor;
          camera.position.z = controls.target.z + (camera.position.z - controls.target.z) * zoomOutFactor;
          controls.update();
          announce('Zoomed out');
          break;

        case 'Tab':
          // Cycle through zones
          if (totalZonesRef.current > 0) {
            event.preventDefault();
            if (event.shiftKey) {
              selectedZoneIndexRef.current = 
                (selectedZoneIndexRef.current - 1 + totalZonesRef.current) % totalZonesRef.current;
            } else {
              selectedZoneIndexRef.current = 
                (selectedZoneIndexRef.current + 1) % totalZonesRef.current;
            }
            onZoneSelect?.(selectedZoneIndexRef.current);
            announce(`Zone ${selectedZoneIndexRef.current + 1} of ${totalZonesRef.current} selected`);
          }
          break;

        case 'Enter':
        case ' ':
          // Activate/focus on selected zone
          if (totalZonesRef.current > 0) {
            event.preventDefault();
            onZoneSelect?.(selectedZoneIndexRef.current);
            announce(`Activated zone ${selectedZoneIndexRef.current + 1}`);
          }
          break;

        case 'Home':
          // Reset to first zone
          if (totalZonesRef.current > 0) {
            event.preventDefault();
            selectedZoneIndexRef.current = 0;
            onZoneSelect?.(0);
            announce('Reset to first zone');
          }
          break;

        case 'End':
          // Go to last zone
          if (totalZonesRef.current > 0) {
            event.preventDefault();
            selectedZoneIndexRef.current = totalZonesRef.current - 1;
            onZoneSelect?.(totalZonesRef.current - 1);
            announce(`Moved to last zone: ${totalZonesRef.current}`);
          }
          break;

        case 'Escape':
          // Deselect zone
          selectedZoneIndexRef.current = -1;
          onZoneSelect?.(-1);
          announce('Zone deselected');
          break;

        case '?':
          // Show keyboard shortcuts help
          announce(
            'Keyboard shortcuts: Arrow keys to rotate, Shift+Arrow to pan, Plus/Minus to zoom, Tab to cycle zones, Enter to select zone, Escape to deselect'
          );
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, controlsRef, cameraRef, panSpeed, zoomSpeed, rotateSpeed, onZoneSelect, announce]);

  const setTotalZones = useCallback((total: number) => {
    totalZonesRef.current = total;
  }, []);

  const setSelectedZone = useCallback((index: number) => {
    selectedZoneIndexRef.current = index;
  }, []);

  return {
    selectedZoneIndex: selectedZoneIndexRef.current,
    setTotalZones,
    setSelectedZone,
  };
}
