
import React from 'react';
import { AlertTriangle, Info, ShieldAlert, X, Bell, ArrowRight, FileText, Plus } from 'lucide-react';
import { Alert } from '../../types';

interface AlertDropdownProps {
  alerts: Alert[];
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onNavigate?: (branchId: string) => void;
  onDraftReport?: (alertId: string) => void;
}

export const AlertDropdown: React.FC<AlertDropdownProps> = ({ alerts, onMarkRead, onClearAll, isOpen, setIsOpen, onNavigate, onDraftReport }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 text-slate-800">
      <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <h3 className="font-semibold text-gray-700 text-sm">การแจ้งเตือน</h3>
        {alerts.length > 0 && <button onClick={onClearAll} className="text-xs text-nt-dark hover:underline font-bold">Clear all</button>}
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm flex flex-col items-center">
            <Bell className="w-8 h-8 mb-2 opacity-20" />
            ไม่มีการแจ้งเตือนใหม่
          </div>
        ) : (
          alerts.map((alert) => (
            <div 
              key={alert.id} 
              className={`p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors flex flex-col gap-2 relative ${!alert.read ? 'bg-blue-50/20' : ''}`}
            >
              <div className="flex gap-3 items-start">
                  <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    alert.severity === 'critical' ? 'bg-red-500' : alert.severity === 'warning' ? 'bg-orange-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-xs text-gray-800 line-clamp-1">{alert.title}</span>
                      <span className="text-[10px] text-gray-400">{alert.timestamp.toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{alert.message}</p>
                  </div>
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                <button 
                  onClick={() => onNavigate?.(alert.branchId)}
                  className="flex-1 py-1.5 bg-gray-50 border border-gray-200 rounded text-[10px] font-bold text-gray-600 hover:bg-white flex items-center justify-center gap-1"
                >
                    <ArrowRight size={12} /> View Branch
                </button>
                <button 
                  onClick={() => onDraftReport?.(alert.id)}
                  className="flex-1 py-1.5 bg-indigo-50 border border-indigo-100 rounded text-[10px] font-bold text-indigo-600 hover:bg-white flex items-center justify-center gap-1"
                >
                    <FileText size={12} /> Draft Report
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-2 bg-gray-50 border-t border-gray-100 text-center">
        <button className="text-[10px] font-bold text-blue-600 hover:underline">VIEW ALL ACTIVITY</button>
      </div>
    </div>
  );
};
