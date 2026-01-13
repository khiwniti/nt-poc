
import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { 
  BrainCircuit, TrendingUp, Zap, Activity, Cpu, Workflow,
  BarChart3, Timer, PieChart, History, Download, AlertTriangle,
  Search, CheckCircle2, ChevronRight, AlertOctagon, RefreshCw,
  MoreHorizontal, Layers, Wind, Leaf
} from 'lucide-react';

interface IntelligenceHubProps {
  branches: any[];
}

// --- Visual Components ---

const Sparkline = ({ data, color, height = 30 }: { data: number[], color: string, height?: number }) => {
    const width = 120;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const step = width / (data.length - 1);
    
    const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`).join(' ');

    return (
        <svg width={width} height={height} className="overflow-visible opacity-80">
            <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={width} cy={height - ((data[data.length-1] - min) / range) * height} r="2" fill={color} className="animate-pulse" />
        </svg>
    );
};

const Gauge = ({ value, min, max, label, unit, color = "#3b82f6" }: { value: number, min: number, max: number, label: string, unit: string, color?: string }) => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center relative">
            <svg width="100" height="100" className="transform -rotate-90">
                <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
                <circle 
                    cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="8" 
                    strokeDasharray={circumference} 
                    strokeDashoffset={offset} 
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-slate-700 leading-none">{value}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">{unit}</span>
            </div>
            <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase">{label}</span>
        </div>
    );
};

const ForecastChart = () => {
  const width = 600;
  const height = 220;
  const padding = 30;
  
  const historical = [42, 45, 48, 46, 52, 55, 58]; 
  const projected = [58, 62, 60, 65, 68, 72, 70];
  const combined = [...historical, ...projected];
  const max = Math.max(...combined) * 1.2;
  const min = Math.min(...combined) * 0.8;

  const getX = (i: number) => padding + (i * (width - padding * 2) / (combined.length - 1));
  const getY = (v: number) => height - padding - ((v - min) / (max - min) * (height - 2 * padding));

  const historyPoints = historical.map((v, i) => `${getX(i)},${getY(v)}`).join(' ');
  const forecastPoints = projected.map((v, i) => `${getX(i + 6)},${getY(v)}`).join(' ');
  
  // Confidence Interval Area
  const upperConf = projected.map(v => v * 1.1);
  const lowerConf = projected.map(v => v * 0.9);
  const areaPath = `
    M ${getX(6)},${getY(projected[0])} 
    ${upperConf.map((v, i) => `L ${getX(i + 6)},${getY(v)}`).join(' ')}
    ${lowerConf.reverse().map((v, i) => `L ${getX(12 - i)},${getY(v)}`).join(' ')}
    Z
  `;

  return (
    <div className="w-full h-full relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="gridGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f1f5f9" strokeWidth="1"/>
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Confidence Interval */}
        <path d={areaPath} fill="#6366f1" fillOpacity="0.1" />

        {/* Lines */}
        <polyline points={historyPoints} fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
        <polyline points={forecastPoints} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeDasharray="6 4" strokeLinecap="round" />
        
        {/* Connection Point */}
        <circle cx={getX(6)} cy={getY(historical[6])} r="4" fill="white" stroke="#6366f1" strokeWidth="2" />
        
        {/* Markers */}
        <text x={getX(0)} y={height - 10} className="text-[10px] fill-slate-400 font-mono">Past 7 Days</text>
        <text x={getX(6)} y={height - 10} className="text-[10px] fill-slate-600 font-bold font-mono" textAnchor="middle">Today</text>
        <text x={getX(12)} y={height - 10} className="text-[10px] fill-indigo-500 font-bold font-mono" textAnchor="end">Forecast (AI)</text>
      </svg>
    </div>
  );
};

// --- Main Component ---

export const IntelligenceHub: React.FC<IntelligenceHubProps> = ({ branches }) => {
  const [selectedMetric, setSelectedMetric] = useState<'energy' | 'carbon' | 'cost'>('energy');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStrategy, setActiveStrategy] = useState(false);

  const toggleStrategy = () => {
      setIsProcessing(true);
      setTimeout(() => {
          setActiveStrategy(!activeStrategy);
          setIsProcessing(false);
      }, 1500);
  };

  const insights = [
      { id: 1, type: 'critical', title: 'Cooling Efficiency Drop', loc: 'Bangrak HQ', desc: 'Chiller Plant B efficiency dropped by 12% vs baseline.', action: 'Inspect' },
      { id: 2, type: 'warning', title: 'Peak Load Forecast', loc: 'Nationwide', desc: 'Predicted peak breach on Tuesday 14:00. Pre-cooling advised.', action: 'Apply' },
      { id: 3, type: 'info', title: 'Carbon Target', loc: 'Sustainability', desc: 'On track for Q2 reduction goals (-5%).', action: 'View' },
  ];

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-50">
      
      {/* Top Command Bar */}
      <div className="bg-slate-900 text-white p-6 pb-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-indigo-900/50 to-transparent pointer-events-none" />
          <div className="max-w-7xl mx-auto relative z-10">
              <div className="flex justify-between items-start">
                  <div>
                      <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-indigo-500 rounded-lg shadow-lg shadow-indigo-500/30">
                              <BrainCircuit size={24} className="text-white" />
                          </div>
                          <h1 className="text-2xl font-black tracking-tight">NT AIOps Intelligence</h1>
                      </div>
                      <p className="text-slate-400 text-sm font-mono flex items-center gap-2">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                          System Status: Optimal • Model v2.4 Active
                      </p>
                  </div>
                  <div className="flex gap-4">
                      <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Last Updated</p>
                          <p className="text-sm font-mono font-bold text-slate-300">14:02:45</p>
                      </div>
                      <button className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors border border-white/10">
                          <RefreshCw size={18} />
                      </button>
                  </div>
              </div>
          </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-8 pb-12 relative z-20 space-y-6">
          
          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Real-time Stats */}
              <div className="lg:col-span-3 space-y-4">
                  <Card className="p-5 border-l-4 border-l-blue-500 hover:shadow-lg transition-all cursor-pointer group">
                      <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Load</span>
                          <Zap size={16} className="text-blue-500 group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-3xl font-black text-slate-800">4,812</span>
                          <span className="text-xs font-bold text-slate-500">kW</span>
                      </div>
                      <Sparkline data={[4200, 4300, 4150, 4600, 4812]} color="#3b82f6" />
                      <div className="mt-2 text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <TrendingUp size={10} /> +2.4% vs last hour
                      </div>
                  </Card>

                  <Card className="p-5 border-l-4 border-l-indigo-500 hover:shadow-lg transition-all cursor-pointer group">
                      <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg PUE</span>
                          <Activity size={16} className="text-indigo-500 group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-3xl font-black text-slate-800">1.42</span>
                          <span className="text-xs font-bold text-slate-500">Ratio</span>
                      </div>
                      <Sparkline data={[1.45, 1.44, 1.43, 1.42, 1.42]} color="#6366f1" />
                      <div className="mt-2 text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <TrendingUp size={10} className="rotate-180" /> -0.01 Efficiency Gain
                      </div>
                  </Card>

                  <Card className="p-5 border-l-4 border-l-emerald-500 hover:shadow-lg transition-all cursor-pointer group">
                      <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Carbon Impact</span>
                          <Leaf size={16} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-3xl font-black text-slate-800">12.5</span>
                          <span className="text-xs font-bold text-slate-500">tons</span>
                      </div>
                      <Sparkline data={[13, 12.8, 12.6, 12.5, 12.5]} color="#10b981" />
                      <div className="mt-2 text-[10px] text-slate-400 font-bold">
                          Daily CO2e Emission
                      </div>
                  </Card>
              </div>

              {/* Center Column: Forecast & Strategy */}
              <div className="lg:col-span-6 space-y-6">
                  <Card title="AI Load Forecasting (7-Day Horizon)" className="overflow-hidden min-h-[400px] flex flex-col">
                      <div className="p-1 flex-1">
                          <ForecastChart />
                      </div>
                      <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-between">
                          <div className="flex gap-4">
                              <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Predicted Peak</p>
                                  <p className="text-sm font-black text-slate-800">Thu 14:00</p>
                              </div>
                              <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Confidence</p>
                                  <p className="text-sm font-black text-emerald-600">94.2%</p>
                              </div>
                          </div>
                          <button 
                              onClick={toggleStrategy}
                              disabled={isProcessing}
                              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 ${
                                  activeStrategy 
                                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
                              }`}
                          >
                              {isProcessing ? (
                                  <RefreshCw size={14} className="animate-spin" /> 
                              ) : activeStrategy ? (
                                  <CheckCircle2 size={14} /> 
                              ) : (
                                  <Workflow size={14} /> 
                              )}
                              {activeStrategy ? 'Optimization Active' : 'Activate Peak Shaving'}
                          </button>
                      </div>
                  </Card>

                  <div className="grid grid-cols-2 gap-4">
                      <Card className="p-4 flex items-center justify-between">
                          <Gauge value={88} min={0} max={100} label="System Health" unit="Score" color="#10b981" />
                          <div className="text-right">
                              <p className="text-xs font-bold text-slate-800">Excellent</p>
                              <p className="text-[10px] text-slate-400">0 Critical Alerts</p>
                          </div>
                      </Card>
                      <Card className="p-4 flex items-center justify-between">
                          <Gauge value={1.42} min={1} max={2} label="Network PUE" unit="" color="#6366f1" />
                          <div className="text-right">
                              <p className="text-xs font-bold text-slate-800">Efficient</p>
                              <p className="text-[10px] text-slate-400">Target: 1.40</p>
                          </div>
                      </Card>
                  </div>
              </div>

              {/* Right Column: Insights & Actions */}
              <div className="lg:col-span-3 space-y-4">
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
                      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                              <AlertOctagon size={16} className="text-slate-400" />
                              Active Insights
                          </h3>
                          <span className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-full">3 New</span>
                      </div>
                      
                      <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
                          {insights.map(insight => (
                              <div key={insight.id} className="p-4 hover:bg-slate-50 transition-colors group cursor-pointer">
                                  <div className="flex justify-between items-start mb-1">
                                      <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                          insight.type === 'critical' ? 'bg-red-50 text-red-600' : 
                                          insight.type === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                                      }`}>
                                          {insight.type}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-400">{insight.loc}</span>
                                  </div>
                                  <h4 className="text-sm font-bold text-slate-800 mt-1">{insight.title}</h4>
                                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{insight.desc}</p>
                                  <div className="mt-3 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                                          {insight.action} <ChevronRight size={12} />
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                      
                      <div className="p-3 bg-slate-50 border-t border-slate-200">
                          <button className="w-full py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors">
                              View All 24 Logs
                          </button>
                      </div>
                  </div>

                  <Card title="Asset Distribution">
                      <div className="p-4 space-y-3">
                          <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-slate-600 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"/> HVAC</span>
                              <span className="text-xs font-mono font-bold">42%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 w-[42%]" />
                          </div>
                          
                          <div className="flex justify-between items-center pt-2">
                              <span className="text-xs font-bold text-slate-600 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-500"/> Lighting</span>
                              <span className="text-xs font-mono font-bold">18%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div className="h-full bg-yellow-500 w-[18%]" />
                          </div>

                          <div className="flex justify-between items-center pt-2">
                              <span className="text-xs font-bold text-slate-600 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-500"/> IT Load</span>
                              <span className="text-xs font-mono font-bold">40%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div className="h-full bg-slate-500 w-[40%]" />
                          </div>
                      </div>
                  </Card>
              </div>
          </div>
      </div>
    </div>
  );
};
