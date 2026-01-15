
import React, { useEffect, useState } from 'react';
import { Activity, Thermometer, Zap, ClipboardList, BrainCircuit, History, FileText, CheckCircle2, AlertTriangle, LayoutDashboard, List, Download } from 'lucide-react';
import { analyzeBatteryHealth } from '../../services/geminiService';
import { Modal } from '../ui/Modal';

interface BatteryDetailModalProps {
  data: any;
  onClose: () => void;
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
      active 
        ? 'bg-blue-50 text-blue-600 border border-blue-200' 
        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
    }`}
  >
    {icon}
    {label}
  </button>
);

const Chart: React.FC<{ data: number[]; color: string; label: string; unit: string; min: number; max: number }> = ({ data, color, label, unit, min, max }) => {
    const height = 120;
    const width = 400;
    const padding = 10;
    
    if (data.length < 2) return null;

    const range = max - min;
    const xStep = (width - padding * 2) / (data.length - 1);
    
    const points = data.map((val, i) => {
        const x = padding + i * xStep;
        // Clamp value for rendering within bounds
        const safeVal = Math.min(max, Math.max(min, val));
        const normalized = (safeVal - min) / (range || 1);
        const y = (height - padding) - (normalized * (height - padding * 2));
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="w-full bg-white rounded-xl p-4 border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-center mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></span>
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">{label}</span>
                </div>
                <span className="text-xs text-gray-400 font-mono">แนวโน้ม 24 ชม.</span>
            </div>
            <div className="relative h-[100px] w-full">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity="0.2"/>
                            <stop offset="100%" stopColor={color} stopOpacity="0"/>
                        </linearGradient>
                    </defs>
                    <line x1={0} y1={padding} x2={width} y2={padding} stroke="#e2e8f0" strokeDasharray="3 3" />
                    <line x1={0} y1={height/2} x2={width} y2={height/2} stroke="#e2e8f0" strokeDasharray="3 3" />
                    <line x1={0} y1={height-padding} x2={width} y2={height-padding} stroke="#e2e8f0" strokeDasharray="3 3" />
                    <path d={`M ${padding},${height} ${points.split(' ')[0]} ${points} L ${width-padding},${height} Z`} fill={`url(#grad-${label})`} stroke="none" />
                    <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx={width-padding} cy={points.split(' ').pop()?.split(',')[1]} r="4" fill={color} className="animate-pulse shadow-md" style={{ color }} />
                </svg>
                <div className="absolute top-0 right-0 text-[10px] text-gray-400 font-mono bg-white/80 px-1 rounded">{max}{unit}</div>
                <div className="absolute bottom-0 right-0 text-[10px] text-gray-400 font-mono bg-white/80 px-1 rounded">{min}{unit}</div>
            </div>
        </div>
    );
};

export const BatteryDetailModal: React.FC<BatteryDetailModalProps> = ({ data, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'ai'>('overview');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Determine standard values based on bank type
  const is2V = data.bankType === 'Rectifier';
  const targetVoltage = is2V ? 2.25 : 13.5;
  const voltageMin = is2V ? 2.15 : 12.5;
  const voltageMax = is2V ? 2.35 : 14.5;
  
  useEffect(() => {
    let mounted = true;
    const fetchAnalysis = async () => {
        setIsAnalyzing(true);
        const analysisData = {
            ...data,
            history: {
                voltageTrend: data.voltage < targetVoltage * 0.95 ? 'declining' : 'stable',
                tempTrend: data.temperature > 28 ? 'increasing' : 'stable'
            }
        };
        const result = await analyzeBatteryHealth(analysisData);
        if (mounted) {
            setAiAnalysis(result);
            setIsAnalyzing(false);
        }
    };
    if (activeTab === 'ai' && !aiAnalysis) {
        fetchAnalysis();
    }
  }, [activeTab, data.id]);

  const handleExport = () => {
      setIsExporting(true);
      setTimeout(() => setIsExporting(false), 2000);
  };

  const voltageHistory = Array(20).fill(0).map((_, i) => data.voltage + (Math.sin(i) * 0.02 * (is2V ? 1 : 5)) + (Math.random() * 0.01 * (is2V ? 1 : 5) - 0.005));
  const tempHistory = Array(20).fill(0).map((_, i) => data.temperature + (Math.cos(i) * 0.5) + (Math.random() * 0.1 - 0.05));

  const ModalHeader = (
    <div className="flex items-center gap-4 text-slate-800">
        <div className={`w-3 h-10 rounded-full ${
            data.status === 'critical' ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' :
            data.status === 'warning' ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]' :
            'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
        }`}></div>
        <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                ยูนิต {data.id}
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-gray-100 text-gray-600 border border-gray-200">
                    {data.bankType} ({is2V ? '2V Cell' : '12V Block'})
                </span>
            </h2>
            <p className="text-gray-500 text-xs uppercase tracking-widest mt-0.5">
                ตู้ (Rack) {data.rackId} • สตริง (String) {data.stringId} • เซลล์ (Cell) {data.unitId}
            </p>
        </div>
    </div>
  );

  return (
    <Modal isOpen={true} onClose={onClose} title={ModalHeader} size="xl">
        <div className="px-6 py-3 border-b border-gray-100 bg-white/80 sticky top-0 z-10 backdrop-blur-md flex items-center gap-2 text-slate-800">
            <TabButton 
                active={activeTab === 'overview'} 
                onClick={() => setActiveTab('overview')} 
                icon={<LayoutDashboard size={16} />} 
                label="ภาพรวม" 
            />
            <TabButton 
                active={activeTab === 'history'} 
                onClick={() => setActiveTab('history')} 
                icon={<List size={16} />} 
                label="บันทึกการตรวจสอบ" 
            />
            <TabButton 
                active={activeTab === 'ai'} 
                onClick={() => setActiveTab('ai')} 
                icon={<BrainCircuit size={16} />} 
                label="การวินิจฉัย AI" 
            />
            
            <div className="flex-1" />
            
            <button 
                onClick={handleExport}
                disabled={isExporting}
                className="text-xs text-gray-500 hover:text-blue-600 transition-colors flex items-center gap-1 disabled:text-blue-400"
            >
                {isExporting ? <span className="animate-pulse">กำลังดาวน์โหลด...</span> : <><FileText size={14} /> ส่งออกรายงาน</>}
            </button>
        </div>

        <div className="p-6 min-h-[500px] bg-slate-50/50 text-slate-800">
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                     <div className="lg:col-span-1 space-y-4">
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold uppercase text-blue-500 flex items-center gap-2"><Zap size={14}/> แรงดันไฟฟ้า</span>
                                <span className="text-xs text-gray-400">Target: {targetVoltage}V</span>
                            </div>
                            <div className="text-3xl font-mono font-bold text-slate-800">{data.voltage.toFixed(3)} <span className="text-lg text-gray-400">V</span></div>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold uppercase text-red-500 flex items-center gap-2"><Thermometer size={14}/> อุณหภูมิ</span>
                                <span className="text-xs text-gray-400">Limit: 30°C</span>
                            </div>
                            <div className="text-3xl font-mono font-bold text-slate-800">{data.temperature.toFixed(1)} <span className="text-lg text-gray-400">°C</span></div>
                        </div>
                         <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold uppercase text-purple-500 flex items-center gap-2"><Activity size={14}/> ความต้านทานภายใน</span>
                                <span className="text-xs text-gray-400">mΩ</span>
                            </div>
                            <div className="text-3xl font-mono font-bold text-slate-800">{data.impedance.toFixed(2)} <span className="text-lg text-gray-400">mΩ</span></div>
                        </div>
                         <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold uppercase text-emerald-500 flex items-center gap-2"><ClipboardList size={14}/> อายุการใช้งานที่เหลือ (RUL)</span>
                                    <span className="text-xs text-gray-400">AI Estimate</span>
                                </div>
                                <div className="text-3xl font-mono font-bold text-slate-800">{data.rul} <span className="text-lg text-gray-400">วัน</span></div>
                            </div>
                             <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-100">
                                <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (data.rul / 1000) * 100)}%` }}></div>
                            </div>
                        </div>
                     </div>

                     <div className="lg:col-span-2 space-y-4">
                        <Chart 
                            data={voltageHistory} 
                            color="#3b82f6" 
                            label="ประวัติแรงดันไฟฟ้า" 
                            unit="V" 
                            min={voltageMin} 
                            max={voltageMax} 
                        />
                        <Chart 
                            data={tempHistory} 
                            color="#ef4444" 
                            label="ประวัติอุณหภูมิ" 
                            unit="°C" 
                            min={18} 
                            max={40} 
                        />
                     </div>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden text-slate-800">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                        <h4 className="font-bold text-sm text-slate-700">ประวัติการตรวจสอบและบำรุงรักษา</h4>
                        <button className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 transition-colors">
                            + บันทึกผลการตรวจสอบวันนี้
                        </button>
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200 uppercase tracking-widest text-[10px]">
                            <tr>
                                <th className="px-6 py-4">วันที่</th>
                                <th className="px-6 py-4">ประเภทการทดสอบ</th>
                                <th className="px-6 py-4">ผลลัพธ์</th>
                                <th className="px-6 py-4">เจ้าหน้าที่</th>
                                <th className="px-6 py-4">หมายเหตุ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {/* Static Mock Data for Demo if historyLog is empty */}
                            {(data.historyLog && data.historyLog.length > 0 ? data.historyLog : [
                                { date: '2024-05-12', type: 'Impedance', result: 'Pass', tech: 'Somchai J.', notes: 'Routine check' },
                                { date: '2024-04-12', type: 'Discharge', result: 'Pass', tech: 'Wichai R.', notes: 'Annual discharge test' }
                            ]).map((log: any, i: number) => (
                                <tr key={i} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-gray-800 font-mono">{log.date}</td>
                                    <td className="px-6 py-4 text-gray-600">{log.type === 'Impedance' ? 'ทดสอบความต้านทาน' : 'ทดสอบการคายประจุ'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                                            log.result === 'Pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                            {log.result === 'Pass' ? <CheckCircle2 size={12}/> : <AlertTriangle size={12}/>}
                                            {log.result === 'Pass' ? 'ผ่าน' : 'ไม่ผ่าน'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{log.tech}</td>
                                    <td className="px-6 py-4 text-gray-500 italic max-w-xs truncate">{log.notes}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'ai' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 min-h-[300px] text-slate-800">
                    <div className="flex flex-col h-full">
                         <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                                <BrainCircuit size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">การวินิจฉัยระบบ</h3>
                                <p className="text-sm text-gray-500">ตรวจสอบสุขภาพอัตโนมัติ</p>
                            </div>
                        </div>

                        {isAnalyzing ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-4">
                                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                <span className="animate-pulse">กำลังวิเคราะห์รูปแบบข้อมูล Telemetry...</span>
                            </div>
                        ) : (
                            <div className="prose prose-sm max-w-none text-slate-600">
                                <div className="p-4 bg-indigo-50/50 rounded-lg border border-indigo-100 text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                                    {aiAnalysis}
                                </div>
                                <div className="mt-4 flex gap-4 text-xs text-gray-400 font-mono uppercase">
                                    <span>ความเชื่อมั่น: 99.9%</span>
                                    <span>โมเดล: Sys-Diag-01</span>
                                    <span>ความหน่วง: 12ms</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    </Modal>
  );
};
