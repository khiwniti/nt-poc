
import React, { useState, useMemo, useEffect } from 'react';
import { WorkOrder, WorkOrderPriority, WorkOrderStatus } from '../../types';
import { Card } from '../ui/Card';
import { Search, Filter, Plus, Wrench, Clock, CheckCircle2, AlertTriangle, MoreHorizontal, Calendar, User, Hammer, AlertCircle, X, ChevronRight, ClipboardCheck, LayoutGrid, List as ListIcon, GripVertical, TrendingUp, DollarSign, Activity, BarChart3 } from 'lucide-react';
import { db } from '../../services/database';

const PriorityBadge: React.FC<{ priority: WorkOrderPriority }> = ({ priority }) => {
    const colors = {
        Critical: 'bg-red-100 text-red-700 border-red-200',
        High: 'bg-orange-100 text-orange-700 border-orange-200',
        Medium: 'bg-blue-50 text-blue-700 border-blue-200',
        Low: 'bg-slate-100 text-slate-600 border-slate-200'
    };
    const labels = {
        Critical: 'วิกฤต',
        High: 'สูง',
        Medium: 'ปานกลาง',
        Low: 'ต่ำ'
    };
    const icon = priority === 'Critical' ? <AlertCircle size={12} /> : null;
    return (
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${colors[priority]}`}>
            {icon} {labels[priority]}
        </span>
    );
};

const StatusBadge: React.FC<{ status: WorkOrderStatus }> = ({ status }) => {
    const colors = {
        Open: 'bg-blue-500 text-white',
        In_Progress: 'bg-amber-500 text-white',
        On_Hold: 'bg-slate-500 text-white',
        Completed: 'bg-emerald-500 text-white'
    };
    const labels = {
        Open: 'เปิดงาน',
        In_Progress: 'กำลังดำเนินการ',
        On_Hold: 'พักงาน',
        Completed: 'เสร็จสิ้น'
    };
    return (
        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm ${colors[status]}`}>
            {labels[status]}
        </span>
    );
};

const KANBAN_COLUMNS: { id: WorkOrderStatus; label: string; color: string }[] = [
    { id: 'Open', label: 'งานใหม่ / เปิดอยู่', color: 'border-blue-500' },
    { id: 'In_Progress', label: 'กำลังดำเนินการ', color: 'border-amber-500' },
    { id: 'On_Hold', label: 'พักงาน / รออะไหล่', color: 'border-slate-500' },
    { id: 'Completed', label: 'เสร็จสิ้น', color: 'border-emerald-500' }
];

export const WorkOrderManager: React.FC = () => {
    const [tickets, setTickets] = useState<WorkOrder[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | 'All'>('All');
    const [selectedTicket, setSelectedTicket] = useState<WorkOrder | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
    const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

    useEffect(() => {
        db.getWorkOrders().then(setTickets).catch(console.error);
    }, []);

    const filteredTickets = useMemo(() => {
        return tickets.filter(ticket => {
            const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  ticket.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  ticket.branchId.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'All' || ticket.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [searchTerm, statusFilter, tickets]);

    // KPI Metrics Calculation (Dynamic)
    const stats = useMemo(() => {
        const total = tickets.length;
        const active = tickets.filter(t => ['Open', 'In_Progress'].includes(t.status)).length;
        const critical = tickets.filter(t => t.priority === 'Critical' && t.status !== 'Completed').length;
        const completed = tickets.filter(t => t.status === 'Completed').length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        const totalCost = tickets.reduce((acc, t) => acc + (t.estimatedCost || 0), 0);
        
        return { active, critical, completionRate, totalCost };
    }, [tickets]);

    // Kanban Handlers
    const onDragStart = (e: React.DragEvent, id: string) => {
        setDraggedTicketId(id);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", id);
    };

    const onDragOver = (e: React.DragEvent, columnId: string) => {
        e.preventDefault(); // Necessary to allow dropping
        if (dragOverColumn !== columnId) {
            setDragOverColumn(columnId);
        }
    };

    const onDragLeave = () => {
        setDragOverColumn(null);
    }

    const onDrop = (e: React.DragEvent, status: WorkOrderStatus) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/plain");

        if (id) {
            db.updateWorkOrder(id, { status }).then(() => {
              return db.getWorkOrders();
            }).then(setTickets).catch(console.error);
        }
        setDraggedTicketId(null);
        setDragOverColumn(null);
    };

    return (
        <div className="w-full h-full flex overflow-hidden bg-slate-50">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="p-8 pb-4 flex-shrink-0">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                                <Wrench className="text-slate-400" /> การบริหารจัดการซ่อมบำรุง
                            </h1>
                            <p className="text-sm text-slate-500 mt-1 font-mono">/ops/work-orders</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="bg-white p-1 rounded-lg border border-slate-200 flex items-center shadow-sm">
                                <button 
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    title="มุมมองรายการ"
                                >
                                    <ListIcon size={18} />
                                </button>
                                <button 
                                    onClick={() => setViewMode('board')}
                                    className={`p-2 rounded-md transition-all ${viewMode === 'board' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    title="บอร์ดคัมบัง"
                                >
                                    <LayoutGrid size={18} />
                                </button>
                            </div>
                            <button className="bg-nt-dark text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-md">
                                <Plus size={16} /> สร้างใบงาน
                            </button>
                        </div>
                    </div>

                    {/* Enhanced KPI Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <Card className="p-4 relative overflow-hidden bg-white border-slate-200 group hover:border-blue-300 transition-all">
                            <div className="flex justify-between items-start z-10 relative">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ใบงานที่กำลังทำ</p>
                                    <p className="text-2xl font-black text-slate-800">{stats.active}</p>
                                </div>
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <ClipboardCheck size={20} />
                                </div>
                            </div>
                            <div className="mt-3 flex items-center gap-2 text-[10px]">
                                <span className="text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Activity size={10} /> +2 ใหม่
                                </span>
                                <span className="text-slate-400">จากเมื่อวาน</span>
                            </div>
                        </Card>

                        <Card className={`p-4 relative overflow-hidden bg-white border-slate-200 group hover:border-red-300 transition-all ${stats.critical > 0 ? 'border-red-200 bg-red-50/10' : ''}`}>
                            <div className="flex justify-between items-start z-10 relative">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ปัญหาวิกฤต</p>
                                    <p className={`text-2xl font-black ${stats.critical > 0 ? 'text-red-600' : 'text-slate-800'}`}>{stats.critical}</p>
                                </div>
                                <div className={`p-2 rounded-lg transition-colors ${stats.critical > 0 ? 'bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white' : 'bg-slate-50 text-slate-400'}`}>
                                    <AlertTriangle size={20} />
                                </div>
                            </div>
                            <div className="mt-3 flex items-center gap-2 text-[10px]">
                                <span className={`${stats.critical > 0 ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'} font-bold px-1.5 py-0.5 rounded flex items-center gap-1`}>
                                    {stats.critical > 0 ? <TrendingUp size={10} /> : <CheckCircle2 size={10} />}
                                    {stats.critical > 0 ? 'ต้องแก้ไขทันที' : 'ปกติ'}
                                </span>
                            </div>
                        </Card>

                        <Card className="p-4 relative overflow-hidden bg-white border-slate-200 group hover:border-emerald-300 transition-all">
                            <div className="flex justify-between items-start z-10 relative">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">อัตรางานเสร็จสิ้น</p>
                                    <p className="text-2xl font-black text-slate-800">{stats.completionRate}%</p>
                                </div>
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                    <BarChart3 size={20} />
                                </div>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-4">
                                <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${stats.completionRate}%` }}></div>
                            </div>
                        </Card>

                        <Card className="p-4 relative overflow-hidden bg-white border-slate-200 group hover:border-indigo-300 transition-all">
                            <div className="flex justify-between items-start z-10 relative">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ค่าใช้จ่ายสะสม</p>
                                    <p className="text-2xl font-black text-slate-800 font-mono">฿{stats.totalCost.toLocaleString()}</p>
                                </div>
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <DollarSign size={20} />
                                </div>
                            </div>
                            <div className="mt-3 flex items-center gap-2 text-[10px]">
                                <span className="text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
                                    พ.ค. 2568
                                </span>
                                <span className="text-slate-400">งบประมาณ: ฿150k</span>
                            </div>
                        </Card>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text"
                                    placeholder="ค้นหาใบงาน..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none w-64 transition-all"
                                />
                            </div>
                            
                            {viewMode === 'list' && (
                                <>
                                    <div className="h-6 w-px bg-slate-200"></div>
                                    <div className="flex gap-2">
                                        {['All', 'Open', 'In_Progress', 'Completed'].map(status => (
                                            <button 
                                                key={status}
                                                onClick={() => setStatusFilter(status as any)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === status ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                                            >
                                                {status === 'All' ? 'ทั้งหมด' : status === 'Open' ? 'เปิดงาน' : status === 'In_Progress' ? 'กำลังทำ' : 'เสร็จสิ้น'}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                        <button className="text-slate-500 hover:bg-slate-50 p-2 rounded-lg transition-colors">
                            <Filter size={18} />
                        </button>
                    </div>
                </div>

                {/* VIEW MODE: BOARD (KANBAN) */}
                {viewMode === 'board' && (
                    <div className="flex-1 overflow-x-auto overflow-y-hidden px-8 pb-8">
                        <div className="flex h-full gap-6 min-w-max">
                            {KANBAN_COLUMNS.map(column => {
                                const columnTickets = filteredTickets.filter(t => t.status === column.id);
                                const isDragOver = dragOverColumn === column.id;
                                
                                return (
                                    <div 
                                        key={column.id} 
                                        className={`
                                            w-[320px] flex flex-col h-full rounded-2xl bg-slate-100/80 border 
                                            transition-all duration-200
                                            ${isDragOver ? 'border-blue-400 bg-blue-50/50 shadow-md scale-[1.01]' : 'border-slate-200'}
                                        `}
                                        onDragOver={(e) => onDragOver(e, column.id)}
                                        onDragLeave={onDragLeave}
                                        onDrop={(e) => onDrop(e, column.id)}
                                    >
                                        {/* Column Header */}
                                        <div className={`p-4 border-b border-slate-200 flex justify-between items-center bg-white/50 backdrop-blur-sm rounded-t-2xl ${column.id === 'Open' ? 'border-t-4 border-t-blue-500' : column.id === 'In_Progress' ? 'border-t-4 border-t-amber-500' : column.id === 'Completed' ? 'border-t-4 border-t-emerald-500' : 'border-t-4 border-t-slate-500'}`}>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-slate-700 text-sm">{column.label}</h3>
                                                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">{columnTickets.length}</span>
                                            </div>
                                            <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal size={16} /></button>
                                        </div>

                                        {/* Column Body */}
                                        <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
                                            {columnTickets.map(ticket => (
                                                <div 
                                                    key={ticket.id}
                                                    draggable
                                                    onDragStart={(e) => onDragStart(e, ticket.id)}
                                                    onClick={() => setSelectedTicket(ticket)}
                                                    className={`
                                                        bg-white p-4 rounded-xl shadow-sm border border-slate-100 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group relative
                                                        ${draggedTicketId === ticket.id ? 'opacity-50 rotate-3' : 'opacity-100'}
                                                    `}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-[10px] font-mono text-slate-400">{ticket.id}</span>
                                                        <PriorityBadge priority={ticket.priority} />
                                                    </div>
                                                    <h4 className="text-sm font-bold text-slate-800 mb-2 leading-tight">{ticket.title}</h4>
                                                    
                                                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                                                        <User size={12} />
                                                        <span>{ticket.assignedTo}</span>
                                                    </div>

                                                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded">{ticket.branchId}</span>
                                                        </div>
                                                        <div className={`text-[10px] font-bold flex items-center gap-1 ${
                                                            new Date(ticket.dueDate) < new Date() && ticket.status !== 'Completed' ? 'text-red-500' : 'text-slate-400'
                                                        }`}>
                                                            <Clock size={12} />
                                                            {new Date(ticket.dueDate).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Drag Handle Visual */}
                                                    <div className="absolute top-1/2 left-1 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-slate-300">
                                                        <GripVertical size={16} />
                                                    </div>
                                                </div>
                                            ))}
                                            {columnTickets.length === 0 && (
                                                <div className="h-24 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-xs">
                                                    ลากรายการมาวางที่นี่
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* VIEW MODE: LIST (TABLE) */}
                {viewMode === 'list' && (
                    <div className="flex-1 overflow-auto px-8 pb-8">
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">รหัสใบงาน</th>
                                        <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">หัวข้อ</th>
                                        <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">ความสำคัญ</th>
                                        <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">ผู้รับผิดชอบ</th>
                                        <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">กำหนดส่ง</th>
                                        <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">สถานะ</th>
                                        <th className="px-6 py-4 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredTickets.map((ticket) => (
                                        <tr 
                                            key={ticket.id}
                                            onClick={() => setSelectedTicket(ticket)}
                                            className={`cursor-pointer transition-colors ${selectedTicket?.id === ticket.id ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                                        >
                                            <td className="px-6 py-4 font-mono font-medium text-slate-600">{ticket.id}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800">{ticket.title}</div>
                                                <div className="text-[10px] text-slate-500">{ticket.branchId} • {ticket.type}</div>
                                            </td>
                                            <td className="px-6 py-4"><PriorityBadge priority={ticket.priority} /></td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                                        {ticket.assignedTo.charAt(0)}
                                                    </div>
                                                    <span className="text-slate-700 text-xs">{ticket.assignedTo}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-xs">
                                                {ticket.dueDate.toLocaleDateString('th-TH')}
                                            </td>
                                            <td className="px-6 py-4"><StatusBadge status={ticket.status} /></td>
                                            <td className="px-6 py-4 text-right text-slate-400">
                                                <ChevronRight size={16} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Slide-over */}
            <div className={`w-96 border-l border-slate-200 bg-white h-full transition-transform duration-300 transform ${selectedTicket ? 'translate-x-0' : 'translate-x-full'} absolute right-0 top-0 shadow-2xl z-20 flex flex-col`}>
                {selectedTicket && (
                    <>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-mono text-xs text-slate-500">{selectedTicket.id}</span>
                                    <PriorityBadge priority={selectedTicket.priority} />
                                </div>
                                <h2 className="text-lg font-bold text-slate-900 leading-tight">{selectedTicket.title}</h2>
                            </div>
                            <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-slate-800 p-1 rounded-full hover:bg-slate-100">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Status Bar */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">สถานะปัจจุบัน</span>
                                <div className="flex justify-between items-center">
                                    <StatusBadge status={selectedTicket.status} />
                                    <span className="text-xs font-mono text-slate-500">ครบกำหนด: {selectedTicket.dueDate.toLocaleDateString('th-TH')}</span>
                                </div>
                            </div>

                            {/* Details */}
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Hammer size={14} /> รายละเอียด
                                </h3>
                                <p className="text-sm text-slate-600 leading-relaxed bg-white border border-slate-100 p-3 rounded-lg">
                                    {selectedTicket.description}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Asset ID</label>
                                    <p className="text-sm font-bold text-blue-600 font-mono mt-1">{selectedTicket.assetId || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">สาขา</label>
                                    <p className="text-sm font-bold text-slate-800 mt-1">{selectedTicket.branchId}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">ค่าใช้จ่ายประเมิน</label>
                                    <p className="text-sm font-bold text-slate-800 mt-1">฿{selectedTicket.estimatedCost.toLocaleString()}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">ผู้รายงาน</label>
                                    <p className="text-sm font-bold text-slate-800 mt-1">{selectedTicket.reportedBy}</p>
                                </div>
                            </div>

                            {/* Checklist */}
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <ClipboardCheck size={14} /> รายการตรวจสอบ
                                </h3>
                                <div className="space-y-2">
                                    {selectedTicket.checklist.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-2 border border-slate-100 rounded bg-white">
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${item.completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'}`}>
                                                {item.completed && <CheckCircle2 size={10} />}
                                            </div>
                                            <span className={`text-sm ${item.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item.item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                             {/* Technician */}
                             <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold">
                                    {selectedTicket.assignedTo.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-indigo-400 uppercase">ช่างเทคนิคผู้รับผิดชอบ</p>
                                    <p className="font-bold text-indigo-900">{selectedTicket.assignedTo}</p>
                                </div>
                             </div>
                        </div>

                        {/* Actions */}
                        <div className="p-4 border-t border-slate-200 bg-white space-y-2">
                            <button className="w-full py-2 bg-nt-dark text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors">
                                อัปเดตสถานะ
                            </button>
                            <button className="w-full py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors">
                                เพิ่มบันทึก
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
