// @ts-nocheck
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, useCursor, RoundedBox, ContactShadows, Environment, Float, Edges } from '@react-three/drei';
import * as THREE from 'three';
import { ZoneData, ZoneStatus, Branch } from '../../types';
import { X, Server } from 'lucide-react';
import { ZoneDetailModal } from './ZoneDetailModal';

interface Mall3DViewProps {
  branch: Branch;
  onClose: () => void;
}

// Generate Mock Zone Data based on Branch
const generateZoneData = (branch: Branch): ZoneData[] => {
    const zones: ZoneData[] = [];
    const floors = 2;
    const zonesPerFloor = 4;
    
    for(let f=0; f<floors; f++) {
        for(let z=0; z<zonesPerFloor; z++) {
            const isCritical = branch.status === 'critical' && f === 1 && z === 1;
            const isWarning = branch.status === 'warning' && z === 3;
            
            zones.push({
                id: `Z-${f+1}0${z+1}`,
                name: `Zone ${f+1}-${z+1} (${f===0 ? 'Lobby/Office' : 'Server/Infra'})`,
                status: isCritical ? ZoneStatus.CRITICAL : isWarning ? ZoneStatus.WARNING : ZoneStatus.OPTIMAL,
                coordinates: [
                    (z % 2 === 0 ? -4 : 4), 
                    f * 3.5, 
                    (z < 2 ? -4 : 4)
                ],
                dimensions: [7, 2.5, 7],
                color: f === 0 ? '#64748b' : '#475569',
                sensors: [
                    { id: `T-${f}-${z}`, type: 'TEMP', value: 24, unit: 'C' },
                    { id: `C-${f}-${z}`, type: 'CO2', value: 450, unit: 'ppm' }
                ]
            });
        }
    }
    return zones;
};

const ZoneBlock: React.FC<{ zone: ZoneData; onClick: (z: ZoneData) => void; isSelected: boolean }> = ({ zone, onClick, isSelected }) => {
    const [hovered, setHover] = useState(false);
    useCursor(hovered);
    
    const statusColor = zone.status === ZoneStatus.CRITICAL ? '#ef4444' : zone.status === ZoneStatus.WARNING ? '#f59e0b' : '#10b981';
    
    // Smooth hover effect logic could go here, for now simple color swap
    const baseColor = isSelected ? '#3b82f6' : zone.color;
    
    // Safe opacity handling
    const opacity = isSelected ? 0.9 : 0.8;

    return (
        <group position={zone.coordinates}>
            <mesh
                onClick={(e) => { e.stopPropagation(); onClick(zone); }}
                onPointerOver={() => setHover(true)}
                onPointerOut={() => setHover(false)}
            >
                <boxGeometry args={zone.dimensions} />
                <meshStandardMaterial 
                    color={baseColor} 
                    transparent 
                    opacity={opacity} 
                    roughness={0.2}
                    metalness={0.1}
                />
                <Edges color="#cbd5e1" />
            </mesh>

            {/* Status Indicator */}
            <mesh position={[0, 1.5, 0]}>
                <sphereGeometry args={[0.3]} />
                <meshBasicMaterial color={statusColor} />
            </mesh>

            {/* Label */}
            <Text 
                position={[0, 2, 0]} 
                fontSize={0.5} 
                color="black" 
                anchorX="center" 
                anchorY="middle"
                outlineWidth={0.05}
                outlineColor="white"
            >
                {zone.id}
            </Text>
        </group>
    );
};

export const Mall3DView: React.FC<Mall3DViewProps> = ({ branch, onClose }) => {
    const zones = useMemo(() => generateZoneData(branch), [branch]);
    const [selectedZone, setSelectedZone] = useState<ZoneData | null>(null);

    return (
        <div className="w-full h-full relative bg-slate-100 flex flex-col">
             {/* Header Overlay */}
            <div className="absolute top-0 left-0 w-full p-4 z-20 flex justify-between items-start pointer-events-none">
                <div>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 pointer-events-auto">
                        <Server className="w-5 h-5 text-blue-600" />
                        อาคารปฏิบัติการ (Building Digital Twin): {branch.name}
                    </h3>
                </div>
                <button onClick={onClose} className="p-2 text-gray-500 hover:text-slate-900 hover:bg-gray-100 rounded-full transition-colors pointer-events-auto bg-white/50 backdrop-blur-sm border border-gray-100">
                    <X className="w-6 h-6" />
                </button>
            </div>

            <div className="flex-1 w-full h-full">
                <Canvas shadows camera={{ position: [20, 15, 20], fov: 45 }}>
                    <color attach="background" args={['#f1f5f9']} />
                    <fog attach="fog" args={['#f1f5f9', 20, 60]} />
                    <ambientLight intensity={0.6} />
                    <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
                    <Environment preset="city" />

                    <group position={[0, -2, 0]}>
                        {zones.map(zone => (
                            <ZoneBlock 
                                key={zone.id} 
                                zone={zone} 
                                onClick={setSelectedZone} 
                                isSelected={selectedZone?.id === zone.id} 
                            />
                        ))}
                        
                        {/* Floor Plane */}
                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
                            <planeGeometry args={[50, 50]} />
                            <meshStandardMaterial color="#e2e8f0" />
                        </mesh>
                    </group>

                    <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2} />
                </Canvas>
            </div>

             {selectedZone && (
                <ZoneDetailModal zone={selectedZone} onClose={() => setSelectedZone(null)} />
            )}
        </div>
    );
};