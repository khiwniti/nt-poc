import { useEffect, useMemo } from 'react';
import { Object3D } from 'three';

export interface Accessible3DZoneProps {
  zoneId: string;
  zoneName: string;
  status: 'normal' | 'warning' | 'critical';
  temperature?: number;
  batteryLevel?: number;
  alertCount?: number;
  position: [number, number, number];
  isSelected?: boolean;
  onSelect?: () => void;
}

export function useAccessible3DZone(props: Accessible3DZoneProps) {
  const {
    zoneId,
    zoneName,
    status,
    temperature,
    batteryLevel,
    alertCount = 0,
    position,
    isSelected,
    onSelect,
  } = props;

  // Generate accessible label
  const ariaLabel = useMemo(() => {
    const parts: string[] = [zoneName];
    
    if (status === 'critical') {
      parts.push('CRITICAL STATUS');
    } else if (status === 'warning') {
      parts.push('Warning status');
    } else {
      parts.push('Normal status');
    }

    if (temperature !== undefined) {
      parts.push(`Temperature: ${temperature} degrees Celsius`);
    }

    if (batteryLevel !== undefined) {
      parts.push(`Battery level: ${batteryLevel} percent`);
    }

    if (alertCount > 0) {
      parts.push(`${alertCount} active alert${alertCount > 1 ? 's' : ''}`);
    }

    parts.push(`Position: X ${position[0]}, Y ${position[1]}, Z ${position[2]}`);

    if (isSelected) {
      parts.push('(Selected)');
    }

    return parts.join('. ');
  }, [zoneName, status, temperature, batteryLevel, alertCount, position, isSelected]);

  // Generate accessible description
  const ariaDescription = useMemo(() => {
    return `Interactive 3D zone element. Use arrow keys to rotate view, Shift+Arrow keys to pan, Plus/Minus to zoom. Press Tab to cycle through zones, Enter to select.`;
  }, []);

  // Role-based attributes
  const ariaRole = 'button';
  const ariaPressed = isSelected;

  return {
    ariaLabel,
    ariaDescription,
    ariaRole,
    ariaPressed,
    tabIndex: 0,
    onClick: onSelect,
  };
}

// Helper to add ARIA attributes to Three.js Object3D
export function addAriaToObject3D(object: Object3D, attributes: Record<string, any>) {
  // Store ARIA attributes in userData for use in DOM overlay
  object.userData.aria = {
    ...object.userData.aria,
    ...attributes,
  };
}

// Helper to generate zone announcement for screen readers
export function generateZoneAnnouncement(props: Accessible3DZoneProps): string {
  const { zoneName, status, alertCount, temperature, batteryLevel } = props;
  
  const statusText = 
    status === 'critical' ? 'Critical alert' :
    status === 'warning' ? 'Warning' :
    'Normal';

  const parts = [`${zoneName}: ${statusText}`];

  if (alertCount > 0) {
    parts.push(`${alertCount} active alert${alertCount > 1 ? 's' : ''}`);
  }

  if (temperature !== undefined) {
    parts.push(`Temperature ${temperature} degrees`);
  }

  if (batteryLevel !== undefined && batteryLevel < 20) {
    parts.push(`Low battery: ${batteryLevel}%`);
  }

  return parts.join('. ');
}
