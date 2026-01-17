import React, { useState, useEffect } from 'react';
import {
  Battery,
  Zap,
  Activity,
  Globe,
  ShieldCheck,
  TrendingUp,
  Gauge,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { batterySystemsApi, FleetSummary } from '../../api/batterySystems';

interface GlobalOverviewProps {
  onChangeView: (view: 'map' | 'utility' | 'intelligence' | 'settings' | 'reports') => void;
}

export const GlobalOverview: React.FC<GlobalOverviewProps> = ({ onChangeView }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [checkStatus, setCheckStatus] = useState<'idle' | 'checking' | 'complete'>('idle');
  const [fleetData, setFleetData] = useState<FleetSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFleetData = async () => {
      try {
        setLoading(true);
        const data = await batterySystemsApi.getFleetSummary();
        setFleetData(data);
      } catch (error) {
        console.error('Failed to load fleet summary:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFleetData();
    // Refresh every 60 seconds
    const interval = setInterval(loadFleetData, 60000);
    return () => clearInterval(interval);
  }, []);

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
      <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-nt-dark">ศูนย์ปฏิบัติการโครงข่าย (NOC)</h2>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">
            ข้อมูลโครงสร้างพื้นฐานระดับประเทศ (National Infrastructure)
          </p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <span className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-lg shadow-blue-500/20 animate-pulse">
            <Activity className="w-3.5 h-3.5" /> ข้อมูลสด SCADA
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 flex-1 overflow-y-auto pr-2 pb-4">
        {/* National Power Metric - Click to go to Utility */}
        <div
          onClick={() => onChangeView('utility')}
          className="group p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-xl border border-white/5 relative overflow-hidden transition-all hover:-translate-y-1 cursor-pointer"
        >
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
            <Zap size={120} />
          </div>
          <div className="flex items-start justify-between relative z-10">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2 group-hover:text-nt-yellow transition-colors">
                ความต้องการพลังงานรวม
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white">4.8</span>
                <span className="text-lg font-bold text-nt-yellow">MW</span>
              </div>
            </div>
            <div className="bg-nt-yellow/10 p-2.5 rounded-xl text-nt-yellow group-hover:bg-nt-yellow group-hover:text-nt-dark transition-all">
              <TrendingUp size={24} />
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3 relative z-10">
            <div className="flex-1 bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div className="w-[62%] h-full bg-nt-yellow rounded-full shadow-[0_0_10px_#FFD700]" />
            </div>
            <span className="text-xs font-bold text-white/70">โหลด 62%</span>
          </div>
          <div className="absolute bottom-3 right-5 text-xs text-white/0 group-hover:text-white/40 transition-colors flex items-center gap-1 font-bold">
            จัดการพลังงาน <ArrowRight size={12} />
          </div>
        </div>

        {/* Scale Grid - Production Fleet Data */}
        <div className="grid grid-cols-2 gap-5">
          <div
            onClick={() => onChangeView('map')}
            className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col gap-3 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl w-fit group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Globe size={22} />
            </div>
            <div>
              {loading ? (
                <div className="h-9 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <span className="text-3xl font-black text-slate-800">
                  {fleetData?.totalFacilities || 9}
                </span>
              )}
              <span className="text-xs block font-bold text-slate-500 uppercase group-hover:text-indigo-600 transition-colors mt-1">
                ศูนย์ข้อมูล
              </span>
            </div>
          </div>
          <div
            onClick={() => onChangeView('utility')}
            className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col gap-3 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl w-fit group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Battery size={22} />
            </div>
            <div>
              {loading ? (
                <div className="h-9 w-20 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <span className="text-3xl font-black text-slate-800">
                  {fleetData?.totalBatteries
                    ? (fleetData.totalBatteries / 1000).toFixed(1) + 'k'
                    : '1.9k'}
                </span>
              )}
              <span className="text-xs block font-bold text-slate-500 uppercase group-hover:text-emerald-600 transition-colors mt-1">
                แบตเตอรี่ทั้งหมด
              </span>
            </div>
          </div>
        </div>

        {/* Resource Intensity Index - Click to go to Intelligence */}
        <div
          onClick={() => onChangeView('intelligence')}
          className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-orange-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-4 mb-5">
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-colors">
              <Gauge size={24} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 group-hover:text-orange-600 transition-colors">
                ดัชนีประสิทธิภาพ (PUE)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">ประสิทธิภาพการใช้พลังงาน</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold text-slate-600">ค่า PUE รวมทั้งประเทศ</span>
              <span className="text-2xl font-black text-slate-800">1.42</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="w-[71%] h-full bg-indigo-500" />
            </div>
          </div>
        </div>

        {/* Platform Health Summary - Click to go to Intelligence */}
        <div
          onClick={() => onChangeView('intelligence')}
          className="mt-2 p-6 bg-blue-50 rounded-2xl border border-blue-100 relative overflow-hidden cursor-pointer hover:bg-blue-100/70 transition-colors"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-blue-600" size={20} />
              <span className="font-bold text-sm text-blue-900">สถานะสุขภาพระบบ</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSystemCheck();
              }}
              className="p-1.5 rounded-full hover:bg-white/50 text-blue-600 transition-colors"
              disabled={isChecking}
            >
              {isChecking ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CheckCircle2 size={16} />
              )}
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 font-medium">ความพร้อมใช้งาน (Uptime)</span>
              <span className="font-bold text-emerald-600">99.98%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 font-medium">ความปลอดภัยไซเบอร์</span>
              <span className="font-bold text-blue-600">Secure</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 font-medium">การแจ้งเตือนวิกฤต</span>
              <span className="font-bold text-slate-400">0</span>
            </div>
          </div>

          {checkStatus === 'complete' && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center text-emerald-600 animate-fade-in-up">
              <CheckCircle2 size={40} className="mb-2" />
              <span className="font-bold text-sm">ตรวจสอบเสร็จสิ้น</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
