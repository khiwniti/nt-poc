
import React, { useState } from 'react';
import { Battery, Zap, Activity, Globe, ShieldCheck, Server, TrendingUp, Gauge, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

interface GlobalOverviewProps {
  onChangeView: (view: 'map' | 'utility' | 'intelligence' | 'settings' | 'reports') => void;
}

export const GlobalOverview: React.FC<GlobalOverviewProps> = ({ onChangeView }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [checkStatus, setCheckStatus] = useState<'idle' | 'checking' | 'complete'>('idle');

  const handleSystemCheck = () => {
    setIsChecking(true);
    setCheckStatus('checking');
    setTimeout(() => {
        setIsChecking(false);
        setCheckStatus('complete');
        setTimeout(() => setCheckStatus('idle'), 3000);
    }, 2500);
  };

  return (
    <div className="w-full h-full flex flex-col">
        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
            <div>
                <h2 className="text-xl font-bold text-nt-dark">ศูนย์ปฏิบัติการโครงข่าย</h2>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">ข้อมูลโครงสร้างพื้นฐานระดับประเทศ</p>
            </div>
            <div className="flex flex-col gap-2 items-end">
                 <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-lg shadow-blue-500/20 animate-pulse">
                    <Activity className="w-3 h-3" /> ข้อมูลสด SCADA
                 </span>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-4 flex-1 overflow-y-auto pr-2 pb-4">
            
            {/* National Power Metric - Click to go to Utility */}
            <div 
                onClick={() => onChangeView('utility')}
                className="group p-5 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-xl border border-white/5 relative overflow-hidden transition-all hover:-translate-y-1 cursor-pointer"
            >
                <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                    <Zap size={100} />
                </div>
                <div className="flex items-start justify-between relative z-10">
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 group-hover:text-nt-yellow transition-colors">ความต้องการพลังงานรวม</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-white">4,812</span>
                            <span className="text-sm font-bold text-nt-yellow">kW</span>
                        </div>
                    </div>
                    <div className="bg-nt-yellow/10 p-2 rounded-lg text-nt-yellow group-hover:bg-nt-yellow group-hover:text-nt-dark transition-all">
                        <TrendingUp size={20} />
                    </div>
                </div>
                <div className="mt-4 flex items-center gap-2 relative z-10">
                    <div className="flex-1 bg-white/10 h-1 rounded-full overflow-hidden">
                        <div className="w-[62%] h-full bg-nt-yellow rounded-full shadow-[0_0_10px_#FFD700]" />
                    </div>
                    <span className="text-[10px] font-bold text-white/50">ความจุ 62%</span>
                </div>
                <div className="absolute bottom-2 right-4 text-[10px] text-white/0 group-hover:text-white/40 transition-colors flex items-center gap-1 font-bold">
                    จัดการพลังงาน <ArrowRight size={10} />
                </div>
            </div>

            {/* Scale Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div 
                    onClick={() => onChangeView('map')}
                    className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm flex flex-col gap-3 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                >
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg w-fit group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Globe size={18} />
                    </div>
                    <div>
                        <span className="text-2xl font-black text-slate-800">9</span>
                        <span className="text-[10px] block font-bold text-slate-400 uppercase group-hover:text-indigo-600 transition-colors">สถานที่</span>
                    </div>
                </div>
                <div 
                    onClick={() => onChangeView('utility')}
                    className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm flex flex-col gap-3 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
                >
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg w-fit group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <Battery size={18} />
                    </div>
                    <div>
                        <span className="text-2xl font-black text-slate-800">1,944</span>
                        <span className="text-[10px] block font-bold text-slate-400 uppercase group-hover:text-emerald-600 transition-colors">แบตเตอรี่</span>
                    </div>
                </div>
            </div>

            {/* Resource Intensity Index - Click to go to Intelligence */}
            <div 
                onClick={() => onChangeView('intelligence')}
                className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-orange-300 hover:shadow-md transition-all cursor-pointer group"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-orange-50 text-orange-600 rounded-lg group-hover:bg-orange-500 group-hover:text-white transition-colors">
                        <Gauge size={20} />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-slate-800 group-hover:text-orange-600 transition-colors">ดัชนีประสิทธิภาพโครงข่าย</h4>
                        <p className="text-[10px] text-slate-400">อัตราส่วนความเข้มข้นของพลังงาน</p>
                    </div>
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between items-end">
                        <span className="text-[10px] font-bold text-slate-600">ค่า PUE รวมทั้งประเทศ</span>
                        <span className="text-sm font-black text-slate-800">1.42</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="w-[71%] h-full bg-indigo-500" />
                    </div>
                </div>
            </div>

            {/* Platform Health Summary - Click to go to Intelligence */}
            <div 
                onClick={() => onChangeView('intelligence')}
                className="mt-2 p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50 relative overflow-hidden cursor-pointer hover:bg-blue-100/50 transition-colors group"
            >
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <h4 className="text-xs font-bold text-blue-900 group-hover:underline">การเฝ้าระวัง AIOps</h4>
                        <p className="text-[10px] text-blue-700">โมเดล: CatBoost-V2.4</p>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-mono font-bold text-blue-600 uppercase">AUROC: 0.88</span>
                        <span className="text-[10px] font-mono font-bold text-blue-600 uppercase">Drift: PSI 0.04</span>
                    </div>
                </div>
                <div className="mt-4 flex gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                        <div key={i} className={`flex-1 h-1.5 rounded-sm ${i === 4 ? 'bg-red-400 animate-pulse' : 'bg-blue-400/30'}`} title={`สาขา ${i}`} />
                    ))}
                </div>
            </div>
            
            <button 
                onClick={handleSystemCheck}
                disabled={isChecking || checkStatus === 'complete'}
                className={`mt-2 w-full py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl 
                    ${checkStatus === 'complete' 
                        ? 'bg-green-600 text-white shadow-green-900/10' 
                        : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/10'}`}
            >
                {checkStatus === 'checking' ? (
                    <>
                        <Loader2 size={14} className="animate-spin" /> กำลังตรวจสอบระบบ...
                    </>
                ) : checkStatus === 'complete' ? (
                    <>
                        <CheckCircle2 size={14} /> ระบบทำงานปกติ
                    </>
                ) : (
                    <>
                        <Server size={14} /> ตรวจสอบระบบทั้งหมด
                    </>
                )}
            </button>
        </div>
    </div>
  );
};
