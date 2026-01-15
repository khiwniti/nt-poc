
import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { User, Bell, Lock, Globe, Server, Save, Mail, Smartphone, Shield, Check, RefreshCw, LogOut, Moon, Sun, Trash2, Loader2, MessageSquare, Link, Unlink } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { db } from '../../services/database';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'security' | 'system'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  
  // Settings State initialized from DB
  const [userSettings, setUserSettings] = useState<any>(null);
  
  // Line OA Linking State
  const [showLineModal, setShowLineModal] = useState(false);
  const [isLinkingLine, setIsLinkingLine] = useState(false);

  useEffect(() => {
      db.getSettings().then(settings => {
        setUserSettings(settings);
        setTheme((settings.theme as 'light' | 'dark') || 'light');
      }).catch(console.error);
  }, []);

  const handleSave = () => {
      if (!userSettings) return;
      setIsSaving(true);
      
      // Update DB
      db.updateSettings({ ...userSettings, theme });

      setTimeout(() => {
          setIsSaving(false);
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 2000);
      }, 1000);
  };

  const handleClearCache = () => {
      setIsClearingCache(true);
      setTimeout(() => {
          setIsClearingCache(false);
      }, 2000);
  };

  const toggleNotif = (key: string) => {
      if (!userSettings) return;
      setUserSettings({
          ...userSettings,
          notifications: {
              ...userSettings.notifications,
              [key]: !userSettings.notifications[key]
          }
      });
  };

  const updateSetting = (section: string, key: string, value: any) => {
      if (!userSettings) return;
      if (section === 'root') {
          setUserSettings({ ...userSettings, [key]: value });
      }
  };

  const handleLinkLine = () => {
      setIsLinkingLine(true);
      setTimeout(() => {
          setUserSettings({
              ...userSettings,
              notifications: {
                  ...userSettings.notifications,
                  line: true,
                  lineOaName: 'NT Facility Ops'
              }
          });
          setIsLinkingLine(false);
          setShowLineModal(false);
      }, 2000);
  };

  const handleUnlinkLine = () => {
      setUserSettings({
          ...userSettings,
          notifications: {
              ...userSettings.notifications,
              lineOaName: null,
              line: false
          }
      });
  };

  const tabs = [
    { id: 'general', label: 'ทั่วไป', icon: <Globe size={18} /> },
    { id: 'notifications', label: 'การแจ้งเตือน', icon: <Bell size={18} /> },
    { id: 'security', label: 'ความปลอดภัย', icon: <Lock size={18} /> },
    { id: 'system', label: 'ระบบ', icon: <Server size={18} /> },
  ];

  if (!userSettings) return <div className="p-8 text-center text-slate-400"><Loader2 className="animate-spin inline-block mr-2" /> Loading settings...</div>;

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
                                    <input 
                                        type="text" 
                                        value={userSettings.username}
                                        onChange={(e) => updateSetting('root', 'username', e.target.value)} 
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">อีเมลองค์กร</label>
                                    <input 
                                        type="email" 
                                        value={userSettings.email}
                                        onChange={(e) => updateSetting('root', 'email', e.target.value)} 
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" 
                                    />
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
                            <div className="flex items-center justify-between p-4 bg-green-50/50 rounded-xl border border-green-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg text-green-600 shadow-sm"><MessageSquare size={24} /></div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">LINE Notify Integration</p>
                                        <p className="text-xs text-slate-500">รับการแจ้งเตือนเหตุขัดข้องผ่าน LINE OA</p>
                                        {userSettings.notifications.lineOaName ? (
                                            <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-green-700">
                                                <Check size={10} /> เชื่อมต่อกับ: {userSettings.notifications.lineOaName}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> ยังไม่ได้เชื่อมต่อ
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {!userSettings.notifications.lineOaName && (
                                        <button 
                                            onClick={() => setShowLineModal(true)}
                                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1 transition-colors"
                                        >
                                            <Link size={12} /> เชื่อมต่อบัญชี
                                        </button>
                                    )}
                                    {userSettings.notifications.lineOaName && (
                                        <button 
                                            onClick={handleUnlinkLine}
                                            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-500 text-xs font-bold rounded-lg hover:bg-slate-50 hover:text-red-500 transition-colors"
                                        >
                                            <Unlink size={14} />
                                        </button>
                                    )}
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={userSettings.notifications.line} onChange={() => toggleNotif('line')} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                    </label>
                                </div>
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
                                    <input type="checkbox" checked={userSettings.notifications.critical} onChange={() => toggleNotif('critical')} className="sr-only peer" />
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
                                    <input type="checkbox" checked={userSettings.notifications.daily} onChange={() => toggleNotif('daily')} className="sr-only peer" />
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
                                    <input type="checkbox" checked={userSettings.notifications.sms} onChange={() => toggleNotif('sms')} className="sr-only peer" />
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

      <Modal isOpen={showLineModal} onClose={() => setShowLineModal(false)} title="เชื่อมต่อ LINE Official Account">
          <div className="p-6 flex flex-col items-center">
              <div className="w-16 h-16 bg-[#06C755] rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg">
                  <MessageSquare size={32} fill="currentColor" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">ยืนยันการเชื่อมต่อ</h3>
              <p className="text-sm text-slate-500 text-center mb-6 max-w-sm">
                  ระบบจะทำการเชื่อมต่อกับ <strong>NT Facility Ops</strong> เพื่อส่งการแจ้งเตือนระดับวิกฤต (Critical Alerts) ไปยังกลุ่มไลน์ของคุณ
              </p>
              
              <div className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Permissions requested:</span>
                  </div>
                  <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-xs font-bold text-slate-700"><Check size={12} className="text-green-500" /> Send messages to chat</li>
                      <li className="flex items-center gap-2 text-xs font-bold text-slate-700"><Check size={12} className="text-green-500" /> Access group info</li>
                  </ul>
              </div>

              <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => setShowLineModal(false)} 
                    className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-bold"
                  >
                      ยกเลิก
                  </button>
                  <button 
                    onClick={handleLinkLine}
                    disabled={isLinkingLine}
                    className="flex-1 py-3 bg-[#06C755] hover:bg-[#05b64d] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                  >
                      {isLinkingLine ? <Loader2 size={16} className="animate-spin" /> : 'อนุญาต (Authorize)'}
                  </button>
              </div>
          </div>
      </Modal>
    </div>
  );
};
