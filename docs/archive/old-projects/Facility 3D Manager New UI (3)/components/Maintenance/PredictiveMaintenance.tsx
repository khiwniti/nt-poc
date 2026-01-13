
import React, { useState, useMemo } from 'react';
import { Card } from '../ui/Card';
import { PredictiveAsset } from '../../types';
import { 
    Activity, BrainCircuit, Cpu, Thermometer, Waves, Volume2, 
    AlertTriangle, CheckCircle2, TrendingDown, Timer, Wrench, 
    Search, Filter, ArrowRight, Loader2, BarChart3 
} from 'lucide-react';

const MOCK_PREDICTIVE_DATA: PredictiveAsset[] = [
    {
        id: 'AHU-BKK-01',
        name: 'Main Air Handling Unit',
        category: 'HVAC',
        branchId: 'Bangrak',
        healthScore: 42,
        predictedFailureDate: '2025-05-28',
        confidence: 89,
        telemetry: { vibration: 8.5, temperature: 48, sound: 72, efficiency: 65 },
        logs: [
            { timestamp: '2025-05-12 08:30', code: 'ERR-VIB-01', message: 'Vibration exceeding threshold (Class B)' },
            { timestamp: '2025-05-11 14:20', code: 'WARN-TMP-02', message: 'Bearing temperature deviation +5%' }
        ],
        maintenanceSuggestion: 'Replace bearing assembly and align shaft'
    },
    {
        id: 'GEN-NON-02',
        name: 'Backup Generator 2',
        category: 'Power',
        branchId: 'Nonthaburi',
        healthScore: 94,
        predictedFailureDate: '2026-11-15',
        confidence: 92,
        telemetry: { vibration: 1.2, temperature: 35, sound: 65, efficiency: 98 },
        logs: [],
        maintenanceSuggestion: 'Routine oil analysis recommended'
    },
    {
        id: 'PUMP-CM-01',
        name: 'Cooling Tower Pump',
        category: 'Plumbing',
        branchId: 'Chiang Mai',
        healthScore: 68,
        predictedFailureDate: '2025-08-10',
        confidence: 75,
        telemetry: { vibration: 4.1, temperature: 42, sound: 68, efficiency: 82 },
        logs: [
            { timestamp: '2025-05-10 09:00', code: 'WARN-FLOW-01', message: 'Flow rate fluctuation detected' }
        ],
        maintenanceSuggestion: 'Inspect impeller for cavitation damage'
    },
    {
        id: 'UPS-PKT-A',
        name: 'UPS Module A',
        category: 'Power',
        branchId: 'Phuket',
        healthScore: 25,
        predictedFailureDate: '2025-05-18',
        confidence: 95,
        telemetry: { vibration: 0.5, temperature: 55, sound: 45, efficiency: 78 },
        logs: [
            { timestamp: '2025-05-12 10:15', code: 'ERR-CAP-03', message: 'Capacitor bank degrading rapidly' },
            { timestamp: '2025-05-12 10:10', code: 'ALARM-HEAT', message: 'Internal temp critical' }
        ],
        maintenanceSuggestion: 'Urgent: Capacitor replacement required immediately'
    },
    {
        id: 'ELV-SR-01',
        name: 'Passenger Elevator 1',
        category: 'Transport',
        branchId: 'Sriracha',
        healthScore: 88,
        predictedFailureDate: '2026-02-20',
        confidence: 85,
        telemetry: { vibration: 2.2, temperature: 28, sound: 50, efficiency: 95 },
        logs: [],
        maintenanceSuggestion: 'Schedule preventative lubrication'
    }
];

// SVG P-F Curve Chart (Degradation Model)
const DegradationChart = ({ health }: { health: number }) => {
    const width = 300;
    const height = 150;
    const padding = 20;
    
    // Create a curve representing asset life
    const curvePoints = [];
    for(let x=0; x<=100; x+=5) {
        // Inverse sigmoid-like curve for P-F interval
        const y = 100 - (100 / (1 + Math.exp(-0.1 * (x - 70)))); 
        // Map to SVG coordinates
        const svgX = padding + (x / 100) * (width - 2 * padding);
        const svgY = height - padding - (y / 100) * (height - 2 * padding);
        curvePoints.push(`${svgX},${svgY}`);
    }

    // Current point
    const currentX = padding + ((100 - health) / 100) * (width - 2 * padding);
    const currentY = height - padding - (health / 100) * (height - 2 * padding);

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
            <defs>
                <linearGradient id="gradeGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="60%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
            </defs>
            {/* Axis */}
            <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#e2e8f0" strokeWidth="1" />
            <line x1={padding} y1={padding} x2={padding} y2={height-padding} stroke="#e2e8f0" strokeWidth="1" />
            
            {/* Labels */}
            <text x={padding} y={10} className="text-[8px] fill-slate-400">100% Health</text>
            <text x={width-40} y={height-5} className="text-[8px] fill-slate-400">Failure</text>

            {/* The Curve */}
            <polyline points={curvePoints.join(' ')} fill="none" stroke="url(#gradeGradient)" strokeWidth="3" strokeLinecap="round" />
            
            {/* Current Status Marker */}
            <line x1={currentX} y1={currentY} x2={currentX} y2={height-padding} stroke="#64748b" strokeWidth="1" strokeDasharray="2,2" />
            <circle cx={currentX} cy={currentY} r="4" fill="white" stroke="#64748b" strokeWidth="2" />
            
            {/* Zone Labels */}
            <text x={padding + 20} y={height - padding - 80} className="text-[8px] fill-emerald-600 font-bold">Stable</text>
            <text x={width - padding - 40} y={height - padding - 20} className="text-[8px] fill-red-600 font-bold">P-F Interval</text>
        </svg>
    );
};

export const PredictiveMaintenance: React.FC = () => {
    const [selectedAsset, setSelectedAsset] = useState<PredictiveAsset | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [analyzingId, setAnalyzingId] = useState<string | null>(null);

    const filteredAssets = MOCK_PREDICTIVE_DATA.filter(a => 
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        a.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.branchId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const atRiskCount = filteredAssets.filter(a => a.healthScore < 50).length;
    const avgHealth = Math.round(filteredAssets.reduce((acc, curr) => acc + curr.healthScore, 0) / filteredAssets.length);

    const handleRunAnalysis = (id: string) => {
        setAnalyzingId(id);
        setTimeout(() => {
            setAnalyzingId(null);
            const asset = MOCK_PREDICTIVE_DATA.find(a => a.id === id);
            if(asset) setSelectedAsset(asset);
        }, 1500);
    };

    return (
        <div className="w-full h-full flex overflow-hidden bg-slate-50">
            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="p-8 pb-4 flex-shrink-0">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                                <BrainCircuit className="text-slate-400" /> Predictive Maintenance
                            </h1>
                            <p className="text-sm text-slate-500 mt-1 font-mono">/maintenance/predictive-analytics</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="bg-white p-2 rounded-lg border border-slate-200 flex items-center gap-4 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    <span className="text-xs font-bold text-slate-600">Model Accuracy: 94.2%</span>
                                </div>
                                <div className="h-4 w-px bg-slate-200"></div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                    <span className="text-xs font-bold text-slate-600">Live Telemetry</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <Card className="p-4 bg-white border-slate-200 group hover:border-red-300 transition-all">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Assets at Risk</p>
                                    <p className={`text-2xl font-black ${atRiskCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>{atRiskCount}</p>
                                </div>
                                <div className="p-2 bg-red-50 text-red-600 rounded-lg group-hover:bg-red-600 group-hover:text-white transition-colors">
                                    <AlertTriangle size={20} />
                                </div>
                            </div>
                            <div className="mt-3 text-[10px] text-slate-400">
                                <span className="font-bold text-red-600">Action Required</span> within 7 days
                            </div>
                        </Card>

                        <Card className="p-4 bg-white border-slate-200 group hover:border-blue-300 transition-all">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fleet Health</p>
                                    <p className="text-2xl font-black text-slate-800">{avgHealth}%</p>
                                </div>
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <Activity size={20} />
                                </div>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-4">
                                <div className={`h-full ${avgHealth > 80 ? 'bg-emerald-500' : avgHealth > 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${avgHealth}%` }}></div>
                            </div>
                        </Card>

                        <Card className="p-4 bg-white border-slate-200 group hover:border-indigo-300 transition-all">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Savings Projected</p>
                                    <p className="text-2xl font-black text-slate-800">฿240k</p>
                                </div>
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <TrendingDown size={20} />
                                </div>
                            </div>
                            <div className="mt-3 text-[10px] text-slate-400">
                                By avoiding unplanned downtime
                            </div>
                        </Card>

                        <Card className="p-4 bg-white border-slate-200 group hover:border-emerald-300 transition-all">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Sensors</p>
                                    <p className="text-2xl font-black text-slate-800">1,248</p>
                                </div>
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                    <Cpu size={20} />
                                </div>
                            </div>
                            <div className="mt-3 text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                <CheckCircle2 size={10} /> All systems online
                            </div>
                        </Card>
                    </div>

                    {/* Filter Bar */}
                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm mb-4">
                        <div className="relative group flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Search predictive assets..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none w-full transition-all"
                            />
                        </div>
                        <button className="text-slate-500 hover:bg-slate-50 p-2 rounded-lg transition-colors border border-transparent hover:border-slate-200">
                            <Filter size={18} />
                        </button>
                    </div>
                </div>

                {/* List View */}
                <div className="flex-1 overflow-auto px-8 pb-8">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Asset</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Health Score</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Predicted Failure</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Key Telemetry</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredAssets.map((asset) => (
                                    <tr 
                                        key={asset.id} 
                                        onClick={() => setSelectedAsset(asset)}
                                        className={`cursor-pointer transition-colors ${selectedAsset?.id === asset.id ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{asset.name}</div>
                                            <div className="text-[10px] text-slate-500 font-mono">{asset.id} • {asset.branchId}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 relative flex items-center justify-center">
                                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                                        <path className="text-slate-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                                        <path 
                                                            className={`${asset.healthScore > 80 ? 'text-emerald-500' : asset.healthScore > 50 ? 'text-amber-500' : 'text-red-500'} transition-all duration-1000 ease-out`} 
                                                            strokeDasharray={`${asset.healthScore}, 100`} 
                                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                                            fill="none" 
                                                            stroke="currentColor" 
                                                            strokeWidth="3" 
                                                        />
                                                    </svg>
                                                    <span className="absolute text-xs font-bold text-slate-700">{asset.healthScore}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={`text-[10px] font-bold uppercase ${asset.healthScore < 50 ? 'text-red-600' : 'text-slate-500'}`}>
                                                        {asset.healthScore < 50 ? 'Critical' : asset.healthScore < 80 ? 'Warning' : 'Healthy'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">Conf. {asset.confidence}%</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Timer size={14} className={asset.healthScore < 50 ? 'text-red-500' : 'text-slate-400'} />
                                                <span className={`text-sm font-mono font-medium ${asset.healthScore < 50 ? 'text-red-600' : 'text-slate-700'}`}>
                                                    {new Date(asset.predictedFailureDate).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-slate-400 ml-6">Est. RUL: {Math.floor((new Date(asset.predictedFailureDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24))} days</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <div className="bg-slate-50 px-2 py-1 rounded border border-slate-100 flex flex-col items-center min-w-[50px]">
                                                    <Waves size={10} className="text-blue-500 mb-1" />
                                                    <span className={`text-[10px] font-bold ${asset.telemetry.vibration > 5 ? 'text-red-600' : 'text-slate-700'}`}>{asset.telemetry.vibration}</span>
                                                </div>
                                                <div className="bg-slate-50 px-2 py-1 rounded border border-slate-100 flex flex-col items-center min-w-[50px]">
                                                    <Thermometer size={10} className="text-orange-500 mb-1" />
                                                    <span className={`text-[10px] font-bold ${asset.telemetry.temperature > 50 ? 'text-red-600' : 'text-slate-700'}`}>{asset.telemetry.temperature}°</span>
                                                </div>
                                                <div className="bg-slate-50 px-2 py-1 rounded border border-slate-100 flex flex-col items-center min-w-[50px]">
                                                    <Volume2 size={10} className="text-purple-500 mb-1" />
                                                    <span className="text-[10px] font-bold text-slate-700">{asset.telemetry.sound}dB</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleRunAnalysis(asset.id); }}
                                                disabled={analyzingId === asset.id}
                                                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ml-auto disabled:opacity-70"
                                            >
                                                {analyzingId === asset.id ? <Loader2 size={12} className="animate-spin" /> : <BrainCircuit size={12} />}
                                                {analyzingId === asset.id ? 'Analyzing...' : 'Analyze'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Asset Detail / AI Insight Panel */}
            <div className={`w-96 border-l border-slate-200 bg-white h-full transition-transform duration-300 transform ${selectedAsset ? 'translate-x-0' : 'translate-x-full'} absolute right-0 top-0 shadow-2xl z-20 flex flex-col`}>
                {selectedAsset && (
                    <>
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white border border-slate-200 px-2 py-0.5 rounded">{selectedAsset.category}</span>
                                <button onClick={() => setSelectedAsset(null)} className="text-slate-400 hover:text-slate-800"><ArrowRight size={20} /></button>
                            </div>
                            <h2 className="text-lg font-bold text-slate-900 leading-tight mb-1">{selectedAsset.name}</h2>
                            <p className="text-xs text-slate-500 font-mono">{selectedAsset.id}</p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            
                            {/* Degradation Model */}
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <BarChart3 size={14} /> P-F Degradation Curve
                                </h3>
                                <div className="h-40 w-full bg-slate-50 rounded-xl border border-slate-200 p-2">
                                    <DegradationChart health={selectedAsset.healthScore} />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2 text-center">Current position on degradation lifecycle</p>
                            </div>

                            {/* Telemetry Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Vibration</span>
                                    <span className={`text-lg font-mono font-bold ${selectedAsset.telemetry.vibration > 5 ? 'text-red-500' : 'text-slate-700'}`}>
                                        {selectedAsset.telemetry.vibration} <span className="text-[10px]">mm/s</span>
                                    </span>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Efficiency</span>
                                    <span className={`text-lg font-mono font-bold ${selectedAsset.telemetry.efficiency < 70 ? 'text-amber-500' : 'text-emerald-600'}`}>
                                        {selectedAsset.telemetry.efficiency}%
                                    </span>
                                </div>
                            </div>

                            {/* AI Diagnosis */}
                            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3 opacity-10"><BrainCircuit size={60} /></div>
                                <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <BrainCircuit size={14} /> AI Root Cause
                                </h4>
                                <ul className="space-y-2 mb-4">
                                    {selectedAsset.logs.length > 0 ? selectedAsset.logs.map((log, i) => (
                                        <li key={i} className="flex gap-2 text-xs text-indigo-800 bg-white/60 p-2 rounded">
                                            <AlertTriangle size={12} className="shrink-0 mt-0.5 text-indigo-500" />
                                            <span>{log.message}</span>
                                        </li>
                                    )) : (
                                        <li className="text-xs text-indigo-600 italic">No recent anomalies detected. System operating within normal parameters.</li>
                                    )}
                                </ul>
                                
                                <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                                    <span className="text-[10px] font-bold text-indigo-400 uppercase block mb-1">Recommendation</span>
                                    <p className="text-xs font-medium text-slate-700 leading-relaxed">
                                        {selectedAsset.maintenanceSuggestion}
                                    </p>
                                </div>
                            </div>

                        </div>

                        {/* Actions */}
                        <div className="p-4 border-t border-slate-200 bg-white space-y-2">
                            <button className="w-full py-2 bg-nt-dark text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                                <Wrench size={14} /> Generate Work Order
                            </button>
                            <button className="w-full py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors">
                                View Full History
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
