
import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { AssetLifecycle, AssetCondition, AssetCriticality } from '../../types';
import { 
    AlertTriangle, TrendingDown, DollarSign, Calendar, RefreshCw, 
    BarChart3, AlertOctagon, Search, Filter, ShieldAlert, Activity, 
    CheckCircle2, X, MoreHorizontal, ArrowUpRight, Zap, Fan, Server, 
    Box, Info, Layers, Wrench, Clock, FileText, List as ListIcon, 
    LayoutGrid, PieChart, Download, Plus, Trash2, Edit3, Grid2X2, ChevronRight
} from 'lucide-react';
import { db } from '../../services/database';

// --- Visual Helpers ---

const ConditionBadge: React.FC<{ condition: AssetCondition }> = ({ condition }) => {
    const styles = {
        'Excellent': 'bg-emerald-50 text-emerald-700 border-emerald-200',
        'Good': 'bg-blue-50 text-blue-700 border-blue-200',
        'Fair': 'bg-yellow-50 text-yellow-700 border-yellow-200',
        'Poor': 'bg-orange-50 text-orange-700 border-orange-200',
        'End-of-Life': 'bg-red-50 text-red-700 border-red-200 animate-pulse'
    };
    return (
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${styles[condition]}`}>
            {condition}
        </span>
    );
};

const CriticalityBadge: React.FC<{ level: AssetCriticality }> = ({ level }) => {
    const styles = {
        'Mission Critical': 'text-red-600 bg-red-50 border-red-100',
        'Business Critical': 'text-amber-600 bg-amber-50 border-amber-100',
        'Support': 'text-slate-600 bg-slate-50 border-slate-100'
    };
    return (
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${styles[level]}`}>
            {level === 'Mission Critical' ? 'Mission Critical' : level === 'Business Critical' ? 'Business Crit' : 'Support'}
        </span>
    );
};

const CategoryIcon: React.FC<{ category: string }> = ({ category }) => {
    switch (category) {
        case 'HVAC': return <Fan size={14} className="text-cyan-500" />;
        case 'Electrical': return <Zap size={14} className="text-yellow-500" />;
        case 'IT Infra': return <Server size={14} className="text-indigo-500" />;
        case 'Plumbing': return <Box size={14} className="text-blue-500" />;
        default: return <Box size={14} className="text-slate-400" />;
    }
};

// --- Charts ---

const CapExChart = ({ data }: { data: { year: number; cost: number; critical: boolean }[] }) => {
    const height = 250;
    const width = 800;
    const maxVal = Math.max(...data.map(d => d.cost)) * 1.2;
    const padding = 40;
    
    return (
        <div className="w-full h-full overflow-hidden">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                {/* Grid */}
                {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                    <g key={i}>
                        <line x1={padding} y1={height - padding - (height - 2*padding)*p} x2={width} y2={height - padding - (height - 2*padding)*p} stroke="#f1f5f9" strokeWidth="1" />
                        <text x={padding - 10} y={height - padding - (height - 2*padding)*p + 4} textAnchor="end" className="text-[10px] fill-slate-400 font-mono">
                            {((maxVal * p) / 1000000).toFixed(1)}M
                        </text>
                    </g>
                ))}
                
                {/* Bars */}
                {data.map((d, i) => {
                    const barHeight = (d.cost / maxVal) * (height - 2 * padding);
                    const barWidth = (width - padding * 2) / data.length * 0.5;
                    const x = padding + 40 + i * ((width - padding) / data.length);
                    const y = height - padding - barHeight;
                    
                    return (
                        <g key={i} className="group">
                            <defs>
                                <linearGradient id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={d.critical ? '#ef4444' : '#3b82f6'} />
                                    <stop offset="100%" stopColor={d.critical ? '#b91c1c' : '#1d4ed8'} />
                                </linearGradient>
                            </defs>
                            <rect 
                                x={x} 
                                y={y} 
                                width={barWidth} 
                                height={barHeight} 
                                rx={4}
                                fill={`url(#grad-${i})`}
                                className="opacity-90 group-hover:opacity-100 transition-all cursor-pointer hover:drop-shadow-lg"
                            />
                            <text x={x + barWidth/2} y={y - 10} textAnchor="middle" className="text-[10px] fill-slate-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-white">
                                ฿{(d.cost / 1000000).toFixed(2)}M
                            </text>
                            <text x={x + barWidth/2} y={height - 20} textAnchor="middle" className="text-[12px] fill-slate-600 font-bold font-mono">
                                {d.year}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

const RiskMatrix = ({ assets, onSelect }: { assets: AssetLifecycle[], onSelect: (a: AssetLifecycle) => void }) => {
    return (
        <div className="w-full h-[500px] border border-slate-200 bg-slate-50 relative rounded-xl overflow-hidden">
            {/* Background Quadrants */}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                <div className="bg-yellow-50/50 border-r border-b border-slate-200 p-4 flex flex-col justify-end items-end">
                    <span className="text-xs font-black text-yellow-600/30 uppercase tracking-[0.2em]">Monitor</span>
                </div>
                <div className="bg-red-50/50 border-b border-slate-200 p-4 flex flex-col justify-end items-end">
                    <span className="text-xs font-black text-red-600/30 uppercase tracking-[0.2em]">Critical</span>
                </div>
                <div className="bg-emerald-50/50 border-r border-slate-200 p-4 flex flex-col justify-end items-end">
                    <span className="text-xs font-black text-emerald-600/30 uppercase tracking-[0.2em]">Low Risk</span>
                </div>
                <div className="bg-yellow-50/50 p-4 flex flex-col justify-end items-end">
                    <span className="text-xs font-black text-yellow-600/30 uppercase tracking-[0.2em]">Plan</span>
                </div>
            </div>

            {/* Labels */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-bold text-slate-400 uppercase tracking-widest origin-center">Probability of Failure (PoF)</div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-400 uppercase tracking-widest">Consequence of Failure (CoF)</div>

            {/* Plots */}
            {assets.map((a, i) => {
                const y = a.riskScore; 
                // Map criticality to X axis (CoF)
                const x = a.criticality === 'Mission Critical' ? 85 : a.criticality === 'Business Critical' ? 50 : 20;
                
                // Add jitter to prevent overlap
                const jX = (Math.sin(i) * 5); 
                const jY = (Math.cos(i) * 5);

                const size = a.replacementCost > 1000000 ? 16 : 10;
                const color = a.category === 'HVAC' ? 'bg-cyan-500' : a.category === 'Electrical' ? 'bg-yellow-500' : 'bg-indigo-500';

                return (
                    <div 
                        key={i}
                        onClick={() => onSelect(a)}
                        className={`absolute rounded-full border-2 border-white shadow-sm cursor-pointer transition-all hover:scale-125 hover:z-20 group ${color}`}
                        style={{ 
                            bottom: `${Math.max(5, Math.min(95, y + jY))}%`, 
                            left: `${Math.max(5, Math.min(95, x + jX))}%`,
                            width: size,
                            height: size
                        }}
                    >
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-slate-900 text-white text-[10px] p-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-30 shadow-xl">
                            <p className="font-bold truncate">{a.name}</p>
                            <p className="text-slate-400">Risk: {a.riskScore}/100</p>
                            <p className="text-slate-400">Cost: {(a.replacementCost/1000).toFixed(0)}k</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// --- Main Component ---

export const AssetLifecycleManager: React.FC = () => {
    const [assets, setAssets] = useState<AssetLifecycle[]>([]);
    const [viewMode, setViewMode] = useState<'list' | 'risk' | 'planning'>('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAsset, setSelectedAsset] = useState<AssetLifecycle | null>(null);
    const [filterCategory, setFilterCategory] = useState<string>('All');

    useEffect(() => {
        db.getAssets().then(setAssets).catch(console.error);
    }, []);

    // --- Metrics ---
    const totalCRV = assets.reduce((acc, curr) => acc + curr.replacementCost, 0);
    const deferredMaintenance = assets
        .filter(a => a.condition === 'Poor' || a.condition === 'End-of-Life')
        .reduce((acc, curr) => acc + curr.replacementCost, 0);
    const fciScore = totalCRV > 0 ? deferredMaintenance / totalCRV : 0;
    const forecast = Array.from({ length: 5 }).map((_, i) => {
        const year = new Date().getFullYear() + i;
        const assetsDue = assets.filter(a => {
            const endYear = a.installDate.getFullYear() + a.expectedLifeYears;
            return endYear === year;
        });
        return {
            year,
            cost: assetsDue.reduce((acc, curr) => acc + curr.replacementCost, 0),
            critical: assetsDue.some(a => a.criticality === 'Mission Critical')
        };
    });

    const filteredAssets = assets.filter(a => {
        const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              a.branchId.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'All' || a.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="w-full h-full flex overflow-hidden bg-slate-50">
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                
                {/* Header Section */}
                <div className="p-8 pb-4 flex-shrink-0">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                                <BarChart3 className="text-slate-400" /> วงจรชีวิตทรัพย์สินเชิงกลยุทธ์
                            </h1>
                            <p className="text-sm text-slate-500 mt-1 font-mono">/strategy/asset-lifecycle</p>
                        </div>
                        <div className="flex gap-3">
                            <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
                                <Download size={16} /> ส่งออกรายงาน
                            </button>
                            <button className="bg-nt-dark text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-md">
                                <Plus size={16} /> ลงทะเบียนทรัพย์สิน
                            </button>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <Card className="p-4 bg-white border-slate-200 group hover:border-blue-300 transition-all">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">มูลค่าทรัพย์สินรวม (CRV)</p>
                                    <p className="text-2xl font-black text-slate-800 font-mono">฿{(totalCRV / 1000000).toFixed(1)}M</p>
                                </div>
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><DollarSign size={20} /></div>
                            </div>
                            <div className="mt-3 text-[10px] text-slate-400 flex items-center gap-1">
                                <Activity size={10} className="text-blue-500" /> Active Valuation
                            </div>
                        </Card>

                        <Card className={`p-4 border-slate-200 group transition-all ${fciScore > 0.1 ? 'border-red-300 bg-red-50/20' : 'hover:border-emerald-300'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ดัชนีสภาพ (FCI)</p>
                                    <p className={`text-2xl font-black ${fciScore > 0.1 ? 'text-red-600' : 'text-emerald-600'}`}>{(fciScore * 100).toFixed(1)}%</p>
                                </div>
                                <div className={`p-2 rounded-lg ${fciScore > 0.1 ? 'bg-red-100 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                    <Activity size={20} />
                                </div>
                            </div>
                            <div className="mt-3">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${fciScore > 0.1 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {fciScore > 0.1 ? 'Critical' : 'Good'} Condition
                                </span>
                            </div>
                        </Card>

                        <Card className="p-4 bg-white border-slate-200 group hover:border-amber-300 transition-all">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">งานซ่อมบำรุงคงค้าง</p>
                                    <p className="text-2xl font-black text-amber-600 font-mono">฿{(deferredMaintenance / 1000000).toFixed(2)}M</p>
                                </div>
                                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><AlertTriangle size={20} /></div>
                            </div>
                            <div className="mt-3 text-[10px] text-slate-400">Backlog for Poor/EOL Assets</div>
                        </Card>

                        <Card className="p-4 bg-white border-slate-200 group hover:border-indigo-300 transition-all">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">CapEx 5 ปี</p>
                                    <p className="text-2xl font-black text-indigo-600 font-mono">฿{(forecast.reduce((a, b) => a + b.cost, 0) / 1000000).toFixed(1)}M</p>
                                </div>
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Calendar size={20} /></div>
                            </div>
                            <div className="mt-3 text-[10px] text-slate-400">Forecasted Capital Need</div>
                        </Card>
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text"
                                    placeholder="ค้นหาทรัพย์สิน, รหัส..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none w-64 transition-all"
                                />
                            </div>
                            <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
                            <div className="flex gap-2">
                                {['All', 'HVAC', 'Electrical', 'IT Infra'].map(cat => (
                                    <button 
                                        key={cat}
                                        onClick={() => setFilterCategory(cat)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterCategory === cat ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                            <button 
                                onClick={() => setViewMode('list')}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <ListIcon size={14} /> ทะเบียน
                            </button>
                            <button 
                                onClick={() => setViewMode('risk')}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'risk' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Grid2X2 size={14} /> ความเสี่ยง
                            </button>
                            <button 
                                onClick={() => setViewMode('planning')}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'planning' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <TrendingDown size={14} /> แผนงาน
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Switching */}
                <div className="flex-1 overflow-auto px-8 pb-8">
                    
                    {/* LIST VIEW */}
                    {viewMode === 'list' && (
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">ชื่อทรัพย์สิน</th>
                                        <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">อายุการใช้งาน</th>
                                        <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">สภาพ</th>
                                        <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">ความสำคัญ</th>
                                        <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider text-right">มูลค่าทดแทน</th>
                                        <th className="px-6 py-4 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredAssets.map(asset => {
                                        const age = new Date().getFullYear() - asset.installDate.getFullYear();
                                        const lifePct = (age / asset.expectedLifeYears) * 100;
                                        return (
                                            <tr 
                                                key={asset.id} 
                                                onClick={() => setSelectedAsset(asset)}
                                                className={`cursor-pointer transition-colors ${selectedAsset?.id === asset.id ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-slate-100 rounded-lg text-slate-500 border border-slate-200">
                                                            <CategoryIcon category={asset.category} />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-800">{asset.name}</div>
                                                            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                                                                {asset.id} <span className="w-1 h-1 rounded-full bg-slate-300"></span> {asset.branchId}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1 w-32">
                                                        <div className="flex justify-between text-[10px] text-slate-500">
                                                            <span>{age} ปี</span>
                                                            <span>Max: {asset.expectedLifeYears}</span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className={`h-full ${lifePct > 100 ? 'bg-red-500' : lifePct > 75 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, lifePct)}%` }}></div>
                                                        </div>
                                                        <span className="text-[9px] text-slate-400">ติดตั้ง: {asset.installDate.getFullYear()}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4"><ConditionBadge condition={asset.condition} /></td>
                                                <td className="px-6 py-4"><CriticalityBadge level={asset.criticality} /></td>
                                                <td className="px-6 py-4 text-right font-mono font-medium text-slate-700">฿{(asset.replacementCost / 1000).toFixed(0)}k</td>
                                                <td className="px-6 py-4 text-right text-slate-400"><ChevronRight size={16} /></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* RISK VIEW */}
                    {viewMode === 'risk' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                            <div className="lg:col-span-2">
                                <Card title="เมทริกซ์ความเสี่ยง (Risk Matrix)" className="h-full">
                                    <div className="p-6 h-full">
                                        <RiskMatrix assets={filteredAssets} onSelect={setSelectedAsset} />
                                    </div>
                                </Card>
                            </div>
                            <div className="space-y-4">
                                <Card title="ทรัพย์สินเสี่ยงสูง (Top Risks)">
                                    <div className="divide-y divide-slate-100">
                                        {assets.sort((a, b) => b.riskScore - a.riskScore).slice(0, 5).map(asset => (
                                            <div key={asset.id} onClick={() => setSelectedAsset(asset)} className="p-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="text-xs font-bold bg-red-100 text-red-600 px-2 py-1 rounded">{asset.riskScore}</div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800">{asset.name}</p>
                                                        <p className="text-[10px] text-slate-400">{asset.branchId}</p>
                                                    </div>
                                                </div>
                                                <ArrowUpRight size={14} className="text-slate-300" />
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Info size={16} className="text-blue-600" />
                                        <h4 className="text-xs font-bold text-blue-800">คำแนะนำกลยุทธ์</h4>
                                    </div>
                                    <p className="text-xs text-blue-700 leading-relaxed">
                                        ทรัพย์สินในโซน <strong>Critical</strong> ควรมีแผนการเปลี่ยนทดแทนทันที หรือเพิ่มความถี่ในการตรวจสอบ (PM) เป็น 2 เท่า
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PLANNING VIEW */}
                    {viewMode === 'planning' && (
                        <div className="space-y-6">
                            <Card title="แผนการใช้จ่ายเงินทุน 5 ปี (CapEx Forecast)">
                                <div className="p-6">
                                    <CapExChart data={forecast} />
                                </div>
                            </Card>
                            
                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                    <h3 className="font-bold text-sm text-slate-700">รายการทรัพย์สินที่ครบกำหนดเปลี่ยน (Upcoming Replacements)</h3>
                                    <button className="text-xs text-blue-600 font-bold hover:underline">ดูแผนทั้งหมด</button>
                                </div>
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-white border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-3 font-bold text-slate-500 text-xs uppercase">ทรัพย์สิน</th>
                                            <th className="px-6 py-3 font-bold text-slate-500 text-xs uppercase">ปีที่ครบกำหนด</th>
                                            <th className="px-6 py-3 font-bold text-slate-500 text-xs uppercase">งบประมาณที่ต้องใช้</th>
                                            <th className="px-6 py-3 font-bold text-slate-500 text-xs uppercase">สถานะแผน</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {assets.filter(a => a.condition === 'End-of-Life' || a.condition === 'Poor').map(asset => (
                                            <tr key={asset.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-3 font-bold text-slate-700">{asset.name}</td>
                                                <td className="px-6 py-3 font-mono text-slate-600">{asset.installDate.getFullYear() + asset.expectedLifeYears}</td>
                                                <td className="px-6 py-3 font-mono font-bold text-slate-800">฿{asset.replacementCost.toLocaleString()}</td>
                                                <td className="px-6 py-3">
                                                    <span className="px-2 py-1 rounded bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-100 uppercase">Pending Approval</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Slide-over Asset Detail Panel */}
            <div className={`w-96 border-l border-slate-200 bg-white h-full transition-transform duration-300 transform ${selectedAsset ? 'translate-x-0' : 'translate-x-full'} absolute right-0 top-0 shadow-2xl z-20 flex flex-col`}>
                {selectedAsset && (
                    <>
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white border border-slate-200 px-2 py-0.5 rounded">{selectedAsset.category}</span>
                                <button onClick={() => setSelectedAsset(null)} className="text-slate-400 hover:text-slate-800 p-1 rounded-full hover:bg-slate-100"><X size={20} /></button>
                            </div>
                            <h2 className="text-lg font-bold text-slate-900 leading-tight mb-1">{selectedAsset.name}</h2>
                            <p className="text-xs text-slate-500 font-mono">{selectedAsset.id}</p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Key Stats Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">สภาพปัจจุบัน</span>
                                    <ConditionBadge condition={selectedAsset.condition} />
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">ความเสี่ยง</span>
                                    <span className={`text-lg font-black ${selectedAsset.riskScore > 50 ? 'text-red-600' : 'text-slate-700'}`}>
                                        {selectedAsset.riskScore}/100
                                    </span>
                                </div>
                            </div>

                            {/* Lifecycle Stage */}
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2"><Clock size={14} /> สถานะวงจรชีวิต</h3>
                                <div className="relative pt-2 px-1">
                                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -z-10"></div>
                                    <div className="flex justify-between">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm"></div>
                                            <span className="text-[9px] text-slate-500 font-bold">Install</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm"></div>
                                            <span className="text-[9px] text-slate-500 font-bold">O&M</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${selectedAsset.condition === 'End-of-Life' ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                                            <span className="text-[9px] text-slate-500 font-bold">Retire</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-center mt-3 text-slate-600 bg-slate-50 p-2 rounded">
                                    อายุการใช้งานคงเหลือ: <strong>{selectedAsset.expectedLifeYears - (new Date().getFullYear() - selectedAsset.installDate.getFullYear())} ปี</strong>
                                </p>
                            </div>

                            {/* Financials */}
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2"><DollarSign size={14} /> ข้อมูลการเงิน</h3>
                                <div className="space-y-3 bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">วันที่ติดตั้ง</span>
                                        <span className="font-mono text-slate-800">{selectedAsset.installDate.toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">ราคาซื้อ</span>
                                        <span className="font-mono text-slate-800">฿{selectedAsset.purchaseCost.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-50">
                                        <span className="text-slate-500 font-bold">มูลค่าทดแทน (CRV)</span>
                                        <span className="font-mono font-bold text-blue-600">฿{selectedAsset.replacementCost.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                <h4 className="text-xs font-bold text-indigo-900 mb-2">System Recommendation</h4>
                                <p className="text-xs text-indigo-700 leading-relaxed mb-3">
                                    {selectedAsset.riskScore > 70 
                                        ? "ความเสี่ยงสูง ควรพิจารณาเปลี่ยนทดแทนภายในปีงบประมาณนี้ หรือทำ Overhaul ใหญ่" 
                                        : "สถานะปกติ แนะนำให้ทำ PM ตามรอบปกติเพื่อยืดอายุการใช้งาน"}
                                </p>
                                <button className="w-full py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded text-xs font-bold hover:bg-indigo-50 transition-colors">
                                    ดูประวัติการซ่อมบำรุง
                                </button>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-slate-200 bg-white space-y-2">
                            <button className="w-full py-2 bg-nt-dark text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                                <Wrench size={14} /> สร้างใบงานซ่อม
                            </button>
                            <div className="flex gap-2">
                                <button className="flex-1 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                                    <Edit3 size={14} /> แก้ไข
                                </button>
                                <button className="flex-1 py-2 bg-red-50 border border-red-100 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                                    <Trash2 size={14} /> จำหน่าย
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
