
import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, LayoutDashboard, Wrench, BarChart3, Package, Briefcase, FileText, Settings, LogOut, ArrowRight, Activity, Box, BrainCircuit } from 'lucide-react';
import { Branch } from '../../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: 'map' | 'utility' | 'intelligence' | 'settings' | 'reports' | 'leases' | 'maintenance' | 'assets' | 'predictive' | 'inventory') => void;
  onSelectBranch: (branchId: string) => void;
  branches: Branch[];
  onLogout: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate, onSelectBranch, branches, onLogout }) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
        setTimeout(() => inputRef.current?.focus(), 50);
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  // Filter items
  const views = [
      { id: 'map', label: 'ภาพรวมแผนที่', icon: MapPin, group: 'Navigation' },
      { id: 'utility', label: 'ศูนย์จัดการสาธารณูปโภค', icon: LayoutDashboard, group: 'Navigation' },
      { id: 'intelligence', label: 'ศูนย์ข้อมูลอัจฉริยะ (AI)', icon: BrainCircuit, group: 'Navigation' },
      { id: 'maintenance', label: 'ใบงานซ่อมบำรุง', icon: Wrench, group: 'Operations' },
      { id: 'predictive', label: 'การบำรุงรักษาเชิงพยากรณ์', icon: Activity, group: 'Operations' },
      { id: 'assets', label: 'วงจรชีวิตทรัพย์สิน', icon: BarChart3, group: 'Operations' },
      { id: 'inventory', label: 'คลังอะไหล่', icon: Package, group: 'Logistics' },
      { id: 'leases', label: 'สัญญาเช่า', icon: Briefcase, group: 'Commercial' },
      { id: 'reports', label: 'เอกสารรายงาน', icon: FileText, group: 'Compliance' },
      { id: 'settings', label: 'ตั้งค่าระบบ', icon: Settings, group: 'System' },
  ];

  const filteredBranches = branches.filter(b => b.name.toLowerCase().includes(search.toLowerCase()) || b.region.toLowerCase().includes(search.toLowerCase()));
  const filteredViews = views.filter(v => v.label.toLowerCase().includes(search.toLowerCase()));
  
  const allItems = [
      ...filteredBranches.map(b => ({ type: 'branch', data: b })),
      ...filteredViews.map(v => ({ type: 'view', data: v })),
      { type: 'action', data: { label: 'ออกจากระบบ', icon: LogOut, action: onLogout } }
  ];

  // Keyboard Navigation
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (!isOpen) return;

          if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSelectedIndex(prev => (prev + 1) % allItems.length);
          } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSelectedIndex(prev => (prev - 1 + allItems.length) % allItems.length);
          } else if (e.key === 'Enter') {
              e.preventDefault();
              executeItem(allItems[selectedIndex]);
          } else if (e.key === 'Escape') {
              onClose();
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, allItems]);

  const executeItem = (item: any) => {
      if (!item) return;
      if (item.type === 'branch') {
          onSelectBranch(item.data.id);
          onNavigate('map');
      } else if (item.type === 'view') {
          onNavigate(item.data.id);
      } else if (item.type === 'action') {
          item.data.action();
      }
      onClose();
      setSearch('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
        
        <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden animate-fade-in-up border border-slate-200">
            <div className="flex items-center px-4 py-3 border-b border-slate-100">
                <Search className="w-5 h-5 text-slate-400 mr-3" />
                <input 
                    ref={inputRef}
                    type="text" 
                    className="flex-1 bg-transparent border-none focus:ring-0 text-slate-800 placeholder-slate-400 text-sm font-medium h-10"
                    placeholder="ค้นหาสาขา, มุมมอง หรือคำสั่ง..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setSelectedIndex(0); }}
                />
                <div className="flex gap-2">
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-bold">ESC</span>
                </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto py-2">
                {allItems.length === 0 ? (
                    <div className="px-6 py-8 text-center text-slate-500 text-sm">
                        ไม่พบผลลัพธ์
                    </div>
                ) : (
                    <>
                        {filteredBranches.length > 0 && (
                            <div className="mb-2">
                                <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">สาขา (Branches)</div>
                                {filteredBranches.map((branch, idx) => {
                                    // Calculate global index for selection highlight
                                    const globalIdx = idx;
                                    const isSelected = selectedIndex === globalIdx;
                                    return (
                                        <div 
                                            key={branch.id}
                                            onClick={() => executeItem({ type: 'branch', data: branch })}
                                            className={`px-4 py-3 mx-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <MapPin size={16} className={isSelected ? 'text-blue-500' : 'text-slate-400'} />
                                                <span className="font-bold text-sm">{branch.name}</span>
                                                <span className="text-xs opacity-60 ml-2">{branch.region}</span>
                                            </div>
                                            {isSelected && <ArrowRight size={16} className="text-blue-500" />}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {filteredViews.length > 0 && (
                            <div className="mb-2">
                                <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">เมนูและโมดูล</div>
                                {filteredViews.map((view, idx) => {
                                    const globalIdx = filteredBranches.length + idx;
                                    const isSelected = selectedIndex === globalIdx;
                                    return (
                                        <div 
                                            key={view.id}
                                            onClick={() => executeItem({ type: 'view', data: view })}
                                            className={`px-4 py-3 mx-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <view.icon size={16} className={isSelected ? 'text-indigo-500' : 'text-slate-400'} />
                                                <span className="font-medium text-sm">{view.label}</span>
                                            </div>
                                            {isSelected && <ArrowRight size={16} className="text-indigo-500" />}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="border-t border-slate-100 mt-2 pt-2">
                             <div 
                                onClick={() => executeItem({ type: 'action', data: { action: onLogout } })}
                                className={`px-4 py-3 mx-2 rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${selectedIndex === allItems.length - 1 ? 'bg-red-50 text-red-700' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <LogOut size={16} className={selectedIndex === allItems.length - 1 ? 'text-red-500' : 'text-slate-400'} />
                                <span className="font-bold text-sm">ออกจากระบบ</span>
                            </div>
                        </div>
                    </>
                )}
            </div>
            
            <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                <div className="flex gap-3">
                    <span className="flex items-center gap-1"><kbd className="bg-white border border-slate-200 rounded px-1 shadow-sm font-sans">↑↓</kbd> เพื่อเลือก</span>
                    <span className="flex items-center gap-1"><kbd className="bg-white border border-slate-200 rounded px-1 shadow-sm font-sans">Enter</kbd> เพื่อตกลง</span>
                </div>
                <span>NT Facility Manager v2.4</span>
            </div>
        </div>
    </div>
  );
};
