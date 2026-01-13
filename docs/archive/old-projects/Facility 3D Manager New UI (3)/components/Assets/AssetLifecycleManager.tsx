
import React, { useState, useMemo } from 'react';
import { Card } from '../ui/Card';
import { AssetLifecycle, AssetCondition } from '../../types';
import { AlertTriangle, TrendingDown, DollarSign, Calendar, RefreshCw, BarChart3, AlertOctagon, Search, Filter, ShieldAlert } from 'lucide-react';

const MOCK_ASSETS: AssetLifecycle[] = [
    { id: 'CH-BKK-01', name: 'Main Chiller Unit 1', category: 'HVAC', branchId: 'Bangrak', installDate: new Date('2015-06-01'), expectedLifeYears: 15, purchaseCost: 2500000, replacementCost: 3200000, condition: 'Fair', criticality: 'Mission Critical', lastAssessmentDate: new Date('2024-01-15'), riskScore: 78 },
    { id: 'GEN-NON-01', name: 'Backup Generator 500kVA', category: 'Electrical', branchId: 'Nonthaburi', installDate: new Date('2010-03-15'), expectedLifeYears: 20, purchaseCost: 1800000, replacementCost: 2400000, condition: 'Good', criticality: 'Mission Critical', lastAssessmentDate: new Date('2024-02-10'), riskScore: 45 },
    { id: 'UPS-CM-02', name: 'UPS Modular Rack B', category: 'IT Infra', branchId: 'Chiang Mai', installDate: new Date('2018-11-20'), expectedLifeYears: 8, purchaseCost: 850000, replacementCost: 950000, condition: 'Poor', criticality: 'Business Critical', lastAssessmentDate: new Date('2024-04-01'), riskScore: 85 },
    { id: 'AHU-PKT-05', name: 'AHU Rooftop Unit', category: 'HVAC', branchId: 'Phuket', installDate: new Date('2012-08-05'), expectedLifeYears: 12, purchaseCost: 450000, replacementCost: 600000, condition: 'End-of-Life', criticality: 'Business Critical', lastAssessmentDate: new Date('2024-03-20'), riskScore: 95 },
    { id: 'PUMP-KK-01', name: 'Fire Pump System', category: 'Safety', branchId: 'Khon Kaen', installDate: new Date('2016-01-10'), expectedLifeYears: 20, purchaseCost: 350000, replacementCost: 420000, condition: 'Excellent', criticality: 'Mission Critical', lastAssessmentDate: new Date('2023-12-12'), riskScore: 15 },
    { id: 'LTG-SR-ALL', name: 'LED Retrofit Phase 1', category: 'Electrical', branchId: 'Sriracha', installDate: new Date('2021-05-01'), expectedLifeYears: 10, purchaseCost: 1200000, replacementCost: 1100000, condition: 'Good', criticality: 'Support', lastAssessmentDate: new Date('2024-01-05'), riskScore: 20 },
];

const ConditionBadge: React.FC<{ condition: AssetCondition }> = ({ condition }) => {
    const styles = {
        'Excellent': 'bg-emerald-100 text-emerald-700',
        'Good': 'bg-blue-100 text-blue-700',
        'Fair': 'bg-yellow-100 text-yellow-700',
        'Poor': 'bg-orange-100 text-orange-700',
        'End-of-Life': 'bg-red-100 text-red-700 border border-red-200 animate-pulse'
    };
    return <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${styles[condition]}`}>{condition}</span>;
};

// SVG Bar Chart for 5-Year CapEx Forecast
const CapExChart = ({ data }: { data: { year: number; cost: number; critical: boolean }[] }) => {
    const height = 180;
    const width = 500;
    const maxVal = Math.max(...data.map(d => d.cost)) * 1.2;
    const padding = 40;
    const barWidth = 40;

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                <line key={i} x1={padding} y1={height - padding - (height - 2*padding)*p} x2={width} y2={height - padding - (height - 2*padding)*p} stroke="#f1f5f9" strokeWidth="1" />
            ))}
            
            {data.map((d, i) => {
                const barHeight = (d.cost / maxVal) * (height - 2 * padding);
                const x = padding + 20 + i * ((width - padding) / data.length);
                const y = height - padding - barHeight;
                
                return (
                    <g key={i}>
                        <rect 
                            x={x} 
                            y={y} 
                            width={barWidth} 
                            height={barHeight} 
                            rx={4}
                            className={`${d.critical ? 'fill-red-500' : 'fill-blue-500'} hover:opacity-80 transition-all`}
                        />
                        <text x={x + barWidth/2} y={y - 5} textAnchor="middle" className="text-[10px] fill-slate-500 font-bold">
                            {(d.cost / 1000000).toFixed(1)}M
                        </text>
                        <text x={x + barWidth/2} y={height - 10} textAnchor="middle" className="text-[10px] fill-slate-400 font-mono">
                            {d.year}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
};

export const AssetLifecycleManager: React.FC = () => {
    const [assets] = useState<AssetLifecycle[]>(MOCK_ASSETS);
    const [budgetCutScenario, setBudgetCutScenario] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // --- Calculations for Professional FM Metrics ---
    
    // 1. Total Replacement Value (CRV)
    const totalCRV = assets.reduce((acc, curr) => acc + curr.replacementCost, 0);
    
    // 2. Deferred Maintenance (Backlog) - Assets that are Poor or EOL
    const deferredMaintenance = assets
        .filter(a => a.condition === 'Poor' || a.condition === 'End-of-Life')
        .reduce((acc, curr) => acc + curr.replacementCost, 0);

    // 3. Facility Condition Index (FCI) = Deferred Maintenance / CRV
    // FCI < 0.05 (Good), 0.05-0.10 (Fair), > 0.10 (Poor)
    const fciScore = deferredMaintenance / totalCRV;
    const fciStatus = fciScore < 0.05 ? 'Good' : fciScore < 0.10 ? 'Fair' : 'Critical';

    // 4. CapEx Forecast Logic
    const currentYear = new Date().getFullYear();
    const forecast = Array.from({ length: 5 }).map((_, i) => {
        const year = currentYear + i;
        const assetsDue = assets.filter(a => {
            const endYear = a.installDate.getFullYear() + a.expectedLifeYears;
            // Shift assets if budget is cut (simulate deferral)
            if (budgetCutScenario && a.criticality !== 'Mission Critical') {
                 return endYear === year - 1; // Pushed back logic simulated simple here
            }
            return endYear === year;
        });
        
        return {
            year,
            cost: assetsDue.reduce((acc, curr) => acc + curr.replacementCost, 0),
            critical: assetsDue.some(a => a.criticality === 'Mission Critical')
        };
    });

    const filteredAssets = assets.filter(a => 
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        a.branchId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="w-full h-full flex flex-col bg-slate-50 overflow-hidden">
            <div className="p-8 pb-4 flex-shrink-0">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                            <BarChart3 className="text-slate-400" /> Strategic Asset Lifecycle
                        </h1>
                        <p className="text-sm text-slate-500 mt-1 font-mono">/strategy/capital-planning</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500 uppercase">Scenario:</span>
                        <button 
                            onClick={() => setBudgetCutScenario(!budgetCutScenario)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${budgetCutScenario ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-slate-200 text-slate-600'}`}
                        >
                            {budgetCutScenario ? '⚠️ Budget Cut (-20%) Applied' : 'Standard Budget'}
                        </button>
                    </div>
                </div>

                {/* KPI Dashboard - The "C-Suite View" */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card className="p-4 bg-white border-slate-200">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Asset Value (CRV)</p>
                        <div className="flex items-center gap-2">
                            <DollarSign className="text-slate-300" size={20} />
                            <p className="text-2xl font-black text-slate-800">{(totalCRV / 1000000).toFixed(1)}M</p>
                        </div>
                    </Card>
                    
                    <Card className={`p-4 border-slate-200 ${fciScore > 0.1 ? 'bg-red-50/20' : 'bg-white'}`}>
                        <div className="flex justify-between">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Deferred Backlog</p>
                            <AlertTriangle size={14} className={fciScore > 0.1 ? 'text-red-500' : 'text-slate-300'} />
                        </div>
                        <p className={`text-2xl font-black ${fciScore > 0.1 ? 'text-red-600' : 'text-slate-800'}`}>
                            ฿{(deferredMaintenance / 1000000).toFixed(2)}M
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">Immediate capital requirement</p>
                    </Card>

                    <Card className="p-4 bg-white border-slate-200">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">FCI Score</p>
                        <div className="flex items-end gap-2">
                            <p className={`text-2xl font-black ${fciStatus === 'Critical' ? 'text-red-600' : fciStatus === 'Fair' ? 'text-amber-500' : 'text-emerald-600'}`}>
                                {(fciScore * 100).toFixed(1)}%
                            </p>
                            <span className="text-xs font-bold text-slate-400 mb-1">({fciStatus})</span>
                        </div>
                    </Card>

                    <Card className="p-4 bg-slate-900 text-white border-slate-800">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">5-Year CapEx Need</p>
                        <div className="flex items-center gap-2">
                            <TrendingDown className="text-red-400" size={20} />
                            <p className="text-2xl font-black text-white">
                                ฿{(forecast.reduce((a, b) => a + b.cost, 0) / 1000000).toFixed(1)}M
                            </p>
                        </div>
                    </Card>
                </div>
            </div>

            <div className="flex-1 overflow-auto px-8 pb-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* 5-Year Forecast Chart */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card title="5-Year Capital Expenditure Forecast" className="min-h-[300px]">
                            <div className="p-4 h-64">
                                <CapExChart data={forecast} />
                            </div>
                            <div className="px-6 pb-4 text-xs text-slate-500 flex gap-6">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded"></div> Mission Critical (Must Do)</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded"></div> Standard Replacement</div>
                            </div>
                        </Card>

                        {/* Asset List */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 text-sm">Asset Registry & Condition</h3>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Filter assets..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md outline-none w-48"
                                    />
                                </div>
                            </div>
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-3">Asset Name</th>
                                        <th className="px-6 py-3">Install Date</th>
                                        <th className="px-6 py-3">Age / Life</th>
                                        <th className="px-6 py-3">Condition</th>
                                        <th className="px-6 py-3 text-right">Replacement Cost</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredAssets.map(asset => {
                                        const age = new Date().getFullYear() - asset.installDate.getFullYear();
                                        const lifePct = (age / asset.expectedLifeYears) * 100;
                                        return (
                                            <tr key={asset.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-3">
                                                    <div className="font-bold text-slate-700">{asset.name}</div>
                                                    <div className="text-[10px] text-slate-400">{asset.branchId} • {asset.category}</div>
                                                </td>
                                                <td className="px-6 py-3 font-mono text-slate-600">{asset.installDate.toLocaleDateString()}</td>
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className={`h-full ${lifePct > 100 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, lifePct)}%` }}></div>
                                                        </div>
                                                        <span className="text-[10px]">{age} / {asset.expectedLifeYears} yrs</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <ConditionBadge condition={asset.condition} />
                                                </td>
                                                <td className="px-6 py-3 text-right font-mono font-medium">
                                                    ฿{asset.replacementCost.toLocaleString()}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Risk Matrix & Top Offenders */}
                    <div className="space-y-6">
                        <Card title="Risk Analysis Matrix">
                            <div className="p-4 relative h-64 border-b border-l border-slate-200 m-4 bg-[linear-gradient(45deg,#f8fafc_25%,transparent_25%,transparent_75%,#f8fafc_75%,#f8fafc),linear-gradient(45deg,#f8fafc_25%,transparent_25%,transparent_75%,#f8fafc_75%,#f8fafc)] bg-[length:20px_20px]">
                                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                                    <div className="bg-yellow-50/50 border-r border-b border-slate-100 flex items-start justify-end p-2"><span className="text-[9px] font-bold text-yellow-600 uppercase">Monitor</span></div>
                                    <div className="bg-red-50/50 border-b border-slate-100 flex items-start justify-end p-2"><span className="text-[9px] font-bold text-red-600 uppercase">Critical Action</span></div>
                                    <div className="bg-emerald-50/50 border-r border-slate-100 flex items-end justify-start p-2"><span className="text-[9px] font-bold text-emerald-600 uppercase">Run to Fail</span></div>
                                    <div className="bg-yellow-50/50 flex items-end justify-start p-2"><span className="text-[9px] font-bold text-yellow-600 uppercase">Plan</span></div>
                                </div>
                                {/* Label Axis */}
                                <div className="absolute -left-6 top-1/2 -rotate-90 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Likelihood of Failure</div>
                                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Business Impact</div>

                                {/* Plot Assets */}
                                {assets.map((a, i) => {
                                    // Calculate simplistic X/Y for demo
                                    const y = a.riskScore; // 100 = Top (High Risk)
                                    const x = a.criticality === 'Mission Critical' ? 80 : a.criticality === 'Business Critical' ? 50 : 20;
                                    // Add randomness for visual separation
                                    const vizX = x + (i * 5) % 10;
                                    const vizY = y - (i * 2) % 5;
                                    return (
                                        <div 
                                            key={i} 
                                            className={`absolute w-3 h-3 rounded-full border-2 border-white shadow-md transform -translate-x-1/2 -translate-y-1/2 hover:scale-150 transition-transform cursor-help
                                            ${a.category === 'HVAC' ? 'bg-blue-500' : a.category === 'Electrical' ? 'bg-yellow-500' : 'bg-slate-500'}`}
                                            style={{ bottom: `${vizY}%`, left: `${vizX}%` }}
                                            title={`${a.name} (Risk: ${a.riskScore})`}
                                        ></div>
                                    );
                                })}
                            </div>
                            <div className="px-6 pb-4 flex flex-wrap gap-4 text-[10px] text-slate-500 justify-center">
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> HVAC</span>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500"></div> Electrical</span>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-500"></div> Infra</span>
                            </div>
                        </Card>

                        <div className="bg-red-50 border border-red-100 rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-red-100 text-red-600 rounded-lg"><ShieldAlert size={18} /></div>
                                <h3 className="font-bold text-red-900 text-sm">Critical Replacement Required</h3>
                            </div>
                            <p className="text-xs text-red-700 leading-relaxed mb-4">
                                <strong>AHU Rooftop Unit (Phuket)</strong> has reached End-of-Life and poses a 95% failure risk this quarter. Immediate CapEx allocation of ฿600k required.
                            </p>
                            <button className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm">
                                Create Capital Request
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
