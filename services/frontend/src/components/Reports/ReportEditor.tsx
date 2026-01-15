
import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Save, Sparkles, MoreHorizontal, Shield, Lock, History, FileText, Loader2, Wand2, 
  Type as TypeIcon, List, CheckSquare, X, ChevronRight, AlertCircle, CheckCircle, Zap, Code, 
  ChevronDown, Languages, AlignLeft, Scale, Edit3, Trash2, PieChart, BarChart3, TrendingUp, Lightbulb, MessageSquare
} from 'lucide-react';
import { ReportDocument, ReportBlock, ReportStatus, ISOStandard } from '../../types';
import { enhanceReportContent, aiEditorTask, runComplianceAudit, getIsoContext, getWritingSuggestions, chatWithDocument } from '../../services/geminiService';
import { Modal } from '../ui/Modal';

interface ReportEditorProps {
    report: ReportDocument;
    onSave: (report: ReportDocument) => void;
    onBack: () => void;
}

// Internal Widget Component
const WidgetBlockRenderer: React.FC<{ data: any }> = ({ data }) => {
    return (
        <div className="my-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-50 text-blue-600 p-1.5 rounded-lg"><BarChart3 size={16}/></div>
                    <span className="text-xs font-bold text-slate-700 uppercase">{data.title || "Smart Widget"}</span>
                </div>
                <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded">Live Data</span>
            </div>
            
            {/* Mock Chart Visualization based on type */}
            <div className="h-32 w-full flex items-end gap-2 px-2 relative">
                {/* Simulated Chart Bars */}
                {[45, 60, 55, 80, 72, 65, 85].map((val, i) => (
                    <div key={i} className="flex-1 bg-blue-100 rounded-t-sm relative group/bar hover:bg-blue-200 transition-colors" style={{ height: `${val}%` }}>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-[9px] text-slate-500 opacity-0 group-hover/bar:opacity-100 transition-opacity">{val}</div>
                    </div>
                ))}
                {/* Trend Line Overlay Mock */}
                <div className="absolute inset-0 pointer-events-none opacity-30">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                        <polyline points="0,55 15,40 30,45 45,20 60,28 75,35 100,15" fill="none" stroke="#3b82f6" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    </svg>
                </div>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 flex justify-between">
                <span>{data.startDate || '01 May'}</span>
                <span>{data.endDate || '07 May'}</span>
            </div>
        </div>
    );
};

export const ReportEditor: React.FC<ReportEditorProps> = ({ report, onSave, onBack }) => {
    const [blocks, setBlocks] = useState<ReportBlock[]>(report.blocks);
    const [title, setTitle] = useState(report.title);
    const [status, setStatus] = useState<ReportStatus>(report.status);
    const [isSaving, setIsSaving] = useState(false);
    
    // Copilot State
    const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
    const [copilotOpen, setCopilotOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<'context' | 'chat'>('context');
    const [isoContext, setIsoContext] = useState<any[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isCopilotThinking, setIsCopilotThinking] = useState(false);
    
    // Document Chat State
    const [chatMessages, setChatMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);

    // Audit State
    const [auditData, setAuditData] = useState<{ score: number, findings: string[], recommendations: string[] } | null>(null);
    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
    const [auditLoading, setAuditLoading] = useState(false);

    // Menus
    const [slashMenu, setSlashMenu] = useState<{ id: string; x: number; y: number } | null>(null);
    const [aiMenu, setAiMenu] = useState<{ id: string; x: number; y: number } | null>(null);
    const [aiInput, setAiInput] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    
    // Text Selection Menu
    const [selectionMenu, setSelectionMenu] = useState<{ x: number; y: number; text: string } | null>(null);

    const editorRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Handle Text Selection
    useEffect(() => {
        const handleSelection = () => {
            const selection = window.getSelection();
            if (selection && selection.toString().length > 0) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                // Only show if not inside a menu
                setSelectionMenu({ x: rect.left, y: rect.top - 40, text: selection.toString() });
            } else {
                setSelectionMenu(null);
            }
        };
        
        document.addEventListener('mouseup', handleSelection);
        return () => document.removeEventListener('mouseup', handleSelection);
    }, []);

    // Effect to run Copilot analysis on active block change (Debounced)
    useEffect(() => {
        if (!activeBlockId || !copilotOpen || activeTab !== 'context') return;
        const block = blocks.find(b => b.id === activeBlockId);
        if (!block || !block.content.trim() || block.type === 'data-widget') return;

        if (debounceRef.current) clearTimeout(debounceRef.current);

        setIsCopilotThinking(true);
        debounceRef.current = setTimeout(async () => {
            try {
                // Parallel fetch for speed
                const [isoRes, suggRes] = await Promise.all([
                    getIsoContext(block.content, report.standard),
                    getWritingSuggestions(block.content)
                ]);
                setIsoContext(isoRes.clauses || []);
                setSuggestions(suggRes.suggestions || []);
            } catch (e) {
                console.error("Copilot error", e);
            } finally {
                setIsCopilotThinking(false);
            }
        }, 1500); // 1.5s debounce

        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [activeBlockId, blocks, copilotOpen, report.standard, activeTab]);

    const handleManualSave = () => {
        setIsSaving(true);
        onSave({ ...report, title, blocks, status, lastModified: new Date() });
        setTimeout(() => setIsSaving(false), 800);
    };

    const handleAudit = async () => {
        setAuditLoading(true);
        setIsAuditModalOpen(true);
        const content = blocks.map(b => b.type === 'data-widget' ? `[Widget: ${b.widgetData.title}]` : b.content).join('\n');
        try {
            const result = await runComplianceAudit(content, report.standard);
            setAuditData(result);
        } catch (e) { console.error(e); }
        finally { setAuditLoading(false); }
    };

    const handleChatSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!chatInput.trim()) return;

        const msg = chatInput;
        setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
        setChatInput('');
        setIsChatLoading(true);

        const content = blocks.map(b => b.content).join('\n');
        try {
            const response = await chatWithDocument(content, msg);
            setChatMessages(prev => [...prev, { role: 'model', text: response }]);
        } catch (error) {
            setChatMessages(prev => [...prev, { role: 'model', text: "ขออภัย เกิดข้อผิดพลาดในการประมวลผล" }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleBlockChange = (id: string, content: string) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b));
        if (content.endsWith('/')) {
            const el = document.getElementById(`block-${id}`);
            if (el) {
                const rect = el.getBoundingClientRect();
                setSlashMenu({ id, x: rect.left, y: rect.top + 30 });
            }
        } else { 
            setSlashMenu(null); 
        }
    };

    const addBlock = (index: number, type: ReportBlock['type'] = 'paragraph', widgetData?: any) => {
        const newBlock: ReportBlock = { 
            id: Math.random().toString(36).substr(2, 9), 
            type, 
            content: '',
            widgetData 
        };
        const newBlocks = [...blocks];
        newBlocks.splice(index + 1, 0, newBlock);
        setBlocks(newBlocks);
        if (type !== 'data-widget') {
            setTimeout(() => document.getElementById(`block-${newBlock.id}`)?.focus(), 10);
        }
        setSlashMenu(null);
    };

    const deleteBlock = (id: string) => {
        if (blocks.length <= 1) return;
        setBlocks(prev => prev.filter(b => b.id !== id));
        setAiMenu(null);
    };

    const setBlockType = (id: string, type: ReportBlock['type'], widgetData?: any) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, type, content: b.content.replace('/', ''), widgetData } : b));
        setSlashMenu(null);
    };

    const handleAiQuickTask = async (id: string, task: any) => {
        setIsAiLoading(true);
        const block = blocks.find(b => b.id === id);
        if (block) {
            try {
                const result = await aiEditorTask(task, block.content);
                handleBlockChange(id, result);
                setAiMenu(null);
            } catch (e) {
                console.error("AI Task failed", e);
            }
        }
        setIsAiLoading(false);
    };

    const handleSelectionTask = async (task: any) => {
        // Advanced: This would require replacing the selection range. 
        // For this demo, we'll just log or alert as implementing robust selection replacement is complex.
        // But to make it functional for the demo:
        console.log("Processing selection task:", task);
        // We can find the active block and replace content if simple enough
        if (activeBlockId && selectionMenu) {
             handleAiQuickTask(activeBlockId, task); // Fallback to block level for robustness in demo
             setSelectionMenu(null);
        }
    };

    const runCustomRefine = async (id: string) => {
        if (!aiInput.trim()) return;
        setIsAiLoading(true);
        const block = blocks.find(b => b.id === id);
        if (block) {
            const refined = await enhanceReportContent(block.content, aiInput);
            handleBlockChange(id, refined);
            setAiInput('');
            setAiMenu(null);
        }
        setIsAiLoading(false);
    };

    const toggleAiMenu = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (aiMenu?.id === id) {
            setAiMenu(null);
        } else {
            const rect = e.currentTarget.getBoundingClientRect();
            setAiMenu({ id, x: rect.left - 300, y: rect.top });
        }
    };

    // Calculate dynamic score
    const contentScore = Math.min(100, Math.max(20, blocks.reduce((acc, b) => acc + (b.content.length > 20 ? 5 : 0), 0)));

    return (
        <div className="flex flex-col h-full w-full bg-white relative overflow-hidden" onClick={() => { setSlashMenu(null); setAiMenu(null); }}>
            <div className={`flex-1 flex h-full border-r border-slate-100 transition-all`}>
                
                {/* Main Editor Area */}
                <div className="flex-1 flex flex-col h-full relative">
                    {/* Header stuck to top of editor area */}
                    <header className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-white shrink-0 sticky top-0 z-30">
                        <div className="flex items-center gap-4">
                            <button onClick={onBack} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors"><ArrowLeft size={20} /></button>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{report.standard} • {report.classification}</span>
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${status === 'approved' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                                    <select 
                                        value={status} 
                                        onChange={(e) => setStatus(e.target.value as ReportStatus)}
                                        className="text-xs font-black text-slate-600 bg-transparent border-none p-0 focus:ring-0 cursor-pointer uppercase tracking-widest"
                                    >
                                        <option value="draft">ร่าง</option>
                                        <option value="review">รอตรวจสอบ</option>
                                        <option value="approved">อนุมัติ</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        {/* Live Score Indicator */}
                        <div className="hidden md:flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Compliance Score</span>
                            <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-1000 ${contentScore > 80 ? 'bg-emerald-500' : contentScore > 50 ? 'bg-amber-500' : 'bg-red-500'}`} 
                                    style={{ width: `${contentScore}%` }}
                                ></div>
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-600">{contentScore}%</span>
                        </div>

                        <div className="flex items-center gap-3">
                            <button 
                                onClick={handleAudit}
                                className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-4 py-2 rounded-xl text-xs font-black hover:bg-indigo-100 transition-all flex items-center gap-2 uppercase tracking-widest"
                            >
                                <Shield size={14} /> Audit
                            </button>
                            <button 
                                onClick={() => setCopilotOpen(!copilotOpen)}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 uppercase tracking-widest border ${copilotOpen ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-white text-slate-500 border-slate-200'}`}
                            >
                                <Sparkles size={14} /> Copilot
                            </button>
                            <button onClick={handleManualSave} className="bg-nt-dark text-white px-5 py-2 rounded-xl text-xs font-black shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2 uppercase tracking-widest">
                                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} บันทึก
                            </button>
                        </div>
                    </header>

                    <div className="flex-1 overflow-y-auto bg-slate-50/20" ref={editorRef}>
                        <div className="max-w-3xl mx-auto py-16 px-12 bg-white shadow-sm min-h-full border-x border-slate-50">
                            <input 
                                type="text" 
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full text-5xl font-black text-slate-900 placeholder-slate-200 border-none focus:ring-0 px-0 mb-12 bg-transparent"
                                placeholder="หัวข้อเอกสาร"
                            />
                            <div className="space-y-1">
                                {blocks.map((block, index) => (
                                    <div key={block.id} className="group relative flex items-start gap-3 -ml-20 pl-20 py-2">
                                        <div className="absolute left-0 top-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                                            <button 
                                                onClick={(e) => toggleAiMenu(block.id, e)} 
                                                className={`p-1.5 rounded-lg transition-colors ${aiMenu?.id === block.id ? 'bg-purple-600 text-white' : 'hover:bg-purple-50 text-slate-300 hover:text-purple-600'}`}
                                            >
                                                <Sparkles size={16} />
                                            </button>
                                            <div className="p-1.5 cursor-grab text-slate-200 hover:text-slate-400"><MoreHorizontal size={16} /></div>
                                        </div>
                                        
                                        <div className="flex-1 min-h-[1.5em] relative">
                                            {/* Block Render Logic */}
                                            {block.type === 'data-widget' ? (
                                                <WidgetBlockRenderer data={block.widgetData || {}} />
                                            ) : (
                                                <>
                                                    {block.type === 'h1' && <input id={`block-${block.id}`} onFocus={() => setActiveBlockId(block.id)} className="w-full text-3xl font-black text-slate-900 border-none focus:ring-0 p-0 bg-transparent mt-6" value={block.content} onChange={(e) => handleBlockChange(block.id, e.target.value)} />}
                                                    {block.type === 'h2' && <input id={`block-${block.id}`} onFocus={() => setActiveBlockId(block.id)} className="w-full text-2xl font-bold text-slate-800 border-none focus:ring-0 p-0 bg-transparent mt-4" value={block.content} onChange={(e) => handleBlockChange(block.id, e.target.value)} />}
                                                    {block.type === 'h3' && <input id={`block-${block.id}`} onFocus={() => setActiveBlockId(block.id)} className="w-full text-xl font-bold text-slate-700 border-none focus:ring-0 p-0 bg-transparent mt-2" value={block.content} onChange={(e) => handleBlockChange(block.id, e.target.value)} />}
                                                    {block.type === 'paragraph' && <textarea id={`block-${block.id}`} onFocus={() => setActiveBlockId(block.id)} className="w-full text-lg text-slate-600 border-none focus:ring-0 p-0 bg-transparent resize-none leading-relaxed placeholder:text-slate-200" value={block.content} placeholder="พิมพ์ '/' เพื่อเลือกบล็อก..." onChange={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; handleBlockChange(block.id, e.target.value); }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addBlock(index); } }} rows={1} />}
                                                    {block.type === 'bullet' && <div className="flex items-start gap-4"><div className="w-2 h-2 rounded-full bg-slate-300 mt-3 shrink-0" /><input id={`block-${block.id}`} onFocus={() => setActiveBlockId(block.id)} className="w-full text-lg text-slate-600 border-none focus:ring-0 p-0 bg-transparent" value={block.content} onChange={(e) => handleBlockChange(block.id, e.target.value)} /></div>}
                                                    {block.type === 'todo' && <div className="flex items-start gap-4"><input type="checkbox" checked={block.checked} onChange={() => setBlocks(prev => prev.map(b => b.id === block.id ? {...b, checked: !b.checked} : b))} className="mt-2 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 w-5 h-5" /><input id={`block-${block.id}`} onFocus={() => setActiveBlockId(block.id)} className={`w-full text-lg border-none focus:ring-0 p-0 bg-transparent ${block.checked ? 'text-slate-300 line-through' : 'text-slate-600'}`} value={block.content} onChange={(e) => handleBlockChange(block.id, e.target.value)} /></div>}
                                                    {block.type === 'code' && <textarea id={`block-${block.id}`} onFocus={() => setActiveBlockId(block.id)} className="w-full bg-slate-900 text-emerald-400 p-6 rounded-2xl font-mono text-sm border-none focus:ring-0 resize-none leading-relaxed" value={block.content} onChange={(e) => handleBlockChange(block.id, e.target.value)} rows={block.content.split('\n').length || 3} />}
                                                    {block.type === 'ai-insight' && (
                                                        <div className="bg-indigo-50 border-l-4 border-indigo-500 p-6 rounded-2xl my-4 relative overflow-hidden group/ai">
                                                            <div className="absolute top-2 right-2 opacity-0 group-hover/ai:opacity-100 transition-opacity"><Wand2 size={14} className="text-indigo-300" /></div>
                                                            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Sparkles size={12} /> ข้อมูลสังเคราะห์จาก AI</div>
                                                            <textarea id={`block-${block.id}`} onFocus={() => setActiveBlockId(block.id)} className="w-full bg-transparent border-none focus:ring-0 p-0 text-indigo-900 font-medium text-sm leading-relaxed resize-none" value={block.content} onChange={(e) => handleBlockChange(block.id, e.target.value)} />
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            
                                            {isAiLoading && aiMenu?.id === block.id && (
                                                <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center rounded-lg z-10">
                                                    <Loader2 className="animate-spin text-purple-600" size={24} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Copilot Sidebar */}
                {copilotOpen && (
                    <div className="w-80 bg-white border-l border-slate-200 h-full flex flex-col animate-slide-in-right z-20 shadow-xl">
                        <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-white to-purple-50">
                            <h3 className="font-black text-xs uppercase tracking-widest text-purple-600 flex items-center gap-2">
                                <Sparkles size={14} /> AI Copilot
                            </h3>
                            <p className="text-[10px] text-slate-400 mt-1">ผู้ช่วยอัจฉริยะ (Real-time)</p>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-100">
                            <button 
                                onClick={() => setActiveTab('context')}
                                className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${activeTab === 'context' ? 'text-purple-600 border-purple-600 bg-purple-50/50' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
                            >
                                Context & Tools
                            </button>
                            <button 
                                onClick={() => setActiveTab('chat')}
                                className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${activeTab === 'chat' ? 'text-purple-600 border-purple-600 bg-purple-50/50' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
                            >
                                Chat with Doc
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            
                            {/* TAB 1: Context & Suggestions */}
                            {activeTab === 'context' && (
                                <>
                                {isCopilotThinking ? (
                                    <div className="flex flex-col items-center justify-center py-10 opacity-50">
                                        <Loader2 className="animate-spin text-purple-400 mb-2" size={24} />
                                        <span className="text-[10px] uppercase font-bold text-slate-400">AI กำลังวิเคราะห์...</span>
                                    </div>
                                ) : (
                                    <>
                                        {/* ISO Context */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">มาตรฐานที่เกี่ยวข้อง</span>
                                                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{report.standard}</span>
                                            </div>
                                            {isoContext.length > 0 ? (
                                                <div className="space-y-2">
                                                    {isoContext.map((iso, i) => (
                                                        <div key={i} className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800">
                                                            <div className="font-bold mb-1 flex items-center gap-1.5"><Shield size={10} /> {iso.code}</div>
                                                            <div className="leading-relaxed opacity-90">{iso.title}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="p-4 border-2 border-dashed border-slate-100 rounded-xl text-center">
                                                    <span className="text-[10px] text-slate-300">คลิกที่ย่อหน้าเพื่อดูบริบท</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Suggestions */}
                                        {suggestions.length > 0 && (
                                            <div className="space-y-3 pt-4 border-t border-slate-50">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">คำแนะนำการเขียน</span>
                                                <div className="space-y-2">
                                                    {suggestions.map((s, i) => (
                                                        <div key={i} className="p-3 bg-purple-50 border border-purple-100 rounded-xl text-xs text-purple-800 flex gap-2">
                                                            <Lightbulb size={12} className="shrink-0 mt-0.5 text-purple-500" />
                                                            <span className="leading-relaxed">{s}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Quick Actions */}
                                        <div className="space-y-3 pt-4 border-t border-slate-50">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">เครื่องมือด่วน</span>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button 
                                                    onClick={() => {
                                                        const idx = blocks.findIndex(b => b.id === activeBlockId);
                                                        addBlock(idx !== -1 ? idx : blocks.length - 1, 'data-widget', { title: 'Energy Trend', type: 'chart' });
                                                    }}
                                                    className="p-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-50 hover:border-blue-200 flex flex-col items-center gap-1 transition-all"
                                                >
                                                    <TrendingUp size={16} className="text-blue-500" />
                                                    <span>Insert Trend</span>
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        const idx = blocks.findIndex(b => b.id === activeBlockId);
                                                        addBlock(idx !== -1 ? idx : blocks.length - 1, 'data-widget', { title: 'Compliance Summary', type: 'summary' });
                                                    }}
                                                    className="p-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-50 hover:border-emerald-200 flex flex-col items-center gap-1 transition-all"
                                                >
                                                    <PieChart size={16} className="text-emerald-500" />
                                                    <span>Insert Stats</span>
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                                </>
                            )}

                            {/* TAB 2: Chat with Doc */}
                            {activeTab === 'chat' && (
                                <div className="flex flex-col h-full">
                                    <div className="flex-1 overflow-y-auto space-y-3 pb-4">
                                        {chatMessages.length === 0 && (
                                            <div className="text-center text-slate-400 text-xs py-10 italic">
                                                ถามคำถามเกี่ยวกับรายงานนี้ได้เลย...
                                            </div>
                                        )}
                                        {chatMessages.map((msg, i) => (
                                            <div key={i} className={`p-3 rounded-xl text-xs leading-relaxed ${
                                                msg.role === 'user' ? 'bg-slate-100 text-slate-700 ml-4' : 'bg-purple-50 text-purple-800 border border-purple-100 mr-4'
                                            }`}>
                                                {msg.text}
                                            </div>
                                        ))}
                                        {isChatLoading && (
                                            <div className="flex items-center gap-2 text-slate-400 text-xs pl-2">
                                                <Loader2 size={12} className="animate-spin" /> กำลังอ่านเอกสาร...
                                            </div>
                                        )}
                                    </div>
                                    <form onSubmit={handleChatSubmit} className="pt-2 border-t border-slate-100">
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                value={chatInput}
                                                onChange={(e) => setChatInput(e.target.value)}
                                                placeholder="พิมพ์คำถาม..." 
                                                className="w-full text-xs p-3 pr-10 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-300 outline-none"
                                            />
                                            <button 
                                                type="submit" 
                                                disabled={!chatInput.trim() || isChatLoading}
                                                className="absolute right-2 top-2 p-1 text-purple-600 hover:bg-purple-100 rounded-lg transition-all disabled:opacity-50"
                                            >
                                                <ChevronRight size={18} />
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Selection Menu (Floating) */}
            {selectionMenu && (
                <div 
                    className="fixed z-[120] bg-slate-900 text-white rounded-lg shadow-xl py-1 px-1 flex gap-1 items-center animate-fade-in-up"
                    style={{ left: selectionMenu.x, top: selectionMenu.y }}
                    onMouseDown={(e) => e.stopPropagation()} 
                >
                    <button onClick={() => handleSelectionTask('improve')} className="hover:bg-white/20 px-2 py-1 rounded text-xs font-medium flex items-center gap-1"><Sparkles size={10} /> ปรับปรุง</button>
                    <button onClick={() => handleSelectionTask('shorten')} className="hover:bg-white/20 px-2 py-1 rounded text-xs font-medium">ย่อความ</button>
                    <button onClick={() => handleSelectionTask('formal')} className="hover:bg-white/20 px-2 py-1 rounded text-xs font-medium">ทางการ</button>
                </div>
            )}

            {/* Tiptap-style Slash Menu */}
            {slashMenu && (
                <div className="fixed bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-100 p-2 w-64 z-[100] animate-fade-in-up ring-1 ring-black/5" style={{ left: slashMenu.x, top: slashMenu.y }}>
                    <div className="px-3 py-2 text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">บล็อกโครงสร้าง</div>
                    <button onClick={() => setBlockType(slashMenu.id, 'h1')} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"><TypeIcon size={14} className="text-slate-400" /> หัวข้อ 1</button>
                    <button onClick={() => setBlockType(slashMenu.id, 'h2')} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"><TypeIcon size={14} className="text-slate-400 scale-90" /> หัวข้อ 2</button>
                    <button onClick={() => setBlockType(slashMenu.id, 'bullet')} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"><List size={14} className="text-slate-400" /> รายการ</button>
                    <button onClick={() => setBlockType(slashMenu.id, 'todo')} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"><CheckSquare size={14} className="text-slate-400" /> รายการตรวจสอบ</button>
                    <button onClick={() => setBlockType(slashMenu.id, 'code')} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"><Code size={14} className="text-slate-400" /> โค้ด</button>
                    <div className="h-px bg-slate-100 my-2 mx-2" />
                    <button onClick={() => setBlockType(slashMenu.id, 'ai-insight')} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-black text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"><Sparkles size={14} className="text-indigo-400" /> บล็อก AI Insight</button>
                    <button onClick={() => setBlockType(slashMenu.id, 'data-widget', { title: 'Data Widget', type: 'chart' })} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-black text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><BarChart3 size={14} className="text-blue-400" /> วิดเจ็ตข้อมูล (Smart Data)</button>
                </div>
            )}

            {/* AI Power Menu (Floating Editor Tool) */}
            {aiMenu && (
                <div 
                    className="fixed bg-white rounded-2xl shadow-2xl border border-purple-100 p-3 w-80 z-[110] animate-fade-in-up"
                    style={{ left: aiMenu.x, top: aiMenu.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center gap-2 mb-3 px-1">
                        <Sparkles size={14} className="text-purple-600" />
                        <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">เครื่องมืออัจฉริยะ AI</span>
                    </div>
                    
                    <div className="space-y-1 mb-4">
                        <button onClick={() => handleAiQuickTask(aiMenu.id, 'improve')} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 rounded-lg transition-colors"><Edit3 size={14} className="text-purple-400" /> ปรับปรุงงานเขียน</button>
                        <button onClick={() => handleAiQuickTask(aiMenu.id, 'formal')} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 rounded-lg transition-colors"><Scale size={14} className="text-purple-400" /> ทำให้เป็นทางการ</button>
                        <button onClick={() => handleAiQuickTask(aiMenu.id, 'shorten')} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 rounded-lg transition-colors"><AlignLeft size={14} className="text-purple-400 rotate-90" /> ทำให้สั้นลง</button>
                        <button onClick={() => handleAiQuickTask(aiMenu.id, 'longer')} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 rounded-lg transition-colors"><AlignLeft size={14} className="text-purple-400" /> ขยายความ</button>
                        <button onClick={() => handleAiQuickTask(aiMenu.id, 'bullet')} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 rounded-lg transition-colors"><List size={14} className="text-purple-400" /> แปลงเป็นรายการ</button>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                        <div className="relative mb-2">
                             <input 
                                autoFocus 
                                type="text" 
                                placeholder="คำสั่งเพิ่มเติม..." 
                                className="w-full text-xs p-3 pr-10 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-300 outline-none font-medium text-slate-900" 
                                value={aiInput} 
                                onChange={(e) => setAiInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && runCustomRefine(aiMenu.id)}
                            />
                            <button 
                                onClick={() => runCustomRefine(aiMenu.id)}
                                className="absolute right-2 top-2 p-1 text-purple-600 hover:bg-purple-100 rounded-lg transition-all"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                        <div className="flex justify-between items-center px-1">
                            <button onClick={() => deleteBlock(aiMenu.id)} className="text-[10px] text-red-400 hover:text-red-600 font-bold flex items-center gap-1 uppercase tracking-tighter">
                                <Trash2 size={12} /> ลบบล็อก
                            </button>
                            <span className="text-[9px] text-slate-400 font-mono">ขับเคลื่อนโดย Gemini-3</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Audit Modal (Now separated from sidebar) */}
            <Modal isOpen={isAuditModalOpen} onClose={() => setIsAuditModalOpen(false)} title="ผลการตรวจสอบมาตรฐาน (Compliance Audit)">
                <div className="p-6">
                    {auditLoading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                            <span className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">กำลังตรวจสอบความสอดคล้องกับ {report.standard}...</span>
                        </div>
                    ) : auditData ? (
                        <div className="space-y-8">
                            <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-2xl">
                                <div className="text-center">
                                    <div className={`text-5xl font-black ${auditData.score > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{auditData.score}%</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">คะแนนรวม</div>
                                </div>
                                <div className="h-16 w-px bg-slate-200"></div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-800 mb-2">สรุปผลการตรวจสอบ</h4>
                                    <p className="text-sm text-slate-600">{auditData.score > 80 ? 'เอกสารมีความสอดคล้องสูง พร้อมสำหรับการอนุมัติ' : 'พบข้อบกพร่องบางประการที่ควรแก้ไขก่อนดำเนินการต่อ'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><CheckCircle size={16} className="text-emerald-500"/> ข้อดีที่พบ</h4>
                                    <ul className="space-y-2">
                                        {auditData.findings.map((f, i) => (
                                            <li key={i} className="text-xs text-slate-600 bg-emerald-50 p-2 rounded-lg border border-emerald-100">{f}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><AlertCircle size={16} className="text-amber-500"/> ข้อเสนอแนะ</h4>
                                    <ul className="space-y-2">
                                        {auditData.recommendations.map((r, i) => (
                                            <li key={i} className="text-xs text-slate-600 bg-amber-50 p-2 rounded-lg border border-amber-100">{r}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </Modal>
        </div>
    );
};
