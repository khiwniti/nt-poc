
import React, { useState, useMemo } from 'react';
import { LeaseContract, LeaseStatus } from '../../types';
import { Card } from '../ui/Card';
import { Search, Filter, Plus, FileText, Calendar, DollarSign, Users, MoreHorizontal, ChevronRight, Download, CheckCircle2, AlertTriangle, X, Building2, Phone, Briefcase, LayoutGrid, List as ListIcon, GripVertical, Clock, TrendingUp } from 'lucide-react';

// Mock Data
const INITIAL_LEASES: LeaseContract[] = [
    {
        id: 'L-2024-001',
        tenantName: 'AIS Shop Experience',
        branchId: 'Bangrak',
        unitNumber: 'G-01',
        areaSqm: 120,
        startDate: '2023-01-01',
        endDate: '2026-01-01',
        monthlyRent: 85000,
        status: 'Active',
        contactPerson: 'K. Somchai',
        contactPhone: '081-234-5678',
        depositAmount: 255000,
        documents: [{ name: 'Lease_Agreement_Signed.pdf', date: '2023-01-01', type: 'Contract' }]
    },
    {
        id: 'L-2024-002',
        tenantName: 'Coffee World',
        branchId: 'Nonthaburi',
        unitNumber: 'L1-05',
        areaSqm: 45,
        startDate: '2023-03-15',
        endDate: '2024-03-15',
        monthlyRent: 35000,
        status: 'Expiring',
        contactPerson: 'K. Wirat',
        contactPhone: '089-987-6543',
        depositAmount: 105000,
        documents: [{ name: 'Renewal_Notice.pdf', date: '2024-01-15', type: 'Notice' }]
    },
    {
        id: 'L-2023-089',
        tenantName: 'Government Saving Bank',
        branchId: 'Chiang Mai',
        unitNumber: 'B-02',
        areaSqm: 200,
        startDate: '2020-05-01',
        endDate: '2025-05-01',
        monthlyRent: 150000,
        status: 'Active',
        contactPerson: 'Manager Nipa',
        contactPhone: '053-112-233',
        depositAmount: 450000,
        documents: []
    },
    {
        id: 'L-2022-012',
        tenantName: 'Cyber Safe Solutions',
        branchId: 'Bangrak',
        unitNumber: 'F4-12',
        areaSqm: 80,
        startDate: '2022-06-01',
        endDate: '2023-06-01',
        monthlyRent: 60000,
        status: 'Expired',
        contactPerson: 'John Doe',
        contactPhone: '02-123-4567',
        depositAmount: 180000,
        documents: [{ name: 'Termination_Letter.pdf', date: '2023-06-01', type: 'Legal' }]
    },
    {
        id: 'L-2024-005',
        tenantName: 'Kerry Express',
        branchId: 'Phuket',
        unitNumber: 'G-03',
        areaSqm: 30,
        startDate: '2024-01-01',
        endDate: '2025-01-01',
        monthlyRent: 25000,
        status: 'Active',
        contactPerson: 'K. Chai',
        contactPhone: '076-123-456',
        depositAmount: 75000,
        documents: []
    },
    {
        id: 'L-2024-008',
        tenantName: '7-Eleven',
        branchId: 'Khon Kaen',
        unitNumber: 'G-Corner',
        areaSqm: 90,
        startDate: '2023-08-01',
        endDate: '2028-08-01',
        monthlyRent: 72000,
        status: 'Active',
        contactPerson: 'Area Mgr. Suda',
        contactPhone: '043-998-877',
        depositAmount: 216000,
        documents: []
    },
    {
        id: 'L-2024-099',
        tenantName: 'StartUp Hub Co.',
        branchId: 'Sriracha',
        unitNumber: 'F2-10',
        areaSqm: 150,
        startDate: '2024-06-01',
        endDate: '2025-06-01',
        monthlyRent: 55000,
        status: 'Pending',
        contactPerson: 'CEO Mark',
        contactPhone: '090-999-8888',
        depositAmount: 165000,
        documents: []
    }
];

const LIFECYCLE_COLUMNS: { id: LeaseStatus; label: string; color: string }[] = [
    { id: 'Pending', label: 'Draft / Negotiation', color: 'border-blue-500' },
    { id: 'Active', label: 'Active Leases', color: 'border-emerald-500' },
    { id: 'Expiring', label: 'Renewal / Expiring', color: 'border-amber-500' },
    { id: 'Expired', label: 'Terminated / Closed', color: 'border-slate-500' }
];

const StatusBadge: React.FC<{ status: LeaseStatus }> = ({ status }) => {
    const styles = {
        Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        Expiring: 'bg-amber-50 text-amber-700 border-amber-200',
        Expired: 'bg-slate-100 text-slate-500 border-slate-200',
        Pending: 'bg-blue-50 text-blue-700 border-blue-200',
    };
    const icons = {
        Active: <CheckCircle2 size={10} />,
        Expiring: <AlertTriangle size={10} />,
        Expired: <X size={10} />,
        Pending: <FileText size={10} />,
    };
    
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${styles[status]}`}>
            {icons[status]}
            {status}
        </span>
    );
};

const TimelineBar: React.FC<{ start: string; end: string }> = ({ start, end }) => {
    const now = new Date().getTime();
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const total = e - s;
    const elapsed = now - s;
    const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
    
    const isExpiringSoon = (e - now) < (90 * 24 * 60 * 60 * 1000) && (e - now) > 0;

    return (
        <div className="w-full">
            <div className="flex justify-between text-[9px] text-slate-400 font-mono mb-1">
                <span>{new Date(start).toLocaleDateString(undefined, {month:'short', year:'2-digit'})}</span>
                <span className={isExpiringSoon ? 'text-amber-600 font-bold' : ''}>{new Date(end).toLocaleDateString(undefined, {month:'short', year:'2-digit'})}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                    className={`h-full rounded-full transition-all duration-1000 ${isExpiringSoon ? 'bg-amber-500' : progress >= 100 ? 'bg-slate-400' : 'bg-blue-500'}`} 
                    style={{ width: `${progress}%` }} 
                />
            </div>
        </div>
    );
};

export const LeaseManager: React.FC = () => {
    const [leases, setLeases] = useState<LeaseContract[]>(INITIAL_LEASES);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLease, setSelectedLease] = useState<LeaseContract | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'board'>('board');
    const [statusFilter, setStatusFilter] = useState<LeaseStatus | 'All'>('All');
    
    // Drag & Drop State
    const [draggedLeaseId, setDraggedLeaseId] = useState<string | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

    const filteredLeases = useMemo(() => {
        return leases.filter(lease => {
            const matchesSearch = lease.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  lease.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  lease.branchId.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'All' || lease.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [searchTerm, statusFilter, leases]);

    // KPI Calculations
    const totalRevenue = leases.filter(l => l.status === 'Active').reduce((acc, curr) => acc + curr.monthlyRent, 0);
    const activeContracts = leases.filter(l => l.status === 'Active').length;
    const occupancyRate = 88.5; // Mocked
    const expiringCount = leases.filter(l => l.status === 'Expiring').length;

    // Handlers
    const onDragStart = (e: React.DragEvent, id: string) => {
        setDraggedLeaseId(id);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", id);
    };

    const onDragOver = (e: React.DragEvent, columnId: string) => {
        e.preventDefault();
        if (dragOverColumn !== columnId) setDragOverColumn(columnId);
    };

    const onDrop = (e: React.DragEvent, status: LeaseStatus) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/plain");
        if (id) {
            setLeases(prev => prev.map(l => l.id === id ? { ...l, status } : l));
        }
        setDraggedLeaseId(null);
        setDragOverColumn(null);
    };

    return (
        <div className="w-full h-full flex overflow-hidden bg-slate-50">
            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Header & Stats */}
                <div className="p-8 pb-4 flex-shrink-0">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                                <Briefcase className="text-slate-400" /> Commercial Asset Management
                            </h1>
                            <p className="text-sm text-slate-500 mt-1 font-mono">/commercial/contracts-lifecycle</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="bg-white p-1 rounded-lg border border-slate-200 flex items-center shadow-sm">
                                <button 
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    title="List View"
                                >
                                    <ListIcon size={18} />
                                </button>
                                <button 
                                    onClick={() => setViewMode('board')}
                                    className={`p-2 rounded-md transition-all ${viewMode === 'board' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    title="Kanban Board"
                                >
                                    <LayoutGrid size={18} />
                                </button>
                            </div>
                            <button className="bg-nt-dark text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-md">
                                <Plus size={16} /> New Contract
                            </button>
                        </div>
                    </div>

                    {/* KPI Metrics - Matching WorkOrderManager Style */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <Card className="p-4 relative overflow-hidden bg-white border-slate-200 group hover:border-blue-300 transition-all">
                            <div className="flex justify-between items-start z-10 relative">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Monthly Recurring (ARR)</p>
                                    <p className="text-2xl font-black text-slate-800 font-mono">฿{(totalRevenue/1000).toFixed(1)}k</p>
                                </div>
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors"><DollarSign size={20} /></div>
                            </div>
                            <div className="mt-3 flex items-center gap-2 text-[10px]">
                                <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <TrendingUp size={10} /> +5.2%
                                </span>
                                <span className="text-slate-400">vs last month</span>
                            </div>
                        </Card>

                        <Card className={`p-4 relative overflow-hidden bg-white border-slate-200 group hover:border-amber-300 transition-all ${expiringCount > 0 ? 'border-amber-200 bg-amber-50/20' : ''}`}>
                            <div className="flex justify-between items-start z-10 relative">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Expiring Soon</p>
                                    <p className={`text-2xl font-black ${expiringCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>{expiringCount}</p>
                                </div>
                                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors"><Clock size={20} /></div>
                            </div>
                            <div className="mt-3 flex items-center gap-2 text-[10px]">
                                <span className="text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded">Action Required</span>
                            </div>
                        </Card>

                        <Card className="p-4 relative overflow-hidden bg-white border-slate-200 group hover:border-emerald-300 transition-all">
                            <div className="flex justify-between items-start z-10 relative">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Tenants</p>
                                    <p className="text-2xl font-black text-slate-800">{activeContracts}</p>
                                </div>
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors"><Users size={20} /></div>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-4">
                                <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${(activeContracts/leases.length)*100}%` }}></div>
                            </div>
                        </Card>

                        <Card className="p-4 relative overflow-hidden bg-white border-slate-200 group hover:border-indigo-300 transition-all">
                            <div className="flex justify-between items-start z-10 relative">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Occupancy Rate</p>
                                    <p className="text-2xl font-black text-slate-800">{occupancyRate}%</p>
                                </div>
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors"><Building2 size={20} /></div>
                            </div>
                            <div className="mt-3 flex items-center gap-2 text-[10px]">
                                <span className="text-slate-400">Target: 90%</span>
                            </div>
                        </Card>
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text"
                                    placeholder="Search tenants..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none w-64 transition-all"
                                />
                            </div>
                            
                            {viewMode === 'list' && (
                                <>
                                    <div className="h-6 w-px bg-slate-200"></div>
                                    <div className="flex gap-2">
                                        {['All', 'Active', 'Expiring', 'Expired'].map(status => (
                                            <button 
                                                key={status}
                                                onClick={() => setStatusFilter(status as any)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === status ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                                            >
                                                {status}
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

                {/* BOARD MODE (Lifecycle Kanban) */}
                {viewMode === 'board' && (
                    <div className="flex-1 overflow-x-auto overflow-y-hidden px-8 pb-8">
                        <div className="flex h-full gap-6 min-w-max">
                            {LIFECYCLE_COLUMNS.map(column => {
                                const columnLeases = filteredLeases.filter(l => l.status === column.id);
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
                                        onDragLeave={() => setDragOverColumn(null)}
                                        onDrop={(e) => onDrop(e, column.id)}
                                    >
                                        {/* Header */}
                                        <div className={`p-4 border-b border-slate-200 flex justify-between items-center bg-white/50 backdrop-blur-sm rounded-t-2xl border-t-4 ${
                                            column.id === 'Active' ? 'border-t-emerald-500' :
                                            column.id === 'Expiring' ? 'border-t-amber-500' :
                                            column.id === 'Expired' ? 'border-t-slate-500' : 'border-t-blue-500'
                                        }`}>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-slate-700 text-sm">{column.label}</h3>
                                                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">{columnLeases.length}</span>
                                            </div>
                                            <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal size={16} /></button>
                                        </div>

                                        {/* Body */}
                                        <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
                                            {columnLeases.map(lease => (
                                                <div 
                                                    key={lease.id}
                                                    draggable
                                                    onDragStart={(e) => onDragStart(e, lease.id)}
                                                    onClick={() => setSelectedLease(lease)}
                                                    className={`
                                                        bg-white p-4 rounded-xl shadow-sm border border-slate-100 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group relative
                                                        ${draggedLeaseId === lease.id ? 'opacity-50 rotate-3' : 'opacity-100'}
                                                    `}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">
                                                                {lease.tenantName.substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <h4 className="text-sm font-bold text-slate-800 leading-tight">{lease.tenantName}</h4>
                                                                <span className="text-[10px] font-mono text-slate-400">{lease.id}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4 text-xs text-slate-600 mb-3 bg-slate-50 p-2 rounded-lg">
                                                        <div className="flex items-center gap-1"><Building2 size={12} className="text-slate-400"/> {lease.branchId}</div>
                                                        <div className="flex items-center gap-1"><DollarSign size={12} className="text-slate-400"/> {(lease.monthlyRent/1000).toFixed(1)}k</div>
                                                    </div>

                                                    <div className="pt-1">
                                                        <TimelineBar start={lease.startDate} end={lease.endDate} />
                                                    </div>
                                                    
                                                    {/* Drag Handle Visual */}
                                                    <div className="absolute top-1/2 left-1 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-slate-300">
                                                        <GripVertical size={16} />
                                                    </div>
                                                </div>
                                            ))}
                                            {columnLeases.length === 0 && (
                                                <div className="h-24 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-xs">
                                                    Drop items here
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* LIST MODE */}
                {viewMode === 'list' && (
                    <div className="flex-1 overflow-auto px-8 pb-8">
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Tenant</th>
                                        <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Location</th>
                                        <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Lease Term</th>
                                        <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider text-right">Rent (THB)</th>
                                        <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredLeases.map((lease) => (
                                        <tr 
                                            key={lease.id} 
                                            onClick={() => setSelectedLease(lease)}
                                            className={`cursor-pointer transition-colors ${selectedLease?.id === lease.id ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800">{lease.tenantName}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">{lease.id}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-slate-700">{lease.branchId}</div>
                                                <div className="text-xs text-slate-500 font-mono">Unit {lease.unitNumber} • {lease.areaSqm} sqm</div>
                                            </td>
                                            <td className="px-6 py-4 w-48">
                                                <TimelineBar start={lease.startDate} end={lease.endDate} />
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-medium text-slate-700">
                                                {lease.monthlyRent.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={lease.status} />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="text-slate-400 hover:text-slate-800 p-1 rounded hover:bg-slate-100">
                                                    <ChevronRight size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Slide-over Detail Panel */}
            <div className={`w-96 border-l border-slate-200 bg-white h-full transition-transform duration-300 transform ${selectedLease ? 'translate-x-0' : 'translate-x-full'} absolute right-0 top-0 shadow-2xl z-20 flex flex-col`}>
                {selectedLease && (
                    <>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 line-clamp-1">{selectedLease.tenantName}</h2>
                                <p className="text-xs text-slate-500 font-mono mt-1">{selectedLease.id}</p>
                            </div>
                            <button 
                                onClick={() => setSelectedLease(null)}
                                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Key Details */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Branch</span>
                                    <span className="font-bold text-slate-800 text-sm">{selectedLease.branchId}</span>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Unit Area</span>
                                    <span className="font-bold text-slate-800 text-sm">{selectedLease.areaSqm} sqm</span>
                                </div>
                            </div>

                            {/* Financials */}
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <DollarSign size={14} /> Financials
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                                        <span className="text-slate-500">Monthly Rent</span>
                                        <span className="font-mono font-bold text-slate-800">฿{selectedLease.monthlyRent.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                                        <span className="text-slate-500">Deposit</span>
                                        <span className="font-mono font-bold text-slate-800">฿{selectedLease.depositAmount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm pb-2">
                                        <span className="text-slate-500">Payment Status</span>
                                        <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded">Paid (May)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Phone size={14} /> Contact
                                </h3>
                                <p className="text-sm font-bold text-slate-800">{selectedLease.contactPerson}</p>
                                <p className="text-xs text-slate-500 mt-1 font-mono">{selectedLease.contactPhone}</p>
                            </div>

                            {/* Documents */}
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <FileText size={14} /> Documents
                                </h3>
                                {selectedLease.documents.length > 0 ? (
                                    <div className="space-y-2">
                                        {selectedLease.documents.map((doc, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-300 transition-colors group cursor-pointer shadow-sm">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="bg-red-50 text-red-600 p-1.5 rounded">
                                                        <FileText size={16} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-slate-700 truncate">{doc.name}</p>
                                                        <p className="text-[10px] text-slate-400">{doc.date} • {doc.type}</p>
                                                    </div>
                                                </div>
                                                <Download size={14} className="text-slate-300 group-hover:text-blue-600" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 italic">No documents uploaded.</p>
                                )}
                            </div>
                        </div>

                        {/* Actions Footer */}
                        <div className="p-4 border-t border-slate-200 bg-white space-y-2">
                            <button className="w-full py-2 bg-nt-dark text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors">
                                Edit Contract Details
                            </button>
                            {selectedLease.status === 'Expiring' && (
                                <button className="w-full py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors">
                                    Initiate Renewal Process
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
