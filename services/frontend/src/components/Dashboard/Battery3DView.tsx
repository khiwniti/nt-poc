
// @ts-nocheck
import React, { useState, useMemo, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Text, Float, ContactShadows, Environment, PerspectiveCamera, RoundedBox, useCursor } from '@react-three/drei';
import * as THREE from 'three';
import { Branch } from '../../types';
import { X, Server, Activity, Thermometer, Zap, AlertTriangle, CheckCircle2, Info, Wind, Droplets } from 'lucide-react';
import { BatteryDetailModal } from './BatteryDetailModal';

// --- Types ---
type StringStatus = 'operational' | 'warning' | 'critical';

export interface BatteryUnitDetails {
  type: 'BATTERY';
  id: string;
  bankType: 'Rectifier' | 'UPS';
  rackId: number;
  stringId: number;
  unitId: number;
  status: StringStatus;
  rul: number;
  voltage: number;
  temperature: number;
  impedance: number;
  location: [number, number, number];
  historyLog: any[];
}

// --- Data Generation ---
const generateUnitData = (branch: Branch): BatteryUnitDetails[] => {
  const allUnits: BatteryUnitDetails[] = [];
  const RACKS_COUNT = 4;
  const BATTERIES_PER_SHELF = 24;
  const SHELVES_PER_RACK = 2;
  
  let criticalString = -1;
  let warningString = -1;

  if (branch.status === 'critical') criticalString = Math.floor(Math.random() * (RACKS_COUNT * SHELVES_PER_RACK));
  if (branch.status === 'warning') warningString = Math.floor(Math.random() * (RACKS_COUNT * SHELVES_PER_RACK));

  for (let r = 0; r < RACKS_COUNT; r++) {
      const bankType = r < 2 ? 'Rectifier' : 'UPS'; // Rack 1-2: Telecom DC (2V Cells), Rack 3-4: UPS AC (12V Blocks)
      const rackX = (r - 1.5) * 3; // Spacing racks along X axis

      for (let s = 0; s < SHELVES_PER_RACK; s++) {
          const stringId = r * SHELVES_PER_RACK + s;
          const shelfY = s * 1.2 + 0.8; // Height of shelf

          for (let b = 0; b < BATTERIES_PER_SHELF; b++) {
              // 3D Positioning logic
              const row = Math.floor(b / 8); 
              const col = b % 8;
              const unitX = rackX + (col * 0.25) - 0.9;
              const unitZ = (row * 0.4) - 0.6;
              
              let status: StringStatus = 'operational';
              if (stringId === criticalString) status = Math.random() > 0.7 ? 'critical' : 'warning';
              else if (stringId === warningString) status = Math.random() > 0.8 ? 'warning' : 'operational';
              if (status === 'operational' && Math.random() > 0.995) status = 'warning';

              // Determine Voltage and Impedance based on battery type
              // Rectifier (Telecom): 2V Cells (Float ~2.25V)
              // UPS: 12V Blocks (Float ~13.5V)
              const is2VCell = bankType === 'Rectifier';
              const baseVoltage = is2VCell ? 2.25 : 13.5;
              const voltageJitter = (Math.random() * 0.04) - 0.02; // Small fluctuation
              
              // Degraded batteries have lower voltage
              const healthFactor = status === 'critical' ? 0.85 : status === 'warning' ? 0.95 : 1.0;
              const finalVoltage = (baseVoltage * healthFactor) + voltageJitter;

              // Impedance: 2V cells ~0.2-0.5mOhm, 12V blocks ~2.5-5.0mOhm
              const baseImpedance = is2VCell ? 0.35 : 3.5;
              const impedanceJitter = (Math.random() * (is2VCell ? 0.1 : 0.5));
              // Degraded batteries have higher impedance
              const impFactor = status === 'critical' ? 2.5 : status === 'warning' ? 1.5 : 1.0;
              const finalImpedance = (baseImpedance + impedanceJitter) * impFactor;

              allUnits.push({
                  type: 'BATTERY',
                  id: `${bankType === 'Rectifier' ? 'REC' : 'UPS'}-R${r+1}-S${s+1}-B${b+1}`,
                  bankType,
                  rackId: r + 1,
                  stringId: stringId + 1,
                  unitId: b + 1,
                  status,
                  rul: status === 'critical' ? Math.floor(Math.random() * 30) : Math.floor(700 + Math.random() * 500),
                  voltage: finalVoltage,
                  temperature: 24 + (Math.random() * 2) + (status === 'critical' ? 15 : 0), // Hotter if critical
                  impedance: finalImpedance,
                  location: [unitX, shelfY, unitZ],
                  historyLog: []
              });
          }
      }
  }
  return allUnits;
};

// --- 3D Components ---

const BatteryCell: React.FC<{ data: BatteryUnitDetails; onClick: (data: BatteryUnitDetails) => void; isSelected: boolean }> = ({ data, onClick, isSelected }) => {
    const [hovered, setHover] = useState(false);
    useCursor(hovered);
    
    const color = data.status === 'critical' ? '#ef4444' : data.status === 'warning' ? '#f59e0b' : '#10b981';
    const emissive = isSelected ? '#3b82f6' : (data.status === 'critical' ? '#ef4444' : '#000000');
    const intensity = isSelected ? 2 : (data.status === 'critical' ? 0.8 : 0);

    // Visual difference for 2V vs 12V? 
    // 2V cells often taller/thinner, 12V blocks boxier. 
    // For simplicity, keeping same geometry but could adjust scale if needed.
    const is2V = data.bankType === 'Rectifier';
    const scaleY = is2V ? 1.2 : 1.0;

    return (
        <group position={data.location}>
            <mesh 
                onClick={(e) => { e.stopPropagation(); onClick(data); }}
                onPointerOver={() => setHover(true)}
                onPointerOut={() => setHover(false)}
                scale={[1, scaleY, 1]}
            >
                <boxGeometry args={[0.2, 0.3, 0.35]} />
                <meshStandardMaterial 
                    color={color} 
                    roughness={0.4} 
                    metalness={0.6}
                    emissive={emissive}
                    emissiveIntensity={intensity}
                />
            </mesh>
            {/* Terminals */}
            <mesh position={[-0.06, 0.16 * scaleY, 0.1]}>
                <cylinderGeometry args={[0.03, 0.03, 0.05]} />
                <meshStandardMaterial color="#ef4444" />
            </mesh>
            <mesh position={[0.06, 0.16 * scaleY, 0.1]}>
                <cylinderGeometry args={[0.03, 0.03, 0.05]} />
                <meshStandardMaterial color="#1e293b" />
            </mesh>
            
            {/* Status Indicator for Critical */}
            {data.status === 'critical' && (
                <Float speed={5} rotationIntensity={0} floatIntensity={0.5}>
                    <mesh position={[0, 0.4 * scaleY, 0]}>
                        <sphereGeometry args={[0.05]} />
                        <meshBasicMaterial color="#ef4444" toneMapped={false} />
                    </mesh>
                </Float>
            )}
        </group>
    );
};

const RackFrame: React.FC<{ position: [number, number, number]; label: string }> = ({ position, label }) => {
    return (
        <group position={position}>
            {/* Frame Pillars */}
            <mesh position={[-1.1, 1.25, -0.8]}><boxGeometry args={[0.05, 2.5, 0.05]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
            <mesh position={[1.1, 1.25, -0.8]}><boxGeometry args={[0.05, 2.5, 0.05]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
            <mesh position={[-1.1, 1.25, 0.8]}><boxGeometry args={[0.05, 2.5, 0.05]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
            <mesh position={[1.1, 1.25, 0.8]}><boxGeometry args={[0.05, 2.5, 0.05]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
            
            {/* Shelves */}
            <mesh position={[0, 0.6, 0]}><boxGeometry args={[2.3, 0.05, 1.7]} /><meshStandardMaterial color="#94a3b8" /></mesh>
            <mesh position={[0, 1.8, 0]}><boxGeometry args={[2.3, 0.05, 1.7]} /><meshStandardMaterial color="#94a3b8" /></mesh>
            <mesh position={[0, 2.55, 0]}><boxGeometry args={[2.3, 0.05, 1.7]} /><meshStandardMaterial color="#64748b" /></mesh>

            {/* Label */}
            <Text position={[0, 2.7, 0.9]} fontSize={0.2} color="#1e293b" anchorX="center" anchorY="bottom">
                {label}
            </Text>
        </group>
    );
};

const Floor = () => (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.8} />
    </mesh>
);

const ACUnit = ({ position, rotation = [0,0,0] }: { position: [number, number, number], rotation?: [number, number, number] }) => {
    // Fixed: Pass array directly to rotation to be safe across Three.js versions in R3F
    return (
        <group position={position} rotation={rotation as any}>
            <mesh position={[0, 1.2, 0]}>
                <boxGeometry args={[1, 2.4, 0.8]} />
                <meshStandardMaterial color="#e2e8f0" />
            </mesh>
            <mesh position={[0, 1.8, 0.41]}>
                <planeGeometry args={[0.8, 0.4]} />
                <meshBasicMaterial color="#000" />
            </mesh>
            <Text position={[0, 1.8, 0.42]} fontSize={0.15} color="#00ff00">24.0°C</Text>
        </group>
    );
};

export const Battery3DView: React.FC<{ branch: Branch; onClose: () => void }> = ({ branch, onClose }) => {
    // Use useMemo to ensure data is stable but reactive to branch changes
    const units = useMemo(() => generateUnitData(branch), [branch]);
    
    const [selectedUnit, setSelectedUnit] = useState<BatteryUnitDetails | null>(null);
    const [showModal, setShowModal] = useState(false);

    const handleUnitClick = (unit: BatteryUnitDetails) => {
        setSelectedUnit(unit);
    };

    const handleBackgroundClick = () => {
        setSelectedUnit(null);
    };

    return (
        <div className="w-full h-full bg-slate-50 relative flex flex-col">
            
            {/* Header Overlay */}
            <div className="absolute top-0 left-0 w-full p-4 z-20 flex justify-between items-start pointer-events-none">
                <div>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 pointer-events-auto">
                        <Server className="w-5 h-5 text-blue-600" />
                        ห้องแบตเตอรี่ (Battery Room): {branch.name}
                    </h3>
                    <div className="flex gap-4 mt-2 text-xs font-mono text-slate-500 pointer-events-auto">
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>ปกติ</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div>เตือน</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>วิกฤต</div>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 text-gray-500 hover:text-slate-900 hover:bg-gray-100 rounded-full transition-colors pointer-events-auto bg-white/50 backdrop-blur-sm border border-gray-100">
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Selected Unit Info Card */}
            {selectedUnit && (
                <div className="absolute top-20 right-4 w-72 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-xl shadow-2xl p-4 z-20 animate-slide-in-right pointer-events-auto">
                    <div className="flex justify-between items-start mb-3 border-b border-gray-100 pb-2">
                        <div>
                            <h4 className="font-bold text-slate-800">{selectedUnit.id}</h4>
                            <p className="text-xs text-gray-500">{selectedUnit.bankType}</p>
                        </div>
                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            selectedUnit.status === 'critical' ? 'bg-red-100 text-red-600' : 
                            selectedUnit.status === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'
                        }`}>
                            {selectedUnit.status}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="p-2 bg-slate-50 rounded border border-slate-100">
                            <span className="text-[10px] text-gray-400 block">แรงดัน (V)</span>
                            <span className="text-lg font-mono font-bold text-blue-600">{selectedUnit.voltage.toFixed(3)}</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded border border-slate-100">
                            <span className="text-[10px] text-gray-400 block">อุณหภูมิ (°C)</span>
                            <span className={`text-lg font-mono font-bold ${selectedUnit.temperature > 30 ? 'text-red-500' : 'text-slate-700'}`}>{selectedUnit.temperature.toFixed(1)}</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>RUL (อายุคงเหลือ)</span>
                            <span className="font-bold text-slate-700">{selectedUnit.rul} วัน</span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div className={`h-full ${selectedUnit.rul < 90 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (selectedUnit.rul / 1000) * 100)}%` }}></div>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowModal(true)}
                        className="w-full mt-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        <Activity size={14} /> ดูรายละเอียดเชิงลึก
                    </button>
                </div>
            )}

            {/* 3D Scene */}
            <div className="flex-1 w-full h-full cursor-move">
                <Canvas shadows camera={{ position: [8, 8, 12], fov: 45 }}>
                    <color attach="background" args={['#f1f5f9']} />
                    <fog attach="fog" args={['#f1f5f9', 10, 40]} />
                    
                    <ambientLight intensity={0.5} />
                    <directionalLight 
                        position={[10, 20, 10]} 
                        intensity={1} 
                        castShadow 
                        shadow-mapSize={[1024, 1024]}
                    />
                    <Environment preset="city" />

                    <group position={[0, 0, 0]} onClick={(e) => { e.stopPropagation(); handleBackgroundClick(); }}>
                        <Floor />
                        
                        {/* Render Racks & Batteries */}
                        {[-1.5, -0.5, 0.5, 1.5].map((off, i) => (
                            <RackFrame 
                                key={i} 
                                position={[off * 3, 0, 0]} 
                                label={i < 2 ? "RECTIFIER DC" : "UPS AC"} 
                            />
                        ))}

                        {units.map((unit) => (
                            <BatteryCell 
                                key={unit.id} 
                                data={unit} 
                                onClick={handleUnitClick} 
                                isSelected={selectedUnit?.id === unit.id}
                            />
                        ))}

                        {/* Decor: AC Units */}
                        <ACUnit position={[-6, 0, -2]} rotation={[0, Math.PI/2, 0]} />
                        <ACUnit position={[6, 0, -2]} rotation={[0, -Math.PI/2, 0]} />

                        <ContactShadows resolution={1024} scale={40} blur={2} opacity={0.5} far={10} color="#94a3b8" />
                    </group>

                    <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.1} dampingFactor={0.05} />
                </Canvas>
            </div>

            {showModal && selectedUnit && (
                <BatteryDetailModal data={selectedUnit} onClose={() => setShowModal(false)} />
            )}
        </div>
    );
};
