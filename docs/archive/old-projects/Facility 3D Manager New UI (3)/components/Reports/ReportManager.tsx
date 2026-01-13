
import React, { useState } from 'react';
import { FileText, Plus, Search, ShieldCheck, Clock, CheckCircle2, AlertCircle, Lock, Trash2, Sparkles, Wand2, Loader2, Filter, Zap, Activity } from 'lucide-react';
import { ReportDocument, ReportBlock, ISOStandard } from '../../types';
import { ReportEditor } from './ReportEditor';
import { Modal } from '../ui/Modal';
import { generateReportDraft } from '../../services/geminiService';

interface ReportManagerProps {
    reports: ReportDocument[];
    setReports: React.Dispatch<React.SetStateAction<ReportDocument[]>>;
}

export const ReportManager: React.FC<ReportManagerProps> = ({ reports, setReports }) => {
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [standardFilter, setStandardFilter] = useState<ISOStandard | 'ALL'>('ALL');
    
    const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
    const [draftPrompt, setDraftPrompt] = useState('');
    const [draftStandard, setDraftStandard] = useState<ISOStandard>('ISO-27001');
    const [isGenerating, setIsGenerating] = useState(false);

    const activeReport = reports.find(r => r.id === selectedReportId);

    const handleCreateReport = (std: ISOStandard = 'GENERAL') => {
        const newReport: ReportDocument = {
            id: Date.now().toString(),
            title: 'Untitled Report',
            standard: std,
            classification: 'Internal',
            author: 'Admin User',
            lastModified: new Date(),
            status: 'draft',
            version: '1.0',
            blocks: [{ id: Date.now().toString(), type: 'h1', content: 'New Report' }]
        };
        setReports([newReport, ...reports]);
        setSelectedReportId(newReport.id);
    };

    const handleAiDraft = async () => {
        if (!draftPrompt.trim()) return;
        setIsGenerating(true);
        try {
            const draft = await generateReportDraft(draftPrompt, draftStandard);
            const newReport: ReportDocument = {
                id: Date.now().toString(),
                title: draft.title || 'AI Draft',
                standard: draftStandard,
                isoControlId: draft.isoControlId,
                classification: draft.classification as any || 'Internal',
                author: 'AI Assistant',
                lastModified: new Date(),
                status: 'draft',
                version: '1.0',
                blocks: (draft.blocks || []).map(b => ({ ...b, id: Math.random().toString(36).substr(2, 9) })) as ReportBlock[]
            };
            setReports([newReport, ...reports]);
            setSelectedReportId(newReport.id);
            setIsDraftModalOpen(false);
            setDraftPrompt('');
        } catch (e) { console.error(e); }
        finally { setIsGenerating(false); }
    };

    const handleSaveReport = (updatedReport: ReportDocument) => {
        setReports(prev => prev.map(r => r.id === updatedReport.id ? updatedReport : r));
    };

    const filteredReports = reports.filter(r => {
        const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStandard = standardFilter === 'ALL' || r.standard === standardFilter;
        return matchesSearch && matchesStandard;
    });

    // If a report is selected, show the Editor view
    // increased top padding to pt-20 (80px) to ensure clearance of the global header
    if (activeReport) {
        return (
            <div className="h-full flex flex-col bg-slate-50 animate-fade-in-up">
                <ReportEditor 
                    report={activeReport} 
                    onSave={handleSaveReport}
                    onBack={() => setSelectedReportId(null)}
                />
            </div>
        );
    }

    // List view
    return (
        <div className="w-full h-full overflow-y-auto p-6 bg-slate-50 text-slate-800">
            <div className="max-w-6xl mx-auto mt-4">
                <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                            <ShieldCheck className="text-nt-dark" /> NT Compliance Engine
                        </h1>
                        <p className="text-sm text-slate-500 mt-1 uppercase tracking-widest font-bold">Standardized Facility Reporting Hub</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Search reports..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-nt-dark outline-none w-48 md:w-64 transition-all"
                            />
                        </div>
                        <button 
                            onClick={() => setIsDraftModalOpen(true)}
                            className="bg-white border border-purple-200 text-purple-600 px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-purple-50 transition-all shadow-sm uppercase tracking-widest"
                        >
                            <Sparkles size={14} /> AI Context Draft
                        </button>
                        <button 
                            onClick={() => handleCreateReport('GENERAL')}
                            className="bg-nt-dark text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg uppercase tracking-widest"
                        >
                            <Plus size={14} /> Manual Report
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-8">
                    {['ALL', 'ISO-27001', 'ISO-22301', 'ISO-50001'].map(f => (
                        <button 
                            key={f}
                            onClick={() => setStandardFilter(f as any)}
                            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                                standardFilter === f ? 'bg-nt-dark text-white border-nt-dark' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 shadow-sm'
                            }`}
                        >
                            {f.replace('-', ' ')}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                    {filteredReports.map(report => (
                        <div 
                            key={report.id}
                            onClick={() => setSelectedReportId(report.id)}
                            className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all cursor-pointer group overflow-hidden relative border-t-4"
                            style={{ borderTopColor: report.standard === 'ISO-27001' ? '#3b82f6' : report.standard === 'ISO-22301' ? '#f59e0b' : report.standard === 'ISO-50001' ? '#10b981' : '#cbd5e1' }}
                        >
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-slate-50 rounded-lg text-slate-400 group-hover:text-nt-dark transition-colors">
                                            {report.standard === 'ISO-27001' ? <Lock size={16} /> : report.standard === 'ISO-50001' ? <Zap size={16} /> : <Activity size={16} />}
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{report.standard}</span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${report.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {report.status}
                                    </span>
                                </div>
                                <h3 className="font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight h-10">{report.title}</h3>
                                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-4">
                                    <span className="flex items-center gap-1"><Clock size={12} /> {report.lastModified.toLocaleDateString()}</span>
                                    <span className={`px-2 py-0.5 rounded ${report.classification === 'Confidential' ? 'text-red-600 bg-red-50' : 'text-slate-500 bg-slate-50'}`}>{report.classification}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredReports.length === 0 && (
                        <div className="col-span-full py-20 text-center text-slate-400 flex flex-col items-center">
                            <FileText size={48} className="mb-4 opacity-10" />
                            <p className="font-bold uppercase tracking-widest text-xs">No reports found matching criteria</p>
                        </div>
                    )}
                </div>
            </div>

            <Modal isOpen={isDraftModalOpen} onClose={() => setIsDraftModalOpen(false)} title="Intelligence Report Drafting">
                <div className="p-6">
                    <div className="mb-6">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Target Standard</label>
                        <div className="flex gap-2">
                            {['ISO-27001', 'ISO-22301', 'ISO-50001'].map(s => (
                                <button 
                                    key={s}
                                    onClick={() => setDraftStandard(s as ISOStandard)}
                                    className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all border ${draftStandard === s ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Draft Context</label>
                    <textarea 
                        autoFocus
                        value={draftPrompt}
                        onChange={(e) => setDraftPrompt(e.target.value)}
                        placeholder="Describe the incident or audit findings. AI will structure the blocks and map to standard controls."
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none h-32 resize-none mb-6 font-medium text-slate-700"
                    />
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setIsDraftModalOpen(false)} className="px-4 py-2 text-slate-400 font-black text-xs uppercase tracking-widest">Cancel</button>
                        <button 
                            onClick={handleAiDraft}
                            disabled={isGenerating || !draftPrompt.trim()}
                            className="bg-purple-600 text-white px-6 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-purple-700 transition-all shadow-lg uppercase tracking-widest disabled:opacity-50"
                        >
                            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                            {isGenerating ? 'Synthesizing...' : 'Draft Report'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
