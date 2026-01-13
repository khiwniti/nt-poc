
import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { User, Bell, Lock, Globe, Server, Save, Mail, Smartphone, Shield, Check, RefreshCw, LogOut, Moon, Sun, Trash2, Loader2, MessageSquare } from 'lucide-react';
import { Modal } from '../ui/Modal';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'security' | 'system'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  
  // Notification States
  const [notifSettings, setNotifSettings] = useState({
    critical: true,
    daily: false,
    maintenance: true,
    email: true,
    sms: false,
    line: true
  });

  const handleSave = () => {
      setIsSaving(true);
      setTimeout(() => {
          setIsSaving(false);
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 2000);
      }, 1500);
  };

  const handleClearCache = () => {
      setIsClearingCache(true);
      setTimeout(() => {
          setIsClearingCache(false);
      }, 2000);
  };

  const toggleNotif = (key: keyof typeof notifSettings) => {
      setNotifSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const tabs = [
    { id: 'general', label: 'ทั่วไป', icon: <Globe size={18} /> },
    { id: 'notifications', label: 'การแจ้งเตือน', icon: <Bell size={18} /> },
    { id: 'security', label: 'ความปลอดภัย', icon: <Lock size={18} /> },
    { id: 'system', label: 'ระบบ', icon: <Server size={18} /> },
  ];

  return (
    <div className="w-full h-full overflow-y-auto p-6 bg-slate-50/50 text-slate-800 animate-fade-in-up">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <User className="text-nt-dark" /> การตั้งค่าระบบ
        </h1>
        
        <div className="flex flex-col md:flex-row gap-6">
            {/* Sidebar Tabs */}
            <div className="w-full md:w-64 flex-shrink-0 space-y-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                            activeTab === tab.id 
                            ? 'bg-white text-blue-600 shadow-md border border-blue-100' 
                            : 'text-slate-500 hover:bg-white/60 hover:text-slate-700'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 space-y-6">
                
                {/* General Settings */}
                {activeTab === 'general' && (
                    <Card title="ตั้งค่าทั่วไป">
                        <div className="space-y-6 p-2">
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">ชื่อผู้ใช้งาน</label>
                                    <input type="text" defaultValue="Admin User" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">อีเมลองค์กร</label>
                                    <input type="email" defaultValue="admin@ntplc.co.th" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>
                            
                            <div className="pt-4 border-t border-slate-100">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-3">ธีมการแสดงผล</label>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => setTheme('light')}
                                        className={`flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all ${theme === 'light' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        <Sun size={18} /> Light Mode
                                    </button>
                                    <button 
                                        onClick={() => setTheme('dark')}
                                        className={`flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        <Moon size={18} /> Dark Mode
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Notification Settings */}
                {activeTab === 'notifications' && (
                    <Card title="ตั้งค่าการแจ้งเตือน">
                        <div className="space-y-4 p-2">
                            {/* LINE Integration */}
                            <div className="flex items-center justify-between p-3 bg-green-50/50 rounded-lg border border-green-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg text-green-600 shadow-sm"><MessageSquare size={20} /></div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">LINE Notify Integration</p>
                                        <p className="text-xs text-slate-500">รับการแจ้งเตือนเหตุขัดข้องผ่าน LINE OA</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={notifSettings.line} onChange={() => toggleNotif('line')} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-red-50/50 rounded-lg border border-red-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg text-red-500 shadow-sm"><Shield size={20} /></div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">การแจ้งเตือนระดับวิกฤต</p>
                                        <p className="text-xs text-slate-500">แจ้งเตือนทันทีเมื่อระบบขัดข้องหรือมีความเสี่ยงสูง</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={notifSettings.critical} onChange={() => toggleNotif('critical')} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg text-blue-500 shadow-sm"><Mail size={20} /></div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">สรุปรายงานประจำวัน</p>
                                        <p className="text-xs text-slate-500">รับอีเมลสรุปสถานะระบบทุกเวลา 08:00 น.</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={notifSettings.daily} onChange={() => toggleNotif('daily')} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg text-gray-500 shadow-sm"><Smartphone size={20} /></div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">SMS Alerts</p>
                                        <p className="text-xs text-slate-500">รับข้อความ SMS กรณีฉุกเฉินเท่านั้น</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={notifSettings.sms} onChange={() => toggleNotif('sms')} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-600"></div>
                                </label>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Security Settings */}
                {activeTab === 'security' && (
                    <Card title="ความปลอดภัย">
                        <div className="space-y-6 p-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800">การยืนยันตัวตนสองชั้น (2FA)</h4>
                                    <p className="text-xs text-slate-500">เพิ่มความปลอดภัยด้วย Google Authenticator</p>
                                </div>
                                <button 
                                    onClick={() => setTwoFAEnabled(!twoFAEnabled)}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${twoFAEnabled ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    {twoFAEnabled ? 'เปิดใช้งานแล้ว' : 'เปิดใช้งาน'}
                                </button>
                            </div>

                            <div className="border-t border-slate-100 pt-4">
                                <h4 className="text-sm font-bold text-slate-800 mb-3">อุปกรณ์ที่กำลังใช้งาน</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-100 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-green-600 shadow-sm">
                                                <Globe size={16} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-800">Chrome on Windows (เครื่องนี้)</p>
                                                <p className="text-[10px] text-slate-500">กรุงเทพฯ, ไทย • ใช้งานเมื่อสักครู่</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-green-600 font-bold bg-white px-2 py-1 rounded shadow-sm">Active</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-lg opacity-75">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-500 shadow-sm">
                                                <Smartphone size={16} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-800">iPhone 14 Pro</p>
                                                <p className="text-[10px] text-slate-500">เชียงใหม่, ไทย • 2 ชม. ที่แล้ว</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setShowRevokeModal(true)} className="text-[10px] text-red-500 hover:underline">Revoke</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {/* System Settings */}
                {activeTab === 'system' && (
                    <Card title="การดูแลระบบ">
                         <div className="space-y-4 p-2">
                             <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                 <h4 className="text-sm font-bold text-slate-800 mb-1">ล้างข้อมูลแคช (Clear Cache)</h4>
                                 <p className="text-xs text-slate-500 mb-3">ลบข้อมูลชั่วคราวของแผนที่และโมเดล 3 มิติ เพื่อแก้ไขปัญหาการแสดงผล</p>
                                 <button 
                                    onClick={handleClearCache}
                                    disabled={isClearingCache}
                                    className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                                 >
                                    {isClearingCache ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                    {isClearingCache ? 'กำลังล้างข้อมูล...' : 'ล้างแคชทันที'}
                                 </button>
                             </div>
                             
                             <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-100">
                                 <span>System Version</span>
                                 <span className="font-mono">v2.4.1 (Build 20240512)</span>
                             </div>
                         </div>
                    </Card>
                )}

                {/* Sticky Save Button */}
                <div className="sticky bottom-6 flex justify-end">
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`
                            px-6 py-3 rounded-xl font-bold text-sm text-white shadow-lg flex items-center gap-2 transition-all duration-300
                            ${saveSuccess ? 'bg-green-500' : 'bg-nt-dark hover:bg-slate-800 hover:translate-y-[-2px]'}
                        `}
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : saveSuccess ? <Check size={18} /> : <Save size={18} />}
                        {isSaving ? 'กำลังบันทึก...' : saveSuccess ? 'บันทึกสำเร็จ!' : 'บันทึกการเปลี่ยนแปลง'}
                    </button>
                </div>

            </div>
        </div>
      </div>

      <Modal isOpen={showRevokeModal} onClose={() => setShowRevokeModal(false)} title="ยืนยันการระงับการเข้าถึง">
          <div className="p-6">
              <div className="flex items-center gap-4 bg-red-50 p-4 rounded-lg mb-6">
                 <div className="p-2 bg-red-100 rounded-full text-red-600"><LogOut size={24} /></div>
                 <div>
                     <h4 className="font-bold text-red-900">คุณแน่ใจหรือไม่?</h4>
                     <p className="text-sm text-red-700">การระงับการเข้าถึงจะทำให้ iPhone 14 Pro ออกจากระบบทันที</p>
                 </div>
              </div>
              <div className="flex justify-end gap-3">
                  <button onClick={() => setShowRevokeModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-bold">ยกเลิก</button>
                  <button onClick={() => setShowRevokeModal(false)} className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-bold">ระงับการเข้าถึง</button>
              </div>
          </div>
      </Modal>
    </div>
  );
};
