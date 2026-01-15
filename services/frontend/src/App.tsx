
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ThailandMap } from './components/Map/ThailandMap';
import { FacilityPanel } from './components/Dashboard/FacilityPanel';
import { AIChatWidget } from './components/Chat/AIChatWidget';
import { GlobalOverview } from './components/Dashboard/GlobalOverview';
import { AlertDropdown } from './components/ui/AlertSystem';
import { UtilityCenter } from './components/Utility/UtilityCenter';
import { IntelligenceHub } from './components/Dashboard/IntelligenceHub';
import { Battery3DView } from './components/Dashboard/Battery3DView';
import { Mall3DView } from './components/Dashboard/Mall3DView';
import { SettingsPage } from './components/Settings/SettingsPage';
import { ReportManager } from './components/Reports/ReportManager';
import { LeaseManager } from './components/Leases/LeaseManager';
import { WorkOrderManager } from './components/Maintenance/WorkOrderManager';
import { AssetLifecycleManager } from './components/Assets/AssetLifecycleManager';
import { PredictiveMaintenance } from './components/Maintenance/PredictiveMaintenance';
import { SparePartsManager } from './components/Inventory/SparePartsManager';
import { CommandPalette } from './components/ui/CommandPalette';
import { LoginPage } from './components/Auth/LoginPage';
import { Branch, Alert, ReportDocument, ReportBlock, ISOStandard, AlertType, AlertStatus, AlertSeverity } from './types';
import { BRANCHES } from './constants';
import { Bell, X, Menu, LogOut, Map as MapIcon, LayoutDashboard, Settings, BrainCircuit, FileText, Loader2, ChevronRight, Search, User, Briefcase, Box, Wrench, BarChart3, Activity, Package, MessageSquare } from 'lucide-react';
import { generateReportFromAlert } from './services/geminiService';
import { db } from './services/database';

const ALERT_TYPES = [
  { title: 'ตรวจพบไฟฟ้าขัดข้อง', message: 'แหล่งจ่ายไฟหลักขัดข้อง ระบบสำรองไฟฟ้า (Generator) กำลังทำงาน', severity: 'critical', category: 'equipment' },
  { title: 'คำเตือนอุณหภูมิสูง', message: 'อุณหภูมิในห้องเซิร์ฟเวอร์ B สูงเกินขีดจำกัดความปลอดภัย', severity: 'warning', category: 'energy' },
  { title: 'ความผิดปกติของการใช้พลังงาน', message: 'ตรวจพบการใช้พลังงานพุ่งสูง (+161%) ที่สาขาบางรัก', severity: 'critical', category: 'energy' },
];

const Toast: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return createPortal(
        <div className="fixed top-20 right-6 z-[100] animate-slide-in-right">
            <div className="bg-[#06C755] text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-green-400/50 backdrop-blur-md">
                <div className="p-1.5 bg-white/20 rounded-full">
                    <MessageSquare size={16} fill="currentColor" />
                </div>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">LINE Notify Sent</p>
                    <p className="text-sm font-bold">{message}</p>
                </div>
                <button onClick={onClose} className="ml-2 hover:bg-white/20 p-1 rounded-full"><X size={14}/></button>
            </div>
        </div>,
        document.body
    );
};

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeView, setActiveView] = useState<'map' | 'utility' | 'intelligence' | 'settings' | 'reports' | 'leases' | 'maintenance' | 'assets' | 'predictive' | 'inventory'>('map');
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [reports, setReports] = useState<ReportDocument[]>([]);
  const [isAlertDropdownOpen, setIsAlertDropdownOpen] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [is3DModeOpen, setIs3DModeOpen] = useState(false);
  const [branchFor3D, setBranchFor3D] = useState<Branch | null>(null);
  const [isAutoDrafting, setIsAutoDrafting] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Check Login Session
  useEffect(() => {
      const session = localStorage.getItem('nt_session');
      if (session) setIsLoggedIn(true);

      // Load reports asynchronously
      db.getReports().then(setReports).catch(console.error);
  }, []);

  const handleLogin = () => {
      localStorage.setItem('nt_session', 'active');
      setIsLoggedIn(true);
  };

  const handleLogout = () => {
      localStorage.removeItem('nt_session');
      localStorage.removeItem('nt_facility_db'); // Reset demo data too
      setIsLoggedIn(false);
      window.location.reload();
  };

  // Simulated Alert Generation
  useEffect(() => {
    if (!isLoggedIn) return;
    
    const interval = setInterval(() => {
      if (Math.random() > 0.85) {
        const randomBranch = BRANCHES[Math.floor(Math.random() * BRANCHES.length)];
        const randomAlert = ALERT_TYPES[Math.floor(Math.random() * ALERT_TYPES.length)];
        const newAlert: Alert = {
          id: Date.now().toString(),
          facilityId: randomBranch.id,
          zoneId: 'default-zone',
          batterySystemId: 'system-1',
          type: AlertType.TEMPERATURE,
          severity: randomAlert.severity as any,
          status: AlertStatus.ACTIVE,
          message: randomAlert.message,
          createdAt: Date.now(),
          // Legacy compatibility
          branchId: randomBranch.id,
          title: `${randomAlert.title} - ${randomBranch.name}`,
          category: randomAlert.category as any,
          timestamp: new Date(),
          read: false
        };
        setAlerts(prev => [newAlert, ...prev]);

        // Check Settings for LINE Notification
        db.getSettings().then(settings => {
          if (settings?.notifications?.line && newAlert.severity === 'critical') {
              setToastMessage(`${newAlert.title}`);
          }
        }).catch(console.error);
      }
    }, 25000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  // Command Palette Shortcut
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
              e.preventDefault();
              setIsCommandPaletteOpen(true);
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMarkRead = (id: string) => setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  const handleClearAll = () => setAlerts([]);
  
  const handleNavigateBranch = (branchId: string) => {
      const branch = BRANCHES.find(b => b.id === branchId);
      if (branch) { setSelectedBranch(branch); setActiveView('map'); }
  };

  const handleOpen3DMode = (branch: Branch) => {
      setBranchFor3D(branch); setIs3DModeOpen(true);
  };

  const handleDraftFromAlert = async (alertId: string) => {
      const alert = alerts.find(a => a.id === alertId);
      if (!alert) return;
      setIsAutoDrafting(true);
      setActiveView('reports');
      setIsAlertDropdownOpen(false);
      try {
          const branch = BRANCHES.find(b => b.id === alert.branchId);
          const draft = await generateReportFromAlert(alert, branch);
          const newReport: ReportDocument = {
              id: Date.now().toString(),
              title: draft.title || 'รายงานเหตุการณ์ (Incident Report)',
              standard: (draft.standard as ISOStandard) || 'ISO-27001',
              isoControlId: draft.isoControlId,
              classification: draft.classification as any || 'Internal',
              author: 'ระบบ AI',
              lastModified: new Date(),
              status: 'draft',
              version: '1.0',
              linkedAlertId: alertId,
              blocks: (draft.blocks || []).map(b => ({ ...b, id: Math.random().toString(36).substr(2, 9) })) as ReportBlock[]
          };
          db.createReport(newReport).then(() => {
            return db.getReports();
          }).then(setReports).catch(console.error);
          handleMarkRead(alertId);
      } catch (e) {
          console.error("Auto-drafting failed", e);
      } finally {
          setIsAutoDrafting(false);
      }
  };

  const unreadCount = alerts.filter(a => !a.read).length;

  if (!isLoggedIn) {
      return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-800 overflow-hidden">
      
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}

      {/* Standard Sidebar */}
      <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 ease-in-out z-40 shadow-xl shrink-0`}>
        {/* Sidebar Header */}
        <div className="h-16 flex items-center px-5 border-b border-slate-800 shrink-0">
            <div className="w-9 h-9 bg-gradient-to-br from-nt-yellow to-yellow-600 rounded-lg flex items-center justify-center font-black text-slate-900 shadow-lg shrink-0">
                NT
            </div>
            {!isSidebarCollapsed && (
                <div className="ml-3 overflow-hidden whitespace-nowrap animate-fade-in-up">
                    <h1 className="font-bold text-white text-sm leading-tight tracking-wide">Facility 3D</h1>
                    <p className="text-[10px] text-slate-500 font-mono">Enterprise v2.4</p>
                </div>
            )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
             {[
                { id: 'map', icon: MapIcon, label: 'ภาพรวมแผนที่' },
                { id: 'maintenance', icon: Wrench, label: 'ใบงานซ่อมบำรุง' },
                { id: 'predictive', icon: Activity, label: 'การบำรุงรักษาเชิงพยากรณ์' },
                { id: 'assets', icon: BarChart3, label: 'วงจรชีวิตทรัพย์สิน' },
                { id: 'inventory', icon: Package, label: 'คลังอะไหล่' },
                { id: 'utility', icon: LayoutDashboard, label: 'ศูนย์จัดการพลังงาน' },
                { id: 'leases', icon: Briefcase, label: 'สัญญาเช่าพื้นที่' },
                { id: 'intelligence', icon: BrainCircuit, label: 'ศูนย์ข้อมูลอัจฉริยะ (AI)' },
                { id: 'reports', icon: FileText, label: 'ศูนย์เอกสารรายงาน' },
                { id: 'settings', icon: Settings, label: 'ตั้งค่าระบบ' }
            ].map(item => (
                <button 
                    key={item.id}
                    onClick={() => { setActiveView(item.id as any); setIs3DModeOpen(false); }} 
                    className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative
                        ${activeView === item.id && !is3DModeOpen
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'hover:bg-slate-800 hover:text-white'}
                    `}
                    title={item.label}
                >
                    <item.icon className={`w-5 h-5 shrink-0 ${activeView === item.id && !is3DModeOpen ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                    {!isSidebarCollapsed && (
                        <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                    )}
                    {activeView === item.id && !is3DModeOpen && !isSidebarCollapsed && (
                        <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                    )}
                    {/* Tooltip for collapsed state */}
                    {isSidebarCollapsed && (
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg border border-slate-700">
                            {item.label}
                        </div>
                    )}
                </button>
            ))}
            
            {/* Active 3D Indicator in Sidebar */}
            {is3DModeOpen && (
                <div className={`mt-2 w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-indigo-900/50 text-indigo-200 border border-indigo-500/30 animate-pulse`}>
                    <Box className="w-5 h-5 shrink-0 text-indigo-400" />
                    {!isSidebarCollapsed && (
                        <span className="text-sm font-medium whitespace-nowrap">กำลังดูโมเดล 3 มิติ</span>
                    )}
                </div>
            )}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800">
             <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors group">
                <LogOut className="w-5 h-5 shrink-0 group-hover:translate-x-1 transition-transform" />
                {!isSidebarCollapsed && <span className="text-sm font-medium">ออกจากระบบ</span>}
             </button>
        </div>
      </aside>

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">
        
        {/* Standard Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-30 shadow-sm relative">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
                    className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <Menu className="w-5 h-5" />
                </button>
                
                <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block"></div>
                
                <div className="flex flex-col">
                    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                        {is3DModeOpen ? 'ตรวจสอบดิจิทัลทวิน (Digital Twin)' : 
                         activeView === 'map' ? 'ภาพรวมการปฏิบัติการ' : 
                         activeView === 'utility' ? 'ศูนย์จัดการสาธารณูปโภค' :
                         activeView === 'maintenance' ? 'การซ่อมบำรุงและใบงาน' :
                         activeView === 'predictive' ? 'AI วิเคราะห์เชิงพยากรณ์' :
                         activeView === 'assets' ? 'การบริหารวงจรชีวิตทรัพย์สิน' :
                         activeView === 'inventory' ? 'คลังอะไหล่และอุปกรณ์' :
                         activeView === 'leases' ? 'การบริหารสัญญาเช่า' :
                         activeView === 'intelligence' ? 'ศูนย์ข้อมูลอัจฉริยะ (AI Hub)' :
                         activeView === 'reports' ? 'รายงานและเอกสาร' : 'การตั้งค่าระบบ'}
                         
                        {(selectedBranch && (activeView === 'map' || is3DModeOpen)) && (
                            <>
                                <ChevronRight className="w-4 h-4 text-slate-300" />
                                <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs">{selectedBranch.name}</span>
                            </>
                        )}
                    </h2>
                </div>
            </div>

            <div className="flex items-center gap-4">
                 {/* Search Bar Trigger */}
                 <div 
                    onClick={() => setIsCommandPaletteOpen(true)}
                    className="hidden md:flex items-center bg-slate-100 rounded-lg px-3 py-1.5 border border-transparent focus-within:border-blue-300 focus-within:bg-white transition-all w-64 cursor-text"
                 >
                    <Search className="w-4 h-4 text-slate-400 mr-2" />
                    <span className="text-xs text-slate-400 font-medium">ค้นหา...</span>
                    <span className="ml-auto text-[10px] text-slate-400 font-mono border border-slate-200 rounded px-1">⌘K</span>
                 </div>

                 {/* Alerts */}
                 <div className="relative">
                    <button 
                        className={`p-2.5 rounded-full relative transition-all ${isAlertDropdownOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
                        onClick={() => setIsAlertDropdownOpen(!isAlertDropdownOpen)}
                    >
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        )}
                    </button>
                    <AlertDropdown alerts={alerts} onMarkRead={handleMarkRead} onClearAll={handleClearAll} isOpen={isAlertDropdownOpen} setIsOpen={setIsAlertDropdownOpen} onNavigate={handleNavigateBranch} onDraftReport={handleDraftFromAlert} />
                 </div>

                 <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block"></div>

                 {/* User Profile */}
                 <div className="flex items-center gap-3 pl-1 cursor-pointer hover:bg-slate-50 p-1 rounded-lg transition-colors" onClick={() => setActiveView('settings')}>
                      <div className="text-right hidden md:block">
                          <div className="text-xs font-bold text-slate-700">ผู้ดูแลระบบ</div>
                          <div className="text-[10px] text-slate-400">System Administrator</div>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-600 border border-white ring-2 ring-slate-100 overflow-hidden">
                          <User className="w-5 h-5 text-slate-500" />
                      </div>
                 </div>
            </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 relative overflow-hidden bg-grid-slate">
             {activeView === 'map' && (
                 <div className="absolute inset-0">
                    <div className="absolute inset-0 z-0">
                        <ThailandMap selectedBranch={selectedBranch} onSelectBranch={setSelectedBranch} />
                    </div>
                    <div className={`absolute top-4 left-4 bottom-4 w-full max-w-[400px] z-20 flex flex-col pointer-events-none transition-transform duration-500 ease-out ${selectedBranch || activeView === 'map' ? 'translate-x-0' : '-translate-x-[120%]'}`}>
                      <div className="flex-1 bg-white/95 backdrop-blur-md rounded-xl shadow-tech-lg border border-slate-200 overflow-hidden pointer-events-auto flex flex-col relative ring-1 ring-black/5">
                         {selectedBranch && (
                            <button onClick={() => setSelectedBranch(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full z-10 transition-colors"><X className="w-4 h-4" /></button>
                         )}
                         <div className="flex-1 overflow-hidden p-6 relative">
                           {selectedBranch ? (
                             <FacilityPanel branch={selectedBranch} onOpen3D={() => handleOpen3DMode(selectedBranch)} />
                           ) : (
                             <GlobalOverview onChangeView={setActiveView} />
                           )}
                         </div>
                      </div>
                    </div>
                 </div>
             )}

             {activeView !== 'map' && (
                 <div className="h-full w-full overflow-hidden relative">
                     {activeView === 'reports' && (
                        <div className="h-full">
                            {isAutoDrafting && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                                    <div className="flex flex-col items-center p-8 bg-white rounded-2xl shadow-2xl border border-slate-100">
                                        <Loader2 className="w-10 h-10 text-nt-dark animate-spin mb-4" />
                                        <p className="text-sm font-bold text-slate-800">กำลังร่างรายงานเหตุการณ์ผ่าน Gemini...</p>
                                        <p className="text-xs text-slate-400 font-mono mt-2">กำลังรวบรวมข้อมูล Telemetry</p>
                                    </div>
                                </div>
                            )}
                            <ReportManager reports={reports} setReports={(newReports) => {
                                setReports(newReports); 
                            }} />
                        </div>
                     )}
                     
                     {activeView === 'leases' && <LeaseManager />}
                     {activeView === 'maintenance' && <WorkOrderManager />}
                     {activeView === 'predictive' && <PredictiveMaintenance />}
                     {activeView === 'inventory' && <SparePartsManager />}
                     {activeView === 'assets' && <AssetLifecycleManager />}
                     {activeView === 'utility' && <UtilityCenter branches={BRANCHES} />}
                     {activeView === 'intelligence' && <IntelligenceHub branches={BRANCHES} />}
                     {activeView === 'settings' && <SettingsPage />}
                 </div>
             )}

            <AIChatWidget branches={BRANCHES} alerts={alerts} currentBranchId={selectedBranch?.id || null} activeView={activeView} onNavigateBranch={handleNavigateBranch} onChangeView={setActiveView} onOpen3D={handleOpen3DMode} />

            {/* 3D View */}
            {is3DModeOpen && branchFor3D && (
              <div className="absolute inset-0 z-40 bg-slate-50 animate-fade-in-up flex flex-col">
                 <div className="flex-1 relative overflow-hidden">
                   {['bangrak', 'nonthaburi'].includes(branchFor3D.id) ? <Mall3DView branch={branchFor3D} onClose={() => setIs3DModeOpen(false)} /> : <Battery3DView branch={branchFor3D} onClose={() => setIs3DModeOpen(false)} />}
                 </div>
              </div>
            )}

            {/* Command Palette */}
            <CommandPalette 
                isOpen={isCommandPaletteOpen} 
                onClose={() => setIsCommandPaletteOpen(false)}
                onNavigate={(view) => { setActiveView(view); setIs3DModeOpen(false); }}
                onSelectBranch={handleNavigateBranch}
                branches={BRANCHES}
                onLogout={handleLogout}
            />
        </main>

      </div>
    </div>
  );
};

export default App;
