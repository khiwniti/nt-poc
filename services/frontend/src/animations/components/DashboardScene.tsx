import { Canvas } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { AnimatedZone, BatteryMarker, ZONE_COLORS } from '../index';
import { useSensorStream } from '../../hooks/useSensorStream';
import { useDashboardStore } from '../../stores/dashboardStore';

interface BatteryData {
  id: string;
  position: [number, number, number];
  soc: number;
  hasAlert: boolean;
}

export function DashboardScene() {
  const { alerts } = useDashboardStore();
  const [batteries, setBatteries] = useState<BatteryData[]>([
    { id: 'bat-1', position: [-2, 1, 0], soc: 85, hasAlert: false },
    { id: 'bat-2', position: [0, 1, 0], soc: 45, hasAlert: false },
    { id: 'bat-3', position: [2, 1, 0], soc: 15, hasAlert: true },
  ]);

  const [zoneColor, setZoneColor] = useState<string>(ZONE_COLORS.green);

  // Update zone color based on overall system state
  useEffect(() => {
    const avgSoc = batteries.reduce((sum, b) => sum + b.soc, 0) / batteries.length;
    
    if (avgSoc > 70) {
      setZoneColor(ZONE_COLORS.green);
    } else if (avgSoc > 30) {
      setZoneColor(ZONE_COLORS.yellow);
    } else {
      setZoneColor(ZONE_COLORS.red);
    }
  }, [batteries]);

  // Update battery alerts based on dashboard alerts
  useEffect(() => {
    setBatteries((prev) =>
      prev.map((battery) => ({
        ...battery,
        hasAlert: alerts.some((alert) => alert.id.includes(battery.id)),
      }))
    );
  }, [alerts]);

  // Example sensor stream integration
  useSensorStream({
    batterySystemId: 'system-1',
    onReading: (reading) => {
      if (reading.voltage !== undefined) {
        // Update battery positions or states based on readings
        console.log('Sensor reading:', reading);
      }
    },
    enabled: true,
  });

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas camera={{ position: [0, 0, 8] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />

        {/* Animated zone representing overall system state */}
        <AnimatedZone
          zoneState={{
            color: zoneColor,
            position: [0, 0, -0.5],
            scale: [6, 3, 0.2],
          }}
        />

        {/* Battery markers with animations */}
        {batteries.map((battery) => (
          <BatteryMarker
            key={battery.id}
            position={battery.position}
            hasAlert={battery.hasAlert}
            color={
              battery.soc > 70
                ? ZONE_COLORS.green
                : battery.soc > 30
                ? ZONE_COLORS.yellow
                : ZONE_COLORS.red
            }
            scale={[1, 1, 1]}
          />
        ))}
      </Canvas>
    </div>
  );
}
