
import React, { useState, useMemo } from 'react';
import { Branch } from '../../types';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { 
  Zap, Search, AlertTriangle, TrendingUp, BrainCircuit, Eye, Activity, Calendar, 
  CheckCircle2, FileText, Wrench, Clock, XCircle, Power, RefreshCw, User, Check, 
  Loader2, Battery, Server, Video, Fan, Filter, Fuel, Thermometer
} from 'lucide-react';

interface UtilityCenterProps {
  branches: Branch[];
}

const EnergyChart = ({ data, projected }: { data: number[], projected: number[] }) => {
    const width = 600;
    const height = 200;
    const padding = 20;
    const max = Math.max(...data, ...projected) * 1.2;
    
    const getX = (i: number) => padding + (i * (width - padding * 2) / (data.length + projected.length - 1));
    const getY = (v: number) => height - padding - (v / max * (height - padding * 2));

    const historyPoints = data.map((v, i) => `${getX(i)},${getY(v)}`).join(' ');
    const forecastPoints = projected.map((v, i) => `${getX(data.length + i)},${getY(v)}`).join(' ');
    const startForecastX = getX(data.length - 1);
    const startForecastY = getY(data[data.length - 1]);

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
            </defs>
            <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#e2e8f0" strokeWidth="2" />
            <path d={`M ${padding},${height-padding} ${historyPoints} L ${getX(data.length-1)},${height-padding} Z`} fill="url(#areaGrad)" />
            <polyline points={historyPoints} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
            <path d={`M ${startForecastX},${startForecastY} L ${forecastPoints.split(' ')[0]} ${forecastPoints}`} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4,4" />
            <text x={getX(data.length/2)} y={height+5} className="text-[10px] fill-slate-400 font-mono">ประวัติ (History)</text>
            <text x={getX(data.length + projected.length/2)} y={height+5} className="text-[10px] fill-slate-400 font-mono">พยากรณ์ (Forecast)</text>
        </svg>
    );
};

export const UtilityCenter: React.FC<UtilityCenterProps> = ({ branches }) => {
  const [filter, setFilter] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [strategyActive, setStrategyActive] = useState(false);
  const [showFullDiagnosis, setShowFullDiagnosis] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [maintenanceDate, setMaintenanceDate] = useState('');
  const [assignedTech, setAssignedTech] = useState('');
  const [isSubmittingMaintenance, setIsSubmittingMaintenance] = useState(false);
  
  // Real-world equipment based on NT Data Center research
  const assets = useMemo(() => {
    return branches.flatMap(b => [
      // UPS Systems - Modular & Monoblock
      { 
          id: `UPS-${b.id}-01`.toUpperCase(), 
          type: 'UPS System', 
          branch: b.name, 
          status: b.status === 'critical' ? 'warning' : 'operational', 
          lastMaintenance: '2024-04-12', 
          nextMaintenance: '2024-10-12', 
          model: 'Delta Modulon DPH 500kVA',
          specs: 'Modular, 96% Efficiency'
      },
      // Rectifiers - Telecom Standard -48V
      { 
          id: `REC-${b.id}-01`.toUpperCase(), 
          type: 'Rectifier', 
          branch: b.name, 
          status: 'operational', 
          lastMaintenance: '2024-03-01', 
          nextMaintenance: '2024-09-01', 
          model: 'Huawei ETP4830-A1',
          specs: 'Output -48VDC, 30A Modules'
      },
      // Precision Cooling
      { 
          id: `CRAC-${b.id}-A`.toUpperCase(), 
          type: 'Cooling (CRAC)', 
          branch: b.name, 
          status: b.status === 'warning' ? 'warning' : 'operational', 
          lastMaintenance: '2024-05-01', 
          nextMaintenance: '2024-08-01', 
          model: 'Stulz CyberAir 3',
          specs: 'Chilled Water, Downflow'
      },
      // Batteries - Mix of VRLA and Li-ion
      { 
          id: `BAT-${b.id}-L1`.toUpperCase(), 
          type: 'Battery Bank', 
          branch: b.name, 
          status: 'operational', 
          lastMaintenance: '2024-01-20', 
          nextMaintenance: '2025-01-20', 
          model: 'Huawei ESM-48100A1',
          specs: 'Li-ion (LFP), 48V 100Ah'
      },
      { 
          id: `BAT-${b.id}-V1`.toUpperCase(), 
          type: 'Battery Bank', 
          branch: b.name, 
          status: b.status === 'critical' ? 'critical' : 'operational', 
          lastMaintenance: '2023-11-15', 
          nextMaintenance: '2024-05-15', 
          model: 'Narada 12V VRLA',
          specs: 'Lead-Acid, 12V 200Ah'
      },
      // Generators
      { 
          id: `GEN-${b.id}-01`.toUpperCase(), 
          type: 'Generator', 
          branch: b.name, 
          status: 'operational', 
          lastMaintenance: '2024-02-10', 
          nextMaintenance: '2024-08-10', 
          model: 'Cummins C2500D5',
          specs: '2.5MW, Diesel, N+1 Redundancy'
      },
    ]);
  }, [branches]);

  const filteredAssets = assets.filter(a => 
    a.id.toLowerCase().includes(filter.toLowerCase()) || 
    a.branch.toLowerCase().includes(filter.toLowerCase()) ||
    a.type.toLowerCase().includes(filter.toLowerCase()) ||
    a.model.toLowerCase().includes(filter.toLowerCase())
  );

  const mockHistorical = [220, 240, 210, 260, 280, 270, 310];
  const mockProjected = [320, 340, 330, 350, 380, 370, 390];

  const handleAssetAction = (e: React.MouseEvent, assetId: string, actionType: 'restart' | 'calibrate') => {
      e.stopPropagation();
      setProcessingAction(assetId);
      setTimeout(() => {
          setProcessingAction(null);
          setActionSuccess(assetId);
          setTimeout(() => setActionSuccess(null), 3000);
      }, 2000);
  };

  const submitMaintenance = (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmittingMaintenance(true);
      setTimeout(() => {
          setIsSubmittingMaintenance(false);
          setIsMaintenanceModalOpen(false);
          setMaintenanceDate('');
          setAssignedTech('');
      }, 1500);
  };

  const anomalies = [
      { site: 'บางรัก', type: 'Rectifier Load Imbalance', deviation: '+15%', root: 'Module 3 Failure', priority: 'High', rec: 'Replace module (Hot-swap)' },
      { site: 'นนทบุรี', type: 'Gen-Set Fuel Level', deviation: '-40%', root: 'Sensor Drift', priority: 'Medium', rec: 'Recalibrate fuel sensor' },
      { site: 'เชียงใหม่', type: 'VRLA High Temp', deviation: '+4°C', root: 'AC Failure Zone B', priority: 'Critical', rec: 'Check CRAC Unit B' },
  ];

  return (
    <div className="w-full h-full overflow-y-auto p-6 bg-slate-50 text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in-up">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
                { label: 'สตริงแบตเตอรี่', val: '12,450', sub: 'Active', icon: Battery, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'โหลด UPS รวม', val: '4.2 MW', sub: '62% Util', icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'แปลงกระแสไฟฟ้า DC', val: '99.8%', sub: 'Uptime', icon: Server, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'เชื้อเพลิงสำรอง', val: '72 ชม.', sub: 'Tier 3 Std', icon: Fuel, color: 'text-orange-600', bg: 'bg-orange-50' }
            ].map((kpi, i) => (
                <Card key={i} className="hover:border-slate-300 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg ${kpi.bg} ${kpi.color}`}>
                            <kpi.icon size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                            <p className="text-xl font-bold font-mono text-slate-800">{kpi.val} <span className="text-[10px] text-slate-400 font-sans font-normal ml-1">{kpi.sub}</span></p>
                        </div>
                    </div>
                </Card>
            ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
             <Card title="พยากรณ์การใช้พลังงาน (7 วัน)" className="overflow-hidden">
                <div className="h-64 mt-4 px-2">
                    <EnergyChart data={mockHistorical} projected={mockProjected} />
                </div>
                <div className="mt-4 flex items-center justify-between p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                    <div className="flex items-center gap-3">
                        <BrainCircuit className="text-indigo-600" size={18} />
                        <div>
                            <p className="text-xs font-bold text-indigo-900 uppercase">การเพิ่มประสิทธิภาพ AI (ISO 50001)</p>
                            <p className="text-xs text-indigo-700">คาดการณ์จุดสูงสุด: พฤหัส 14:00 น. แนะนำให้ทำความเย็นล่วงหน้าสำหรับบางรักและนนทบุรี</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setStrategyActive(!strategyActive)}
                        className={`px-3 py-1.5 rounded text-xs font-bold transition-all border ${strategyActive ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-indigo-600 border-indigo-200 hover:border-indigo-300'}`}
                    >
                        {strategyActive ? '✓ ใช้งานอยู่' : 'ใช้กลยุทธ์'}
                    </button>
                </div>
             </Card>

             <Card className="overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2">
                        <Server size={16} className="text-slate-400" /> ทะเบียนอุปกรณ์ (Equipment Registry)
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="กรอง ID, ประเภท, รุ่น..." 
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none w-56 transition-all"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    {filteredAssets.length > 0 ? (
                        <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider sticky top-0">
                            <tr>
                                <th className="px-6 py-3">รหัสทรัพย์สิน</th>
                                <th className="px-6 py-3">ประเภทและรุ่น</th>
                                <th className="px-6 py-3">สถานที่</th>
                                <th className="px-6 py-3">สถานะ</th>
                                <th className="px-6 py-3 text-right">การดำเนินการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredAssets.map((asset) => (
                                <tr key={asset.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setSelectedAsset(asset)}>
                                    <td className="px-6 py-3 font-mono font-medium text-slate-700">{asset.id}</td>
                                    <td className="px-6 py-3">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-700 flex items-center gap-2">
                                                {asset.type.includes('Battery') && <Battery size={10} className="text-green-500"/>}
                                                {asset.type.includes('UPS') && <Zap size={10} className="text-blue-500"/>}
                                                {asset.type.includes('Cooling') && <Fan size={10} className="text-cyan-500"/>}
                                                {asset.type.includes('Generator') && <Fuel size={10} className="text-orange-500"/>}
                                                {asset.type}
                                            </span>
                                            <span className="text-[10px] text-slate-500">{asset.model}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-slate-500">{asset.branch}</td>
                                    <td className="px-6 py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                                        asset.status === 'operational' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                        asset.status === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                        'bg-red-50 text-red-700 border-red-100'
                                    }`}>
                                        {asset.status === 'operational' ? 'ปกติ' : asset.status}
                                    </span>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {actionSuccess === asset.id ? (
                                                <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded">
                                                    <Check size={12} /> เสร็จสิ้น
                                                </span>
                                            ) : processingAction === asset.id ? (
                                                <span className="flex items-center gap-1 text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded">
                                                    <Loader2 size={12} className="animate-spin" />
                                                </span>
                                            ) : (
                                                <button 
                                                    onClick={(e) => handleAssetAction(e, asset.id, asset.type.includes('UPS') ? 'restart' : 'calibrate')}
                                                    className="px-2 py-1 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded text-[10px] font-bold text-slate-600 flex items-center gap-1 shadow-sm"
                                                >
                                                    {asset.type.includes('UPS') ? <Power size={10} /> : <RefreshCw size={10} />}
                                                    {asset.type.includes('UPS') ? 'รีสตาร์ท' : 'สอบเทียบ'}
                                                </button>
                                            )}
                                            <button className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-800">
                                                <Eye size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        </table>
                    ) : (
                        <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                            <XCircle size={32} className="mb-2 opacity-20" />
                            <p className="text-xs font-mono">ไม่พบทรัพย์สิน</p>
                        </div>
                    )}
                </div>
             </Card>
          </div>

          <div className="space-y-6">
             <Card title="ความผิดปกติของระบบ (Anomalies)" className="border-t-4 border-t-red-500">
                <div className="divide-y divide-slate-100">
                   {anomalies.map((item, idx) => (
                      <div key={idx} className="p-4 hover:bg-red-50/10 transition-colors">
                         <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.site}</span>
                            <span className="text-[10px] font-mono text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">{item.deviation}</span>
                         </div>
                         <h4 className="text-sm font-bold text-slate-800 mb-1">{item.type}</h4>
                         <p className="text-xs text-slate-500">สาเหตุ: {item.root}</p>
                      </div>
                   ))}
                </div>
                <div className="p-3 border-t border-slate-100 bg-slate-50">
                    <button 
                        onClick={() => setShowFullDiagnosis(true)}
                        className="w-full py-2 border border-slate-200 bg-white rounded text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
                    >
                    ดูการวินิจฉัยทั้งหมด
                    </button>
                </div>
             </Card>

             <Card title="การกระจายโหลด (Load Distribution)">
                <div className="space-y-5 p-2">
                    {[
                        { label: 'อุปกรณ์ไอที', val: 55.4, color: 'bg-blue-600' },
                        { label: 'ระบบทำความเย็น', val: 32.1, color: 'bg-cyan-500' },
                        { label: 'การสูญเสียทางไฟฟ้า', val: 5.2, color: 'bg-amber-400' },
                        { label: 'แสงสว่างและอื่นๆ', val: 7.3, color: 'bg-slate-400' },
                    ].map((item, idx) => (
                        <div key={idx}>
                            <div className="flex justify-between text-[10px] font-bold mb-1.5">
                                <span className="text-slate-500 uppercase tracking-wide">{item.label}</span>
                                <span className="text-slate-800 font-mono">{item.val}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className={`h-full ${item.color}`} style={{ width: `${item.val}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>
             </Card>

             <div className="bg-indigo-600 rounded-lg p-5 text-white shadow-lg shadow-indigo-200">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-500 rounded-lg"><BrainCircuit size={18} /></div>
                    <div>
                        <h3 className="font-bold text-sm mb-1">การบำรุงรักษาเชิงพยากรณ์</h3>
                        <p className="text-xs text-indigo-100 leading-relaxed mb-4">
                            การวิเคราะห์ SCADA ระบุว่าแบตเตอรี่สตาร์ทของ <strong>เครื่องกำเนิดไฟฟ้า #2 (นนทบุรี)</strong> มีค่าความต้านทานสูงขึ้น กำหนดการเปลี่ยนก่อนรอบการทำงานถัดไป
                        </p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsMaintenanceModalOpen(true)}
                    className="w-full py-2 bg-white text-indigo-700 hover:bg-indigo-50 rounded text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                    <Wrench size={14} /> นัดหมายบริการ
                </button>
             </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={!!selectedAsset} onClose={() => setSelectedAsset(null)} title={
          <div className="flex items-center gap-2">
              <Server className="text-slate-400" size={18} />
              <span className="font-mono text-base">{selectedAsset?.id}</span>
          </div>
      }>
            {selectedAsset && (
                <div className="p-6 space-y-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">{selectedAsset.type}</h2>
                            <p className="text-sm text-slate-500 font-mono mt-1">รุ่น: {selectedAsset.model}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{selectedAsset.specs}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase border ${
                            selectedAsset.status === 'operational' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            selectedAsset.status === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                            'bg-red-50 text-red-700 border-red-100'
                        }`}>
                            {selectedAsset.status.toUpperCase()}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div className="p-4 bg-slate-50 rounded border border-slate-200">
                             <div className="flex items-center gap-2 text-slate-500 mb-2">
                                 <Wrench size={14} /> <span className="text-[10px] font-bold uppercase">บริการล่าสุด</span>
                             </div>
                             <p className="text-base font-mono font-bold text-slate-800">{selectedAsset.lastMaintenance}</p>
                         </div>
                         <div className="p-4 bg-slate-50 rounded border border-slate-200">
                             <div className="flex items-center gap-2 text-slate-500 mb-2">
                                 <Clock size={14} /> <span className="text-[10px] font-bold uppercase">ครบกำหนดถัดไป</span>
                             </div>
                             <p className="text-base font-mono font-bold text-blue-600">{selectedAsset.nextMaintenance}</p>
                         </div>
                    </div>
                </div>
            )}
      </Modal>

      <Modal isOpen={isMaintenanceModalOpen} onClose={() => setIsMaintenanceModalOpen(false)} title="นัดหมายการบำรุงรักษา">
          <div className="p-6">
              <form onSubmit={submitMaintenance} className="space-y-5">
                  <div className="bg-indigo-50 p-3 rounded border border-indigo-100 flex gap-3">
                      <BrainCircuit className="text-indigo-600 shrink-0 mt-0.5" size={16} />
                      <p className="text-xs text-indigo-800 leading-relaxed">
                          คำแนะนำ AI: ควรนัดหมายระหว่าง <strong>12-15 พ.ค.</strong> เพื่อผลกระทบต่อโหลดน้อยที่สุด (-15%)
                      </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">วันที่</label>
                          <input 
                              type="date" 
                              required
                              value={maintenanceDate}
                              onChange={(e) => setMaintenanceDate(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" 
                          />
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">ช่างเทคนิค</label>
                          <select 
                              required
                              value={assignedTech}
                              onChange={(e) => setAssignedTech(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                          >
                              <option value="">เลือกช่างเทคนิค...</option>
                              <option value="T01">สมชาย จ. (อาวุโส)</option>
                              <option value="T02">วิชัย ร. (ผู้เชี่ยวชาญ)</option>
                          </select>
                      </div>
                  </div>
                  <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">หมายเหตุ</label>
                      <textarea className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm h-20 resize-none focus:ring-1 focus:ring-blue-500 outline-none" placeholder="อะไหล่ที่ต้องใช้ หรือคำสั่งพิเศษ..." />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setIsMaintenanceModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded text-xs font-bold">ยกเลิก</button>
                      <button type="submit" disabled={isSubmittingMaintenance} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold flex items-center gap-2">
                          {isSubmittingMaintenance ? <Loader2 size={12} className="animate-spin" /> : 'ยืนยันนัดหมาย'}
                      </button>
                  </div>
              </form>
          </div>
      </Modal>

      <Modal isOpen={showFullDiagnosis} onClose={() => setShowFullDiagnosis(false)} title="บันทึกการวินิจฉัยเต็มรูปแบบ">
          <div className="p-0">
              <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                          <th className="px-6 py-3 font-bold text-slate-500 uppercase">สถานที่</th>
                          <th className="px-6 py-3 font-bold text-slate-500 uppercase">ปัญหา</th>
                          <th className="px-6 py-3 font-bold text-slate-500 uppercase">ความสำคัญ</th>
                          <th className="px-6 py-3 font-bold text-slate-500 uppercase">คำแนะนำ</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {anomalies.map((item, idx) => (
                          <tr key={idx}>
                              <td className="px-6 py-3 font-bold text-slate-700">{item.site}</td>
                              <td className="px-6 py-3 text-red-600 font-medium">{item.type} <span className="text-slate-400 text-[10px] ml-1">({item.deviation})</span></td>
                              <td className="px-6 py-3">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      item.priority === 'High' ? 'bg-red-50 text-red-700' :
                                      item.priority === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                                  }`}>
                                      {item.priority}
                                  </span>
                              </td>
                              <td className="px-6 py-3 text-slate-500 font-mono">{item.rec}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </Modal>
    </div>
  );
};
