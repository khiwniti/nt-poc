
import React, { useState, useEffect } from 'react';
import { Activity, Thermometer, Wind, BrainCircuit, Fan, Droplets, Users, AlertTriangle, CheckCircle2, X, Loader2, Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ZoneData, ZoneStatus } from '../../types';

interface ZoneDetailModalProps {
  zone: ZoneData;
  onClose: () => void;
}

const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
    const height = 60;
    const width = 200;
    const min = Math.min(...data) * 0.95;
    const max = Math.max(...data) * 1.05;
    const range = max - min;
    const step = width / (data.length - 1);
    
    const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`).join(' ');

    return (
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
            <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={width} cy={height - ((data[data.length-1] - min) / range) * height} r="3" fill={color} className="animate-pulse" />
        </svg>
    );
};

export const ZoneDetailModal: React.FC<ZoneDetailModalProps> = ({ zone, onClose }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isTuning, setIsTuning] = useState(false);
  const [isTuneComplete, setIsTuneComplete] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Mock History Data
  const tempHistory = Array(12).fill(0).map((_, i) => 24 + Math.sin(i) * 2 + Math.random());
  const co2History = Array(12).fill(0).map((_, i) => 400 + Math.random() * 100 + (i * 10));

  useEffect(() => {
    setIsAnalyzing(true);
    // Simulate AI Analysis
    setTimeout(() => {
        const insight = zone.status === ZoneStatus.CRITICAL 
            ? "ตรวจพบค่า CO2 สูงเกินมาตรฐาน (850 ppm) ในขณะที่มีผู้ใช้งานหนาแน่น ระบบ HVAC ทำงานที่ 85% แนะนำให้เพิ่มอัตราการหมุนเวียนอากาศ (Fresh Air Intake) อีก 15% ทันที"
            : zone.status === ZoneStatus.WARNING 
            ? "อุณหภูมิห้องสูงกว่าจุดตั้งค่า (Setpoint) เล็กน้อย (+1.2°C) อาจเกิดจากการอุดตันของฟิลเตอร์กรองอากาศ ควรตรวจสอบในรอบบำรุงรักษาถัดไป"
            : "สภาวะแวดล้อมอยู่ในเกณฑ์ที่เหมาะสม (Optimal) ประสิทธิภาพการใช้พลังงาน (EE) อยู่ที่ 94% คาดการณ์ว่าจะคงสถานะปกติในอีก 24 ชม. ข้างหน้า";
        setAiInsight(insight);
        setIsAnalyzing(false);
    }, 1500);
  }, [zone]);

  const handleAutoTune = () => {
      setIsTuning(true);
      setTimeout(() => {
          setIsTuning(false);
          setIsTuneComplete(true);
      }, 2000);
  };

  const handleDownloadReport = () => {
      setIsDownloading(true);
      setTimeout(() => setIsDownloading(false), 2000);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
                zone.status === ZoneStatus.CRITICAL ? 'bg-red-100 text-red-600' :
                zone.status === ZoneStatus.WARNING ? 'bg-amber-100 text-amber-600' :
                'bg-emerald-100 text-emerald-600'
            }`}>
                <Fan size={20} />
            </div>
            <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    {zone.name}
                    <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{zone.id}</span>
                </h2>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">
                    Zone Control Unit • Floor 3
                </p>
            </div>
        </div>
    } size="lg">
        <div className="p-6 bg-slate-50/50 text-slate-800">
            
            {/* Status Banner */}
            <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${
                zone.status === ZoneStatus.CRITICAL ? 'bg-red-50 border-red-100 text-red-800' :
                zone.status === ZoneStatus.WARNING ? 'bg-amber-50 border-amber-100 text-amber-800' :
                'bg-emerald-50 border-emerald-100 text-emerald-800'
            }`}>
                {zone.status === ZoneStatus.CRITICAL ? <AlertTriangle className="shrink-0" /> : <CheckCircle2 className="shrink-0" />}
                <div>
                    <h4 className="font-bold text-sm uppercase mb-1">สถานะ: {zone.status}</h4>
                    <p className="text-xs opacity-90 leading-relaxed">
                        {zone.status === ZoneStatus.CRITICAL ? 'พบความผิดปกติรุนแรง ระบบกำลังพยายามชดเชยอุณหภูมิ' : 'ระบบทำงานตามปกติภายใต้พารามิเตอร์ที่กำหนด'}
                    </p>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-xs text-gray-400 font-bold uppercase mb-1 flex items-center gap-1"><Thermometer size={12}/> Temp</div>
                    <div className="text-xl font-mono font-bold text-slate-800">24.2°C</div>
                    <div className="h-8 mt-2"><Sparkline data={tempHistory} color="#ef4444" /></div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-xs text-gray-400 font-bold uppercase mb-1 flex items-center gap-1"><Droplets size={12}/> Humidity</div>
                    <div className="text-xl font-mono font-bold text-blue-600">55%</div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full mt-4"><div className="w-[55%] h-full bg-blue-500 rounded-full"></div></div>
                </div>
                 <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-xs text-gray-400 font-bold uppercase mb-1 flex items-center gap-1"><Wind size={12}/> CO2</div>
                    <div className="text-xl font-mono font-bold text-slate-800">450 <span className="text-xs font-normal text-gray-400">ppm</span></div>
                    <div className="h-8 mt-2"><Sparkline data={co2History} color="#64748b" /></div>
                </div>
                 <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-xs text-gray-400 font-bold uppercase mb-1 flex items-center gap-1"><Users size={12}/> Occ</div>
                    <div className="text-xl font-mono font-bold text-slate-800">12 <span className="text-xs font-normal text-gray-400">ppl</span></div>
                    <div className="text-[10px] text-green-600 font-bold mt-3">Low Density</div>
                </div>
            </div>

            {/* AI Insight Section */}
            <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <BrainCircuit size={120} />
                </div>
                <h4 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2 relative z-10">
                    <BrainCircuit size={16} /> การวินิจฉัยและแนะนำโดย AI
                </h4>
                {isAnalyzing ? (
                    <div className="flex items-center gap-2 text-indigo-600 text-xs animate-pulse">
                        <div className="w-2 h-2 bg-indigo-600 rounded-full"></div> กำลังวิเคราะห์ข้อมูลเซนเซอร์แบบเรียลไทม์...
                    </div>
                ) : (
                    <div className="relative z-10 space-y-3">
                        <p className="text-xs text-indigo-800 leading-relaxed font-medium bg-white/50 p-3 rounded-lg border border-indigo-100/50 backdrop-blur-sm">
                            {aiInsight}
                        </p>
                        <div className="flex gap-2">
                             <button 
                                onClick={handleAutoTune}
                                disabled={isTuning || isTuneComplete}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 ${
                                    isTuneComplete 
                                    ? 'bg-green-600 text-white cursor-default' 
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                }`}
                             >
                                {isTuning ? <><Loader2 size={12} className="animate-spin"/> Tuning...</> : isTuneComplete ? <><Check size={12}/> ปรับแต่งแล้ว</> : 'ปรับแต่งอัตโนมัติ (Auto-Tune)'}
                            </button>
                             <button 
                                onClick={handleDownloadReport}
                                disabled={isDownloading}
                                className="flex-1 py-2 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {isDownloading ? <Loader2 size={12} className="animate-spin"/> : null}
                                {isDownloading ? 'Downloading...' : 'ดูรายงานฉบับเต็ม'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </Modal>
  );
};
