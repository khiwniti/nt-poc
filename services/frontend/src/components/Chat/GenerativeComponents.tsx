// @ts-nocheck

import React, { useState } from 'react';
import { Branch, Alert, GenerativeUIPayload } from '../../types';
import { Activity, Thermometer, Zap, AlertTriangle, ArrowRight, MapPin, TrendingUp, Calendar, FileText, Download, Edit3, Check, Loader2 } from 'lucide-react';

// 1. Mini Branch Card
export const GenUIBranchCard: React.FC<{ data: Branch; onNavigate: (id: string) => void }> = ({ data, onNavigate }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-2 mb-2 w-full max-w-xs text-slate-800">
    <div className={`h-1 w-full ${
        data.status === 'critical' ? 'bg-red-500' : 
        data.status === 'warning' ? 'bg-amber-500' : 'bg-green-500'
    }`} />
    <div className="p-3">
        <div className="flex justify-between items-start mb-2">
            <div>
                <h4 className="font-bold text-slate-800 text-sm">{data.name}</h4>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">ภูมิภาค: {data.region} • PUE {data.metrics.pue}</p>
            </div>
            <div className={`w-2 h-2 rounded-full ${
                data.status === 'critical' ? 'bg-red-500 animate-pulse' : 
                data.status === 'warning' ? 'bg-amber-500' : 'bg-green-500'
            }`} />
        </div>
        
        <div className="grid grid-cols-2 gap-2 mb-3">
             <div className="bg-gray-50 p-1.5 rounded flex items-center gap-2">
                <Zap size={12} className="text-blue-500" />
                <span className="text-xs font-mono text-gray-700">{data.metrics.powerUsage} kW</span>
             </div>
             <div className="bg-gray-50 p-1.5 rounded flex items-center gap-2">
                <Thermometer size={12} className="text-red-500" />
                <span className="text-xs font-mono text-gray-700">{data.metrics.temperature}°C</span>
             </div>
        </div>

        <button 
            onClick={() => onNavigate(data.id)}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs py-1.5 rounded flex items-center justify-center gap-1 transition-colors"
        >
            <MapPin size={12} />
            ไปยังตำแหน่งนี้
        </button>
    </div>
  </div>
);

// 2. Alert List Widget
export const GenUIAlertList: React.FC<{ alerts: Alert[]; onNavigate: (branchId: string) => void }> = ({ alerts, onNavigate }) => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-2 mb-2 w-full text-slate-800">
        <div className="bg-red-50 px-3 py-2 border-b border-red-100 flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-600" />
            <span className="text-xs font-bold text-red-700">ตรวจพบประเด็นวิกฤต</span>
        </div>
        <div className="divide-y divide-gray-100">
            {alerts.slice(0, 3).map(alert => (
                <div key={alert.id} className="p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between mb-1">
                        <span className="text-xs font-bold text-gray-800 line-clamp-1">{alert.title}</span>
                        <span className="text-[10px] text-gray-400">{alert.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-tight mb-2">{alert.message}</p>
                    <button 
                         onClick={() => onNavigate(alert.branchId)}
                         className="text-[10px] text-blue-600 font-medium flex items-center gap-1 hover:underline"
                    >
                        ดูรายละเอียดสาขา <ArrowRight size={10} />
                    </button>
                </div>
            ))}
        </div>
    </div>
);

// 3. Battery Status Widget
export const GenUIBatteryStatus: React.FC<{ data: any }> = ({ data }) => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 mt-2 mb-2 w-full border-l-4 border-l-blue-500 text-slate-800">
        <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-700">สรุปสถานะสุขภาพแบตเตอรี่</span>
            <Activity size={14} className="text-blue-500" />
        </div>
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">จำนวนยูนิตทั้งหมด</span>
                <span className="text-xs font-mono font-bold text-slate-800">1,944</span>
            </div>
             <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">แรงดันไฟฟ้าเฉลี่ย</span>
                <span className="text-xs font-mono font-bold text-slate-800">13.4 V</span>
            </div>
             <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">อุณหภูมิเฉลี่ย</span>
                <span className="text-xs font-mono font-bold text-green-600">24.2 °C</span>
            </div>
        </div>
    </div>
);

// 4. Energy Forecast Widget
export const GenUIForecast: React.FC<{ data: any }> = ({ data }) => (
    <div className="bg-indigo-900 rounded-xl border border-indigo-700 shadow-xl p-4 mt-2 mb-2 w-full text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp size={40} />
        </div>
        <div className="flex items-center gap-2 mb-3">
            <Calendar size={14} className="text-indigo-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">พยากรณ์ล่วงหน้า 7 วันด้วย ML</span>
        </div>
        <div className="flex justify-between items-end mb-4">
            <div>
                <p className="text-2xl font-black">{data.forecastTotal.toLocaleString()} <span className="text-xs font-normal opacity-60">kWh</span></p>
                <p className="text-[10px] text-indigo-300 uppercase font-medium">ความต้องการพลังงานรวมที่คาดการณ์</p>
            </div>
            <div className="text-right">
                <p className="text-sm font-bold text-indigo-400">{data.trend === 'increasing' ? '+' : ''}{data.trend === 'increasing' ? '4.2%' : '-1.5%'}</p>
                <p className="text-[10px] opacity-60">เทียบกับสัปดาห์ที่แล้ว</p>
            </div>
        </div>
        <div className="bg-white/10 p-2 rounded-lg border border-white/10">
            <div className="flex justify-between text-[10px] font-bold">
                <span className="opacity-60">โหลดเฉลี่ยรายวัน</span>
                <span className="font-mono">{data.avgDaily} kWh</span>
            </div>
        </div>
    </div>
);

// 5. Generated Report Widget
export const GenUIReport: React.FC<{ 
    data: any; 
    onChangeView: (view: 'map' | 'utility' | 'intelligence' | 'settings' | 'reports') => void 
}> = ({ data, onChangeView }) => {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = () => {
        setIsDownloading(true);
        setTimeout(() => setIsDownloading(false), 2000);
    };

    const handleEdit = () => {
        // Switch to report view (simulating opening the specific report)
        onChangeView('reports');
    };

    return (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mt-2 mb-2 w-full text-slate-800">
            <div className="flex items-center gap-2 mb-3 text-slate-500">
                <FileText size={16} />
                <span className="text-xs font-bold uppercase">{data.title}</span>
            </div>
            <div className="bg-white p-3 rounded border border-gray-100 text-xs font-mono text-slate-600 whitespace-pre-wrap leading-relaxed shadow-sm max-h-64 overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 break-words">
                {data.content}
            </div>
            <div className="mt-3 flex gap-2">
                <button 
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="flex-1 bg-slate-800 text-white text-xs py-1.5 rounded hover:bg-slate-700 transition-colors flex items-center justify-center gap-1 font-medium disabled:opacity-70"
                >
                    {isDownloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                    {isDownloading ? 'Downloading...' : `Download ${data.format}`}
                </button>
                <button 
                    onClick={handleEdit}
                    className="flex-1 bg-white border border-gray-300 text-slate-700 text-xs py-1.5 rounded hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-1 hover:text-blue-600 hover:border-blue-300"
                >
                    <Edit3 size={12} /> Edit in Manager
                </button>
            </div>
        </div>
    );
};

export const GenerativeUIRenderer: React.FC<{ 
    payload: GenerativeUIPayload; 
    onNavigate: (id: string) => void;
    onChangeView: (view: 'map' | 'utility' | 'intelligence' | 'settings' | 'reports') => void;
}> = ({ payload, onNavigate, onChangeView }) => {
    switch (payload.type) {
        case 'BRANCH_CARD':
            return <GenUIBranchCard data={payload.data} onNavigate={onNavigate} />;
        case 'ALERT_LIST':
            return <GenUIAlertList alerts={payload.data} onNavigate={onNavigate} />;
        case 'BATTERY_STATUS':
            return <GenUIBatteryStatus data={payload.data} />;
        case 'FORECAST_WIDGET':
            return <GenUIForecast data={payload.data} />;
        case 'GENERATED_REPORT':
            return <GenUIReport data={payload.data} onChangeView={onChangeView} />;
        default:
            return null;
    }
};
