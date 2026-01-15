
import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { 
  BrainCircuit, TrendingUp, Zap, Activity, Cpu, Workflow,
  BarChart3, Timer, PieChart, RefreshCw, AlertTriangle,
  ChevronRight, AlertOctagon, Leaf, Wind, Thermometer, CheckCircle2,
  Server, Play, Pause, Settings2, Fan
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

const Gauge = ({ value, min, max, label, unit, color = "#3b82f6", subLabel }: { value: number, min: number, max: number, label: string, unit: string, color?: string, subLabel?: string }) => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center relative p-2">
            <div className="relative">
                <svg width="100" height="100" className="transform -rotate-90">
                    <circle cx="50" cy="50" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="8" />
                    <circle 
                        cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="8" 
                        strokeDasharray={circumference} 
                        strokeDashoffset={offset} 
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-slate-800 leading-none">{value}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{unit}</span>
                </div>
            </div>
            <span className="text-xs font-bold text-slate-600 mt-1 uppercase text-center">{label}</span>
            {subLabel && <span className="text-[10px] text-slate-400 font-medium">{subLabel}</span>}
        </div>
    );
};

const ForecastChart = () => {
  const width = 600;
  const height = 220;
  const padding = 40; // Increased padding for Thai labels
  
  const historical = [4200, 4500, 4800, 4600, 5200, 5500, 5800]; 
  const projected = [5800, 6200, 6000, 6500, 6800, 7200, 7000];
  const combined = [...historical, ...projected];
  const max = Math.max(...combined) * 1.2;
  const min = Math.min(...combined) * 0.8;

  const getX = (i: number) => padding + (i * (width - padding * 2) / (combined.length - 1));
  const getY = (v: number) => height - padding - ((v - min) / (max - min) * (height - 2 * padding));

  const historyPoints = historical.map((v, i) => `${getX(i)},${getY(v)}`).join(' ');
  const forecastPoints = projected.map((v, i) => `${getX(i + 6)},${getY(v)}`).join(' ');
  
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

        {/* Forecast Area */}
        <path d={`M ${getX(6)},${getY(projected[0])} ${forecastPoints.split(' ')[0]} ${forecastPoints} L ${getX(12)},${height-padding} L ${getX(6)},${height-padding} Z`} fill="url(#gridGradient)" />

        {/* Lines */}
        <polyline points={historyPoints} fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
        <polyline points={forecastPoints} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeDasharray="6 4" strokeLinecap="round" />
        
        {/* Connection Point */}
        <circle cx={getX(6)} cy={getY(historical[6])} r="5" fill="white" stroke="#6366f1" strokeWidth="3" />
        
        {/* X-Axis Labels */}
        <text x={getX(0)} y={height - 10} className="text-[10px] fill-slate-400 font-bold">7 วันก่อน</text>
        <text x={getX(6)} y={height - 10} className="text-[10px] fill-slate-600 font-bold" textAnchor="middle">วันนี้ (Today)</text>
        <text x={getX(12)} y={height - 10} className="text-[10px] fill-indigo-500 font-bold" textAnchor="end">พยากรณ์ (AI)</text>

        {/* Y-Axis Labels */}
        <text x={padding - 10} y={getY(max)} className="text-[10px] fill-slate-400" textAnchor="end">{Math.round(max)} kW</text>
        <text x={padding - 10} y={getY(min)} className="text-[10px] fill-slate-400" textAnchor="end">{Math.round(min)} kW</text>
      </svg>
    </div>
  );
};

// --- Main Component ---

export const IntelligenceHub: React.FC<IntelligenceHubProps> = ({ branches }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStrategy, setActiveStrategy] = useState(false);
  const [simulationMode, setSimulationMode] = useState(false);

  const toggleStrategy = () => {
      setIsProcessing(true);
      setTimeout(() => {
          setActiveStrategy(!activeStrategy);
          setIsProcessing(false);
      }, 1500);
  };

  const insights = [
      { 
          id: 1, 
          type: 'critical', 
          title: 'ประสิทธิภาพระบบทำความเย็นลดลง', 
          loc: 'อาคารบางรัก (HQ)', 
          desc: 'Chiller Plant B มีค่าประสิทธิภาพลดลง 12% เมื่อเทียบกับค่าพื้นฐาน อาจเกิดจากการตะกรันในคอนเดนเซอร์', 
          action: 'เปิดใบงานตรวจสอบ',
          impact: '-12% Efficiency'
      },
      { 
          id: 2, 
          type: 'warning', 
          title: 'พยากรณ์โหลดสูงสุด (Peak Load)', 
          loc: 'ภาพรวมทุกสาขา', 
          desc: 'คาดการณ์ว่าโหลดจะเกินขีดจำกัดสัญญาในวันอังคาร 14:00 น. แนะนำให้ทำ Pre-cooling', 
          action: 'เริ่มโหมดประหยัด',
          impact: 'Risk High'
      },
      { 
          id: 3, 
          type: 'info', 
          title: 'เป้าหมายคาร์บอน (Carbon Goal)', 
          loc: 'Sustainability', 
          desc: 'การปล่อยก๊าซเรือนกระจกเป็นไปตามแผนลด 5% ในไตรมาสนี้', 
          action: 'ดูรายงาน',
          impact: 'On Track'
      },
  ];

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-50">
      
      {/* Top Command Bar */}
      <div className="bg-slate-900 text-white p-6 pb-12 relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-indigo-900/50 to-transparent pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl" />
          
          <div className="max-w-7xl mx-auto relative z-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                      <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-indigo-500 rounded-lg shadow-lg shadow-indigo-500/30">
                              <BrainCircuit size={24} className="text-white" />
                          </div>
                          <div>
                              <h1 className="text-2xl font-black tracking-tight leading-none">ศูนย์ปฏิบัติการอัจฉริยะ</h1>
                              <span className="text-xs font-mono text-indigo-300 uppercase tracking-widest">NT AIOps Intelligence Center</span>
                          </div>
                      </div>
                      <p className="text-slate-400 text-sm font-medium flex items-center gap-2 mt-2">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                          สถานะระบบ: <span className="text-emerald-400">ปกติ (Optimal)</span> • AI Model v2.4 Active
                      </p>
                  </div>
                  
                  <div className="flex items-center gap-4 bg-white/5 p-2 rounded-xl border border-white/10 backdrop-blur-sm">
                      <div className="px-4 border-r border-white/10 text-right">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">อัปเดตล่าสุด</p>
                          <p className="text-sm font-mono font-bold text-white">14:02:45</p>
                      </div>
                      <button 
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-lg"
                        onClick={() => setIsProcessing(true)}
                      >
                          {isProcessing ? <RefreshCw size={16} className="animate-spin"/> : <RefreshCw size={16} />}
                          <span>วิเคราะห์ใหม่</span>
                      </button>
                  </div>
              </div>
          </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 -mt-8 pb-12 relative z-20 space-y-6">
          
          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Real-time Stats */}
              <div className="lg:col-span-3 space-y-4">
                  <Card className="p-5 border-l-4 border-l-blue-500 hover:shadow-lg transition-all cursor-pointer group bg-white">
                      <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">โหลดรวมระบบ (Total Load)</span>
                          <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600 group-hover:scale-110 transition-transform">
                             <Zap size={16} />
                          </div>
                      </div>
                      <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-3xl font-black text-slate-800">4,812</span>
                          <span className="text-xs font-bold text-slate-500">kW</span>
                      </div>
                      <div className="h-8 mb-2">
                        <Sparkline data={[4200, 4300, 4150, 4600, 4812]} color="#3b82f6" />
                      </div>
                      <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 w-fit px-2 py-0.5 rounded-full">
                          <TrendingUp size={10} /> +2.4% จากชั่วโมงก่อน
                      </div>
                  </Card>

                  <Card className="p-5 border-l-4 border-l-indigo-500 hover:shadow-lg transition-all cursor-pointer group bg-white">
                      <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ค่า PUE เฉลี่ย</span>
                          <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600 group-hover:scale-110 transition-transform">
                             <Activity size={16} />
                          </div>
                      </div>
                      <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-3xl font-black text-slate-800">1.42</span>
                          <span className="text-xs font-bold text-slate-500">Ratio</span>
                      </div>
                      <div className="h-8 mb-2">
                        <Sparkline data={[1.45, 1.44, 1.43, 1.42, 1.42]} color="#6366f1" />
                      </div>
                      <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 w-fit px-2 py-0.5 rounded-full">
                          <TrendingUp size={10} className="rotate-180" /> ประสิทธิภาพดีขึ้น
                      </div>
                  </Card>

                  <Card className="p-5 border-l-4 border-l-emerald-500 hover:shadow-lg transition-all cursor-pointer group bg-white">
                      <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">คาร์บอนฟุตพริ้นท์</span>
                          <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600 group-hover:scale-110 transition-transform">
                             <Leaf size={16} />
                          </div>
                      </div>
                      <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-3xl font-black text-slate-800">12.5</span>
                          <span className="text-xs font-bold text-slate-500">ตัน (Tons)</span>
                      </div>
                      <div className="h-8 mb-2">
                        <Sparkline data={[13, 12.8, 12.6, 12.5, 12.5]} color="#10b981" />
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold bg-slate-100 w-fit px-2 py-0.5 rounded-full">
                          Daily CO2e Emission
                      </div>
                  </Card>
              </div>

              {/* Center Column: Forecast & Strategy */}
              <div className="lg:col-span-6 space-y-6">
                  <Card title="การพยากรณ์โหลดล่วงหน้า (AI Load Forecasting)" className="overflow-hidden min-h-[420px] flex flex-col bg-white border-slate-200 shadow-sm">
                      <div className="p-4 flex-1 relative">
                          {simulationMode && (
                              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center animate-fade-in-up">
                                  <div className="bg-white p-6 rounded-2xl shadow-2xl border border-indigo-100 max-w-sm text-center">
                                      <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                                          <BrainCircuit size={24} />
                                      </div>
                                      <h3 className="text-lg font-bold text-slate-800 mb-2">กำลังจำลองสถานการณ์...</h3>
                                      <p className="text-xs text-slate-500 mb-4">AI กำลังคำนวณผลกระทบหากเปิดใช้งาน "Peak Shaving" ที่สาขาขอนแก่นและหาดใหญ่</p>
                                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-4">
                                          <div className="h-full bg-indigo-600 animate-[width_2s_ease-in-out_infinite]" style={{width: '60%'}}></div>
                                      </div>
                                      <button 
                                        onClick={() => setSimulationMode(false)}
                                        className="text-xs text-indigo-600 font-bold hover:underline"
                                      >
                                          ยกเลิกการจำลอง
                                      </button>
                                  </div>
                              </div>
                          )}
                          <ForecastChart />
                      </div>
                      
                      <div className="bg-slate-50 border-t border-slate-100 p-4">
                          <div className="flex items-center justify-between mb-4">
                              <div className="flex gap-6">
                                  <div>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">จุดสูงสุดที่คาดการณ์</p>
                                      <p className="text-sm font-black text-slate-800 flex items-center gap-1">
                                          พฤหัส 14:00 <span className="text-xs font-normal text-slate-500 bg-slate-200 px-1 rounded">5,800 kW</span>
                                      </p>
                                  </div>
                                  <div>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ความแม่นยำโมเดล</p>
                                      <p className="text-sm font-black text-emerald-600">94.2%</p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">โหมดจำลอง (Sim)</span>
                                  <button 
                                    onClick={() => setSimulationMode(!simulationMode)}
                                    className={`w-10 h-5 rounded-full transition-colors relative ${simulationMode ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                  >
                                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${simulationMode ? 'left-6' : 'left-1'}`} />
                                  </button>
                              </div>
                          </div>

                          <button 
                              onClick={toggleStrategy}
                              disabled={isProcessing}
                              className={`w-full py-3 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 border ${
                                  activeStrategy 
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700 border-transparent hover:shadow-indigo-200'
                              }`}
                          >
                              {isProcessing ? (
                                  <RefreshCw size={14} className="animate-spin" /> 
                              ) : activeStrategy ? (
                                  <CheckCircle2 size={14} /> 
                              ) : (
                                  <Workflow size={14} /> 
                              )}
                              {activeStrategy ? 'ระบบปรับปรุงประสิทธิภาพอัตโนมัติ: ทำงานอยู่' : 'เปิดใช้งานการจัดการโหลด (Activate Peak Shaving)'}
                          </button>
                      </div>
                  </Card>

                  <div className="grid grid-cols-2 gap-4">
                      <Card className="p-4 bg-white border-slate-200 shadow-sm hover:border-emerald-300 transition-colors">
                          <Gauge 
                            value={88} 
                            min={0} 
                            max={100} 
                            label="สุขภาพระบบรวม" 
                            subLabel="System Health"
                            unit="Score" 
                            color="#10b981" 
                          />
                      </Card>
                      <Card className="p-4 bg-white border-slate-200 shadow-sm hover:border-indigo-300 transition-colors">
                          <Gauge 
                            value={1.42} 
                            min={1} 
                            max={2} 
                            label="ประสิทธิภาพโครงข่าย" 
                            subLabel="Network PUE"
                            unit="Ratio" 
                            color="#6366f1" 
                          />
                      </Card>
                  </div>
              </div>

              {/* Right Column: Insights & Actions */}
              <div className="lg:col-span-3 space-y-4">
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
                      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                              <AlertOctagon size={16} className="text-indigo-600" />
                              ข้อมูลเชิงลึก (AI Insights)
                          </h3>
                          <span className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">3 ใหม่</span>
                      </div>
                      
                      <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[500px]">
                          {insights.map(insight => (
                              <div key={insight.id} className="p-4 hover:bg-slate-50 transition-colors group cursor-pointer border-l-2 border-transparent hover:border-indigo-500">
                                  <div className="flex justify-between items-start mb-1">
                                      <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                          insight.type === 'critical' ? 'bg-red-50 text-red-600 border-red-100' : 
                                          insight.type === 'warning' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                                      }`}>
                                          {insight.type === 'critical' ? 'วิกฤต' : insight.type === 'warning' ? 'แจ้งเตือน' : 'ข้อมูล'}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-400">{insight.loc}</span>
                                  </div>
                                  <h4 className="text-sm font-bold text-slate-800 mt-2 mb-1">{insight.title}</h4>
                                  <p className="text-xs text-slate-500 leading-relaxed">{insight.desc}</p>
                                  
                                  <div className="mt-3 flex items-center justify-between">
                                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                          ผลกระทบ: {insight.impact}
                                      </span>
                                      <button className="text-[10px] font-bold text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all">
                                          {insight.action} <ChevronRight size={12} />
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                      
                      <div className="p-3 bg-slate-50 border-t border-slate-200">
                          <button className="w-full py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors">
                              ดูประวัติการแจ้งเตือน (Log History)
                          </button>
                      </div>
                  </div>

                  <Card title="การกระจายการใช้พลังงาน">
                      <div className="p-4 space-y-4">
                          {[
                              { label: 'ระบบปรับอากาศ (HVAC)', val: 42, color: 'bg-blue-500', icon: Fan },
                              { label: 'โหลดไอที (IT Load)', val: 40, color: 'bg-indigo-500', icon: Server },
                              { label: 'แสงสว่าง (Lighting)', val: 18, color: 'bg-amber-400', icon: Zap }
                          ].map((item, idx) => (
                              <div key={idx}>
                                  <div className="flex justify-between items-center mb-1.5">
                                      <span className="text-xs font-bold text-slate-600 flex items-center gap-2">
                                          <div className={`p-1 rounded text-white ${item.color.replace('bg-', 'bg-opacity-80 bg-')}`}>
                                              <item.icon size={10} />
                                          </div>
                                          {item.label}
                                      </span>
                                      <span className="text-xs font-mono font-bold">{item.val}%</span>
                                  </div>
                                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                      <div className={`h-full ${item.color}`} style={{ width: `${item.val}%` }} />
                                  </div>
                              </div>
                          ))}
                      </div>
                  </Card>
              </div>
          </div>
      </div>
    </div>
  );
};
