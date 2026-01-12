
import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { SparePart, PartCategory, PartStatus, Supplier, PurchaseOrder, POStatus } from '../../types';
import { 
    Package, Search, Filter, AlertTriangle, TrendingDown, TrendingUp, 
    ShoppingCart, Truck, Plus, MoreHorizontal, ChevronRight, BarChart3,
    Box, Tag, DollarSign, CheckCircle2, RefreshCw, X, ArrowRight, LayoutGrid, List, FileText, User, Phone, Star, Clock, Loader2
} from 'lucide-react';
import { Modal } from '../ui/Modal';

// --- Mock Data ---
const MOCK_PARTS: SparePart[] = [
    { 
        id: 'SP-001', name: 'Air Filter 20x20x1 (MERV 13)', sku: 'FLT-2020-M13', category: 'HVAC', 
        currentStock: 45, minStock: 20, maxStock: 100, unit: 'pcs', costPerUnit: 250, 
        location: 'WH-BKK-A1-02', supplier: 'CleanAir Supplies Co.', leadTimeDays: 3, 
        lastUsed: '2024-05-10', status: 'In Stock', compatibleModels: ['Daikin VRV', 'Trane RTU'] 
    },
    { 
        id: 'SP-002', name: 'Compressor Start Capacitor', sku: 'ELEC-CAP-45UF', category: 'Electrical', 
        currentStock: 3, minStock: 5, maxStock: 20, unit: 'pcs', costPerUnit: 1200, 
        location: 'WH-BKK-B3-15', supplier: 'Thai Electro Parts', leadTimeDays: 7, 
        lastUsed: '2024-05-08', status: 'Low Stock', compatibleModels: ['Carrier 30XA'] 
    },
    { 
        id: 'SP-003', name: 'Hydraulic Valve Seal Kit', sku: 'HYD-VSK-09', category: 'Plumbing', 
        currentStock: 0, minStock: 2, maxStock: 10, unit: 'set', costPerUnit: 4500, 
        location: 'WH-NON-C2-01', supplier: 'Industrial Seals Ltd.', leadTimeDays: 14, 
        lastUsed: '2024-04-25', status: 'Out of Stock', compatibleModels: ['Grundfos Pump'] 
    },
    { 
        id: 'SP-004', name: 'LED Panel Driver 40W', sku: 'LGT-DRV-40W', category: 'Electrical', 
        currentStock: 12, minStock: 10, maxStock: 50, unit: 'pcs', costPerUnit: 350, 
        location: 'WH-CM-L1-05', supplier: 'LightTech Solutions', leadTimeDays: 5, 
        lastUsed: '2024-05-11', status: 'In Stock', compatibleModels: ['Generic LED Panel'] 
    },
    { 
        id: 'SP-005', name: 'Cat6 Ethernet Cable (305m)', sku: 'NET-CAT6-BOX', category: 'IT', 
        currentStock: 8, minStock: 5, maxStock: 15, unit: 'box', costPerUnit: 3200, 
        location: 'WH-SR-IT-01', supplier: 'Network Systems Inc.', leadTimeDays: 2, 
        lastUsed: '2024-05-01', status: 'In Stock', compatibleModels: ['General IT'] 
    },
    { 
        id: 'SP-006', name: 'V-Belt B52', sku: 'MEC-BELT-B52', category: 'HVAC', 
        currentStock: 4, minStock: 10, maxStock: 40, unit: 'pcs', costPerUnit: 180, 
        location: 'WH-BKK-A2-10', supplier: 'Belt Master', leadTimeDays: 4, 
        lastUsed: '2024-05-12', status: 'Low Stock', compatibleModels: ['AHU Fan Motor'] 
    }
];

const MOCK_SUPPLIERS: Supplier[] = [
    { id: 'SUP-001', name: 'CleanAir Supplies Co.', contactPerson: 'K. Somchai', phone: '02-111-2222', email: 'sales@cleanair.co.th', category: ['HVAC', 'Consumables'], rating: 4.8, activeContracts: 3 },
    { id: 'SUP-002', name: 'Thai Electro Parts', contactPerson: 'K. Wirat', phone: '02-333-4444', email: 'orders@thaielectro.com', category: ['Electrical', 'Tools'], rating: 4.2, activeContracts: 1 },
    { id: 'SUP-003', name: 'Industrial Seals Ltd.', contactPerson: 'Mr. David', phone: '02-555-6666', email: 'support@indseals.com', category: ['Plumbing'], rating: 3.9, activeContracts: 0 },
    { id: 'SUP-004', name: 'Network Systems Inc.', contactPerson: 'K. Anne', phone: '02-777-8888', email: 'b2b@netsys.co.th', category: ['IT', 'Electrical'], rating: 4.9, activeContracts: 5 },
];

const MOCK_POS: PurchaseOrder[] = [
    { id: 'PO-2025-042', supplierId: 'SUP-001', createdDate: new Date('2025-05-10'), expectedDate: new Date('2025-05-15'), items: [{ partId: 'SP-001', quantity: 50, unitCost: 250 }], totalAmount: 12500, status: 'Pending', requestedBy: 'Admin User' },
    { id: 'PO-2025-041', supplierId: 'SUP-004', createdDate: new Date('2025-05-01'), expectedDate: new Date('2025-05-03'), items: [{ partId: 'SP-005', quantity: 10, unitCost: 3200 }], totalAmount: 32000, status: 'Received', requestedBy: 'IT Manager' },
    { id: 'PO-2025-038', supplierId: 'SUP-002', createdDate: new Date('2025-04-20'), expectedDate: new Date('2025-04-25'), items: [{ partId: 'SP-002', quantity: 20, unitCost: 1200 }], totalAmount: 24000, status: 'Received', requestedBy: 'Admin User' },
];

const StatusBadge: React.FC<{ status: PartStatus }> = ({ status }) => {
    const styles = {
        'In Stock': 'bg-emerald-50 text-emerald-700 border-emerald-200',
        'Low Stock': 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse',
        'Out of Stock': 'bg-red-50 text-red-700 border-red-200',
        'On Order': 'bg-blue-50 text-blue-700 border-blue-200'
    };
    const icons = {
        'In Stock': <CheckCircle2 size={10} />,
        'Low Stock': <AlertTriangle size={10} />,
        'Out of Stock': <X size={10} />,
        'On Order': <Truck size={10} />
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${styles[status]}`}>
            {icons[status]}
            {status}
        </span>
    );
};

const POStatusBadge: React.FC<{ status: POStatus }> = ({ status }) => {
    const styles = {
        'Draft': 'bg-gray-100 text-gray-600',
        'Pending': 'bg-amber-50 text-amber-600 border-amber-100',
        'Approved': 'bg-blue-50 text-blue-600 border-blue-100',
        'Received': 'bg-emerald-50 text-emerald-600 border-emerald-100',
        'Cancelled': 'bg-red-50 text-red-600 border-red-100'
    };
    return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${styles[status]}`}>{status}</span>;
}

export const SparePartsManager: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'suppliers'>('inventory');
    const [parts, setParts] = useState<SparePart[]>(MOCK_PARTS);
    const [suppliers] = useState<Supplier[]>(MOCK_SUPPLIERS);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(MOCK_POS);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPart, setSelectedPart] = useState<SparePart | null>(null);
    const [filterCategory, setFilterCategory] = useState<string>('All');
    
    // Create PO Modal State
    const [isPOModalOpen, setIsPOModalOpen] = useState(false);
    const [newPO, setNewPO] = useState<{ supplierId: string; items: { partId: string; qty: number }[] }>({ supplierId: '', items: [] });
    const [isSubmittingPO, setIsSubmittingPO] = useState(false);

    // KPI Calculations
    const totalValue = parts.reduce((acc, part) => acc + (part.currentStock * part.costPerUnit), 0);
    const lowStockCount = parts.filter(p => p.status === 'Low Stock').length;
    const outOfStockCount = parts.filter(p => p.status === 'Out of Stock').length;
    const pendingOrdersCount = purchaseOrders.filter(po => po.status === 'Pending').length;

    const filteredParts = parts.filter(part => {
        const matchesSearch = part.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              part.sku.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'All' || part.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const handleCreatePO = () => {
        setIsSubmittingPO(true);
        setTimeout(() => {
            const supplier = suppliers.find(s => s.id === newPO.supplierId);
            const total = newPO.items.reduce((acc, item) => {
                const part = parts.find(p => p.id === item.partId);
                return acc + (part ? part.costPerUnit * item.qty : 0);
            }, 0);

            const createdPO: PurchaseOrder = {
                id: `PO-${new Date().getFullYear()}-${Math.floor(Math.random()*1000)}`,
                supplierId: newPO.supplierId,
                createdDate: new Date(),
                expectedDate: new Date(Date.now() + 7*24*60*60*1000), // +7 days mock
                items: newPO.items.map(i => ({ 
                    partId: i.partId, 
                    quantity: i.qty, 
                    unitCost: parts.find(p => p.id === i.partId)?.costPerUnit || 0 
                })),
                totalAmount: total,
                status: 'Pending',
                requestedBy: 'Admin User'
            };

            setPurchaseOrders([createdPO, ...purchaseOrders]);
            
            // Update parts status
            setParts(prev => prev.map(p => {
                if (newPO.items.some(i => i.partId === p.id)) return { ...p, status: 'On Order' };
                return p;
            }));

            setIsSubmittingPO(false);
            setIsPOModalOpen(false);
            setNewPO({ supplierId: '', items: [] });
        }, 1500);
    };

    const handleAddPOItem = () => {
        setNewPO(prev => ({ ...prev, items: [...prev.items, { partId: '', qty: 1 }] }));
    };

    const handleUpdatePOItem = (index: number, field: 'partId' | 'qty', value: any) => {
        const newItems = [...newPO.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setNewPO(prev => ({ ...prev, items: newItems }));
    };

    return (
        <div className="w-full h-full flex overflow-hidden bg-slate-50">
            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="p-8 pb-4 flex-shrink-0">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                                <Package className="text-slate-400" /> Inventory & Spare Parts
                            </h1>
                            <p className="text-sm text-slate-500 mt-1 font-mono">/logistics/spare-parts</p>
                        </div>
                        
                        <div className="flex items-center bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                            <button 
                                onClick={() => setActiveTab('inventory')}
                                className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'inventory' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <List size={14} /> Inventory
                            </button>
                            <button 
                                onClick={() => setActiveTab('orders')}
                                className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'orders' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <FileText size={14} /> Purchase Orders
                            </button>
                            <button 
                                onClick={() => setActiveTab('suppliers')}
                                className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'suppliers' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <User size={14} /> Suppliers
                            </button>
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setIsPOModalOpen(true)}
                                className="bg-nt-dark text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-md"
                            >
                                <ShoppingCart size={16} /> Create PO
                            </button>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <Card className="p-4 bg-white border-slate-200">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Inventory Value</p>
                                    <p className="text-2xl font-black text-slate-800 font-mono">฿{(totalValue).toLocaleString()}</p>
                                </div>
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><DollarSign size={20} /></div>
                            </div>
                        </Card>

                        <Card className={`p-4 border-slate-200 ${lowStockCount > 0 ? 'bg-amber-50/20 border-amber-200' : 'bg-white'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Low Stock Alerts</p>
                                    <p className={`text-2xl font-black ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>{lowStockCount}</p>
                                </div>
                                <div className={`p-2 rounded-lg ${lowStockCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
                                    <TrendingDown size={20} />
                                </div>
                            </div>
                        </Card>

                        <Card className={`p-4 border-slate-200 ${outOfStockCount > 0 ? 'bg-red-50/20 border-red-200' : 'bg-white'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Stockouts</p>
                                    <p className={`text-2xl font-black ${outOfStockCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>{outOfStockCount}</p>
                                </div>
                                <div className={`p-2 rounded-lg ${outOfStockCount > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
                                    <AlertTriangle size={20} />
                                </div>
                            </div>
                        </Card>

                        <Card className="p-4 bg-white border-slate-200">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pending Orders</p>
                                    <p className="text-2xl font-black text-slate-800">{pendingOrdersCount}</p>
                                </div>
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Truck size={20} /></div>
                            </div>
                        </Card>
                    </div>

                    {/* Filter Bar (Only for Inventory) */}
                    {activeTab === 'inventory' && (
                        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm mb-4">
                            <div className="relative group flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text"
                                    placeholder="Search part name, SKU, or supplier..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none w-full transition-all"
                                />
                            </div>
                            <div className="h-6 w-px bg-slate-200 mx-2"></div>
                            <div className="flex gap-2">
                                {['All', 'HVAC', 'Electrical', 'Plumbing', 'IT'].map(cat => (
                                    <button 
                                        key={cat}
                                        onClick={() => setFilterCategory(cat)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterCategory === cat ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* --- CONTENT AREA SWITCH --- */}
                <div className="flex-1 overflow-auto px-8 pb-8">
                    
                    {/* INVENTORY TAB */}
                    {activeTab === 'inventory' && (
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Part Info</th>
                                        <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Location</th>
                                        <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider w-48">Stock Level</th>
                                        <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider text-right">Unit Cost</th>
                                        <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredParts.map((part) => (
                                        <tr 
                                            key={part.id} 
                                            onClick={() => setSelectedPart(part)}
                                            className={`cursor-pointer transition-colors ${selectedPart?.id === part.id ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800">{part.name}</div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">{part.sku}</span>
                                                    <span className="text-[10px] text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded">{part.category}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <Box size={14} className="text-slate-400" />
                                                    <span className="text-xs font-mono">{part.location}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                                    <span>{part.currentStock} {part.unit}</span>
                                                    <span>Max: {part.maxStock}</span>
                                                </div>
                                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full ${part.currentStock <= part.minStock ? 'bg-red-500' : part.currentStock < part.maxStock * 0.3 ? 'bg-amber-500' : 'bg-blue-500'}`} 
                                                        style={{ width: `${Math.min(100, (part.currentStock / part.maxStock) * 100)}%` }}
                                                    ></div>
                                                </div>
                                                {part.currentStock <= part.minStock && (
                                                    <div className="text-[9px] text-red-500 font-bold mt-1">Below Reorder Point ({part.minStock})</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-medium text-slate-700">
                                                ฿{part.costPerUnit.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={part.status} />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button className="text-slate-400 hover:text-slate-800 p-1.5 rounded hover:bg-slate-100">
                                                        <ChevronRight size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* PURCHASE ORDERS TAB */}
                    {activeTab === 'orders' && (
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">PO Number</th>
                                        <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Supplier</th>
                                        <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Total Amount</th>
                                        <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Requestor</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {purchaseOrders.map(po => {
                                        const supplier = suppliers.find(s => s.id === po.supplierId);
                                        return (
                                            <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-mono font-bold text-blue-600">{po.id}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-700">{supplier?.name || po.supplierId}</div>
                                                    <div className="text-[10px] text-slate-400">{po.items.length} Items</div>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-600">
                                                    {po.createdDate.toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 font-mono font-bold text-slate-800">
                                                    ฿{po.totalAmount.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <POStatusBadge status={po.status} />
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-500">
                                                    {po.requestedBy}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* SUPPLIERS TAB */}
                    {activeTab === 'suppliers' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {suppliers.map(supplier => (
                                <div key={supplier.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-sm">{supplier.name}</h3>
                                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono mt-1">
                                                {supplier.id}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 bg-yellow-50 text-yellow-600 px-2 py-1 rounded text-xs font-bold">
                                            <Star size={12} fill="currentColor" /> {supplier.rating}
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3 mb-4">
                                        <div className="flex items-center gap-3 text-xs text-slate-600">
                                            <User size={14} className="text-slate-400" /> {supplier.contactPerson}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-slate-600">
                                            <Phone size={14} className="text-slate-400" /> {supplier.phone}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {supplier.category.map(cat => (
                                            <span key={cat} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded border border-slate-200">
                                                {cat}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                                        <span className="text-[10px] text-slate-400">{supplier.activeContracts} Active Contracts</span>
                                        <button className="text-xs text-blue-600 font-bold hover:underline">View Catalog</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                </div>
            </div>

            {/* Part Detail Panel (Only show when Inventory is active) */}
            {activeTab === 'inventory' && (
                <div className={`w-96 border-l border-slate-200 bg-white h-full transition-transform duration-300 transform ${selectedPart ? 'translate-x-0' : 'translate-x-full'} absolute right-0 top-0 shadow-2xl z-20 flex flex-col`}>
                    {selectedPart && (
                        <>
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white border border-slate-200 px-2 py-0.5 rounded">{selectedPart.category}</span>
                                    <button onClick={() => setSelectedPart(null)} className="text-slate-400 hover:text-slate-800"><ArrowRight size={20} /></button>
                                </div>
                                <h2 className="text-lg font-bold text-slate-900 leading-tight mb-1">{selectedPart.name}</h2>
                                <p className="text-xs text-slate-500 font-mono">{selectedPart.sku}</p>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                
                                {/* Stock Status Box */}
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Box size={14} /> Stock Status
                                    </h3>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-3xl font-bold text-slate-800">{selectedPart.currentStock}</span>
                                        <span className="text-sm text-slate-500">{selectedPart.unit} available</span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>Reorder Point: {selectedPart.minStock}</span>
                                            <span>Max Capacity: {selectedPart.maxStock}</span>
                                        </div>
                                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                            <div className={`h-full ${selectedPart.currentStock <= selectedPart.minStock ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${(selectedPart.currentStock / selectedPart.maxStock) * 100}%` }}></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Supplier & Logistics */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-white border border-slate-200 rounded-lg">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Supplier</span>
                                        <span className="text-xs font-bold text-slate-700">{selectedPart.supplier}</span>
                                    </div>
                                    <div className="p-3 bg-white border border-slate-200 rounded-lg">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Lead Time</span>
                                        <span className="text-xs font-bold text-slate-700">{selectedPart.leadTimeDays} Days</span>
                                    </div>
                                    <div className="p-3 bg-white border border-slate-200 rounded-lg">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Unit Cost</span>
                                        <span className="text-xs font-mono font-bold text-slate-700">฿{selectedPart.costPerUnit}</span>
                                    </div>
                                    <div className="p-3 bg-white border border-slate-200 rounded-lg">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Last Used</span>
                                        <span className="text-xs font-bold text-slate-700">{selectedPart.lastUsed}</span>
                                    </div>
                                </div>

                                {/* Compatible Assets */}
                                <div>
                                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <RefreshCw size={14} /> Compatible With
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedPart.compatibleModels.map((model, i) => (
                                            <span key={i} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded border border-indigo-100 flex items-center gap-1">
                                                <Tag size={10} /> {model}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Recent Activity Mock */}
                                <div>
                                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <BarChart3 size={14} /> Recent Movement
                                    </h3>
                                    <div className="space-y-3 border-l-2 border-slate-100 ml-2 pl-4 relative">
                                        {[1,2,3].map((i) => (
                                            <div key={i} className="text-xs relative">
                                                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 bg-white border-2 border-slate-300 rounded-full"></div>
                                                <p className="font-bold text-slate-700">Used in Work Order #WO-2025-08{i}</p>
                                                <p className="text-slate-400 text-[10px]">May {15-i}, 2025 • -2 units</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>

                            {/* Footer Actions */}
                            <div className="p-4 border-t border-slate-200 bg-white space-y-2">
                                <button className="w-full py-2 bg-nt-dark text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                                    <Truck size={14} /> Create Purchase Order
                                </button>
                                <button className="w-full py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors">
                                    Adjust Stock Level
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Create PO Modal */}
            <Modal isOpen={isPOModalOpen} onClose={() => setIsPOModalOpen(false)} title="Create Purchase Order">
                <div className="p-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Supplier</label>
                            <select 
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                value={newPO.supplierId}
                                onChange={(e) => setNewPO({ ...newPO, supplierId: e.target.value })}
                            >
                                <option value="">Select Supplier...</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Items</label>
                            <div className="space-y-2">
                                {newPO.items.map((item, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <select 
                                            className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded text-sm"
                                            value={item.partId}
                                            onChange={(e) => handleUpdatePOItem(idx, 'partId', e.target.value)}
                                        >
                                            <option value="">Select Part...</option>
                                            {parts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <input 
                                            type="number" 
                                            min="1"
                                            className="w-20 p-2 bg-slate-50 border border-slate-200 rounded text-sm"
                                            value={item.qty}
                                            onChange={(e) => handleUpdatePOItem(idx, 'qty', parseInt(e.target.value))}
                                        />
                                    </div>
                                ))}
                                <button 
                                    onClick={handleAddPOItem}
                                    className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                                >
                                    <Plus size={12} /> Add Item
                                </button>
                            </div>
                        </div>

                        {newPO.items.length > 0 && (
                            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                                <span className="text-xs text-slate-500">Total Items: {newPO.items.length}</span>
                                <span className="text-sm font-bold text-slate-900">
                                    Est. Total: ฿
                                    {newPO.items.reduce((acc, item) => {
                                        const p = parts.find(part => part.id === item.partId);
                                        return acc + (p ? p.costPerUnit * item.qty : 0);
                                    }, 0).toLocaleString()}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button onClick={() => setIsPOModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded text-xs font-bold">Cancel</button>
                        <button 
                            onClick={handleCreatePO}
                            disabled={isSubmittingPO || !newPO.supplierId || newPO.items.length === 0}
                            className="bg-nt-dark text-white px-4 py-2 rounded text-xs font-bold flex items-center gap-2 hover:bg-slate-800 disabled:opacity-50"
                        >
                            {isSubmittingPO ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                            Confirm Order
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
