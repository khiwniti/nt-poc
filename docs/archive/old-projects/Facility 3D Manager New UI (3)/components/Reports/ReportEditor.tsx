
import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Save, Sparkles, MoreHorizontal, Shield, Lock, History, FileText, Loader2, Wand2, 
  Type as TypeIcon, List, CheckSquare, X, ChevronRight, AlertCircle, CheckCircle, Zap, Code, 
  ChevronDown, Languages, AlignLeft, Scale, Edit3, Trash2
} from 'lucide-react';
import { ReportDocument, ReportBlock, ReportStatus, ISOStandard } from '../../types';
import { enhanceReportContent, aiEditorTask, runComplianceAudit } from '../../services/geminiService';
import { Modal } from '../ui/Modal';

interface ReportEditorProps {
    report: ReportDocument;
    onSave: (report: ReportDocument) => void;
    onBack: () => void;
}

export const ReportEditor: React.FC<ReportEditorProps> = ({ report, onSave, onBack }) => {
    const [blocks, setBlocks] = useState<ReportBlock[]>(report.blocks);
    const [title, setTitle] = useState(report.title);
    const [status, setStatus] = useState<ReportStatus>(report.status);
    const [isSaving, setIsSaving] = useState(false);
    const [showAuditPanel, setShowAuditPanel] = useState(false);
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditData, setAuditData] = useState<{ score: number, findings: string[], recommendations: string[] } | null>(null);
    const [slashMenu, setSlashMenu] = useState<{ id: string; x: number; y: number } | null>(null);
    const [aiMenu, setAiMenu] = useState<{ id: string; x: number; y: number } | null>(null);
    const [aiInput, setAiInput] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    const editorRef = useRef<HTMLDivElement>(null);

    const handleManualSave = () => {
        setIsSaving(true);
        onSave({ ...report, title, blocks, status, lastModified: new Date() });
        setTimeout(() => setIsSaving(false), 800);
    };

    const handleAudit = async () => {
        setAuditLoading(true);
        setShowAuditPanel(true);
        const content = blocks.map(b => b.content).join('\n');
        try {
            const result = await runComplianceAudit(content, report.standard);
            setAuditData(result);
        } catch (e) { console.error(e); }
        finally { setAuditLoading(false); }
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

    const addBlock = (index: number) => {
        const newBlock: ReportBlock = { id: Math.random().toString(36).substr(2, 9), type: 'paragraph', content: '' };
        const newBlocks = [...blocks];
        newBlocks.splice(index + 1, 0, newBlock);
        setBlocks(newBlocks);
        setTimeout(() => document.getElementById(`block-${newBlock.id}`)?.focus(), 10);
    };

    const deleteBlock = (id: string) => {
        if (blocks.length <= 1) return;
        setBlocks(prev => prev.filter(b => b.id !== id));
        setAiMenu(null);
    };

    const setBlockType = (id: string, type: ReportBlock['type']) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, type, content: b.content.replace('/', '') } : b));
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

    return (
        <div className="flex flex-col h-full w-full bg-white relative overflow-hidden" onClick={() => { setSlashMenu(null); setAiMenu(null); }}>
            <div className={`flex-1 flex flex-col h-full border-r border-slate-100 transition-all ${showAuditPanel ? 'mr-96' : ''}`}>
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
                                    <option value="draft">Draft</option>
                                    <option value="review">Review</option>
                                    <option value="approved">Approved</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleAudit}
                            className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-4 py-2 rounded-xl text-xs font-black hover:bg-indigo-100 transition-all flex items-center gap-2 uppercase tracking-widest"
                        >
                             <Shield size={14} /> Intelligence Audit
                        </button>
                        <button onClick={handleManualSave} className="bg-nt-dark text-white px-5 py-2 rounded-xl text-xs font-black shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2 uppercase tracking-widest">
                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Commit
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto bg-slate-50/20" ref={editorRef}>
                    <div className="max-w-4xl mx-auto py-16 px-12 bg-white shadow-sm min-h-full border-x border-slate-50">
                        <input 
                            type="text" 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full text-5xl font-black text-slate-900 placeholder-slate-200 border-none focus:ring-0 px-0 mb-12 bg-transparent"
                            placeholder="Document Title"
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
                                        {block.type === 'h1' && <input id={`block-${block.id}`} className="w-full text-3xl font-black text-slate-900 border-none focus:ring-0 p-0 bg-transparent mt-6" value={block.content} onChange={(e) => handleBlockChange(block.id, e.target.value)} />}
                                        {block.type === 'h2' && <input id={`block-${block.id}`} className="w-full text-2xl font-bold text-slate-800 border-none focus:ring-0 p-0 bg-transparent mt-4" value={block.content} onChange={(e) => handleBlockChange(block.id, e.target.value)} />}
                                        {block.type === 'h3' && <input id={`block-${block.id}`} className="w-full text-xl font-bold text-slate-700 border-none focus:ring-0 p-0 bg-transparent mt-2" value={block.content} onChange={(e) => handleBlockChange(block.id, e.target.value)} />}
                                        {block.type === 'paragraph' && <textarea id={`block-${block.id}`} className="w-full text-lg text-slate-600 border-none focus:ring-0 p-0 bg-transparent resize-none leading-relaxed placeholder:text-slate-200" value={block.content} placeholder="Type '/' for blocks..." onChange={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; handleBlockChange(block.id, e.target.value); }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addBlock(index); } }} rows={1} />}
                                        {block.type === 'bullet' && <div className="flex items-start gap-4"><div className="w-2 h-2 rounded-full bg-slate-300 mt-3 shrink-0" /><input id={`block-${block.id}`} className="w-full text-lg text-slate-600 border-none focus:ring-0 p-0 bg-transparent" value={block.content} onChange={(e) => handleBlockChange(block.id, e.target.value)} /></div>}
                                        {block.type === 'todo' && <div className="flex items-start gap-4"><input type="checkbox" checked={block.checked} onChange={() => setBlocks(prev => prev.map(b => b.id === block.id ? {...b, checked: !b.checked} : b))} className="mt-2 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 w-5 h-5" /><input id={`block-${block.id}`} className={`w-full text-lg border-none focus:ring-0 p-0 bg-transparent ${block.checked ? 'text-slate-300 line-through' : 'text-slate-600'}`} value={block.content} onChange={(e) => handleBlockChange(block.id, e.target.value)} /></div>}
                                        {block.type === 'code' && <textarea id={`block-${block.id}`} className="w-full bg-slate-900 text-emerald-400 p-6 rounded-2xl font-mono text-sm border-none focus:ring-0 resize-none leading-relaxed" value={block.content} onChange={(e) => handleBlockChange(block.id, e.target.value)} rows={block.content.split('\n').length || 3} />}
                                        {block.type === 'ai-insight' && (
                                            <div className="bg-indigo-50 border-l-4 border-indigo-500 p-6 rounded-2xl my-4 relative overflow-hidden group/ai">
                                                <div className="absolute top-2 right-2 opacity-0 group-hover/ai:opacity-100 transition-opacity"><Wand2 size={14} className="text-indigo-300" /></div>
                                                <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Sparkles size={12} /> AI Synthesized Insight</div>
                                                <textarea id={`block-${block.id}`} className="w-full bg-transparent border-none focus:ring-0 p-0 text-indigo-900 font-medium text-sm leading-relaxed resize-none" value={block.content} onChange={(e) => handleBlockChange(block.id, e.target.value)} />
                                            </div>
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

            {/* Tiptap-style Slash Menu */}
            {slashMenu && (
                <div className="fixed bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-100 p-2 w-64 z-[100] animate-fade-in-up ring-1 ring-black/5" style={{ left: slashMenu.x, top: slashMenu.y }}>
                    <div className="px-3 py-2 text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Structure Blocks</div>
                    <button onClick={() => setBlockType(slashMenu.id, 'h1')} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"><TypeIcon size={14} className="text-slate-400" /> Header 1</button>
                    <button onClick={() => setBlockType(slashMenu.id, 'h2')} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"><TypeIcon size={14} className="text-slate-400 scale-90" /> Header 2</button>
                    <button onClick={() => setBlockType(slashMenu.id, 'bullet')} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"><List size={14} className="text-slate-400" /> Bullet List</button>
                    <button onClick={() => setBlockType(slashMenu.id, 'todo')} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"><CheckSquare size={14} className="text-slate-400" /> Checklist</button>
                    <button onClick={() => setBlockType(slashMenu.id, 'code')} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"><Code size={14} className="text-slate-400" /> Code Snippet</button>
                    <div className="h-px bg-slate-100 my-2 mx-2" />
                    <button onClick={() => setBlockType(slashMenu.id, 'ai-insight')} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-black text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"><Sparkles size={14} className="text-indigo-400" /> AI Insight Block</button>
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
                        <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">AI Intelligence Tools</span>
                    </div>
                    
                    <div className="space-y-1 mb-4">
                        <button onClick={() => handleAiQuickTask(aiMenu.id, 'improve')} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 rounded-lg transition-colors"><Edit3 size={14} className="text-purple-400" /> Improve Writing</button>
                        <button onClick={() => handleAiQuickTask(aiMenu.id, 'formal')} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 rounded-lg transition-colors"><Scale size={14} className="text-purple-400" /> Make it Formal</button>
                        <button onClick={() => handleAiQuickTask(aiMenu.id, 'shorten')} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 rounded-lg transition-colors"><AlignLeft size={14} className="text-purple-400 rotate-90" /> Shorter</button>
                        <button onClick={() => handleAiQuickTask(aiMenu.id, 'longer')} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 rounded-lg transition-colors"><AlignLeft size={14} className="text-purple-400" /> Expand</button>
                        <button onClick={() => handleAiQuickTask(aiMenu.id, 'bullet')} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 rounded-lg transition-colors"><List size={14} className="text-purple-400" /> Simplify to Bullets</button>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                        <div className="relative mb-2">
                             <input 
                                autoFocus 
                                type="text" 
                                placeholder="Custom instruction..." 
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
                                <Trash2 size={12} /> Delete Block
                            </button>
                            <span className="text-[9px] text-slate-400 font-mono">Powered by Gemini-3</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Audit Sidebar */}
            {showAuditPanel && (
                <div className="absolute top-0 right-0 w-96 h-full bg-slate-900 text-white z-40 animate-slide-in-right flex flex-col border-l border-white/5">
                    <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-800/50">
                        <div>
                            <h3 className="font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3 text-indigo-400"><Shield size={16} /> Standard Audit</h3>
                            <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-widest">{report.standard} Framework</p>
                        </div>
                        <button onClick={() => setShowAuditPanel(false)} className="text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                        {auditLoading ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-6">
                                <div className="relative">
                                    <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                                    <Sparkles size={24} className="absolute inset-0 m-auto text-indigo-400 animate-pulse" />
                                </div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Running Compliance Heuristics...</span>
                            </div>
                        ) : auditData ? (
                            <div className="space-y-10 animate-fade-in-up">
                                <div className="text-center bg-white/5 rounded-3xl p-8 border border-white/10 shadow-2xl">
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Readiness Score</div>
                                    <div className={`text-6xl font-black mb-2 ${auditData.score > 80 ? 'text-emerald-400' : auditData.score > 50 ? 'text-amber-400' : 'text-red-400'}`}>
                                        {auditData.score}%
                                    </div>
                                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mt-6">
                                        <div className={`h-full transition-all duration-1000 ${auditData.score > 80 ? 'bg-emerald-400' : auditData.score > 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${auditData.score}%` }} />
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-3"><ChevronRight size={14} /> Detected Findings</h4>
                                    <div className="space-y-4">
                                        {auditData.findings.map((f, i) => (
                                            <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/10 text-xs text-slate-300 leading-relaxed font-medium flex gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                                {f}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-3"><AlertCircle size={14} /> Actionable Gaps</h4>
                                    <div className="space-y-4">
                                        {auditData.recommendations.map((r, i) => (
                                            <div key={i} className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 text-xs text-emerald-100 leading-relaxed font-medium flex gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                                {r}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-center">
                                <Shield size={48} className="text-slate-700 mb-4 opacity-50" />
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Run audit to verify compliance</p>
                            </div>
                        )}
                    </div>

                    <div className="p-8 bg-slate-900 border-t border-white/10">
                        <button className="w-full py-4 bg-indigo-600 text-white font-black text-xs rounded-2xl hover:bg-indigo-700 transition-all uppercase tracking-widest shadow-xl shadow-indigo-900/50">
                            Lock & Request Review
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
