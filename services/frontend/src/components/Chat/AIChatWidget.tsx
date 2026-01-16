
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { sendChatMessage } from '../../services/geminiService';
import { ChatMessage, Branch, Alert } from '../../types';
import { GenerativeUIRenderer } from './GenerativeComponents';

interface AIChatWidgetProps {
    branches: Branch[];
    alerts: Alert[];
    currentBranchId: string | null;
    activeView: 'map' | 'utility' | 'intelligence' | 'settings' | 'reports' | 'leases' | 'maintenance' | 'assets' | 'predictive' | 'inventory';
    onNavigateBranch: (branchId: string) => void;
    onChangeView: (view: 'map' | 'utility' | 'intelligence' | 'settings' | 'reports' | 'leases' | 'maintenance' | 'assets' | 'predictive' | 'inventory') => void;
    onOpen3D: (branch: Branch) => void;
    token?: string; // Authentication token for RAG context
}

export const AIChatWidget: React.FC<AIChatWidgetProps> = ({
    branches,
    alerts,
    currentBranchId,
    activeView,
    onNavigateBranch,
    onChangeView,
    onOpen3D,
    token
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'model',
      text: 'สวัสดีครับ! ผมคือผู้ช่วยอัจฉริยะฝ่ายปฏิบัติการ NT (AIOps Agent) ผมสามารถควบคุมการนำทาง เปิดโมเดล 3 มิติ และสร้างรายงานสรุปได้ครับ',
      timestamp: new Date()
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'th-TH'; // Thai Language

        recognitionRef.current.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(transcript);
            handleSubmit(undefined, transcript);
        };

        recognitionRef.current.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setIsListening(false);
        };

        recognitionRef.current.onend = () => {
            setIsListening(false);
        };
    }
  }, []);

  // Handle Text-to-Speech for Model Responses
  useEffect(() => {
    if (audioEnabled && messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.role === 'model' && !isLoading) {
            speak(lastMsg.text);
        }
    }
  }, [messages, audioEnabled, isLoading]);

  const speak = (text: string) => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'th-TH'; 
      window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
      if (isListening) {
          recognitionRef.current?.stop();
          setIsListening(false);
      } else {
          try {
            window.speechSynthesis.cancel();
            recognitionRef.current?.start();
            setIsListening(true);
            setAudioEnabled(true); 
          } catch (e) {
            console.error("Mic start failed", e);
          }
      }
  };

  const handleSubmit = async (e?: React.FormEvent, overrideInput?: string) => {
    if (e) e.preventDefault();
    
    const textToSend = overrideInput || input;
    if (!textToSend.trim() || isLoading) return;

    // 1. Add User Message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // 2. Call Service with Context (including RAG context via token)
      const context = { branches, alerts, currentBranchId, currentView: activeView };
      const response = await sendChatMessage(userMsg.text, messages, context, token);
      
      // 3. Process Actions
      if (response.actions) {
          response.actions.forEach(action => {
              if (action.type === 'NAVIGATE_BRANCH' && action.payload) {
                  onNavigateBranch(action.payload);
              }
              if (action.type === 'CHANGE_VIEW' && action.payload) {
                  onChangeView(action.payload);
              }
              if (action.type === 'OPEN_3D_MODE' && action.payload) {
                  onOpen3D(action.payload);
              }
          });
      }

      // 4. Add Model Message with UI Payload
      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
        timestamp: new Date(),
        uiPayload: response.ui
      };
      setMessages(prev => [...prev, modelMsg]);

    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'model',
          text: "ขออภัย เกิดข้อผิดพลาดในการประมวลผลคำขอของคุณ", 
          timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none ${isOpen ? 'pointer-events-auto' : ''}`}>
      {/* Chat Window */}
      <div 
        className={`
          bg-white w-80 sm:w-96 rounded-2xl shadow-2xl border border-gray-200 overflow-hidden 
          transition-all duration-300 origin-bottom-right mb-4 pointer-events-auto
          flex flex-col
          ${isOpen ? 'scale-100 opacity-100 translate-y-0 h-[600px]' : 'scale-90 opacity-0 translate-y-10 h-0'}
        `}
      >
        {/* Header */}
        <div className="bg-nt-dark p-4 flex items-center justify-between text-white shadow-md z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-nt-yellow flex items-center justify-center shadow-sm">
              <Bot className="w-5 h-5 text-nt-dark" />
            </div>
            <div>
              <h3 className="font-bold text-sm">ผู้ช่วยปฏิบัติการ NT</h3>
              <p className="text-[10px] text-gray-300 uppercase tracking-wider">ระบบ AI บูรณาการ • v1.4</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <button 
               onClick={() => {
                 setAudioEnabled(!audioEnabled);
                 if(audioEnabled) window.speechSynthesis.cancel();
               }} 
               className={`p-1.5 rounded transition-colors ${audioEnabled ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'}`}
               title="เปิด/ปิดการตอบกลับด้วยเสียง"
             >
                {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
             </button>
             <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded transition-colors">
               <X className="w-5 h-5" />
             </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              
              {/* Message Bubble */}
              <div 
                className={`
                  max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm
                  ${msg.role === 'user' 
                    ? 'bg-nt-yellow text-nt-dark rounded-br-none' 
                    : 'bg-white text-gray-700 border border-gray-100 rounded-bl-none'}
                `}
              >
                {msg.text}
              </div>

              {/* Generative UI Container */}
              {msg.role === 'model' && msg.uiPayload && (
                  <div className="mt-2 w-full max-w-[85%] animate-fade-in-up">
                      <GenerativeUIRenderer 
                        payload={msg.uiPayload} 
                        onNavigate={(id) => onNavigateBranch(id)}
                        onChangeView={onChangeView}
                      />
                  </div>
              )}
              
              {/* Timestamp */}
              <span className="text-[10px] text-gray-400 mt-1 px-1">
                  {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          ))}
          
          {isLoading && (
             <div className="flex justify-start">
               <div className="bg-white text-gray-500 rounded-2xl rounded-bl-none px-4 py-3 text-sm border border-gray-100 flex items-center gap-2 shadow-sm">
                 <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                 <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-75"></div>
                 <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-150"></div>
               </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 bg-white border-t border-gray-100 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
             {isListening && (
                <div className="text-xs text-center text-blue-500 mb-2 animate-pulse font-medium">
                    กำลังฟัง... (Listening)
                </div>
            )}
            <form onSubmit={(e) => handleSubmit(e)} className="flex gap-2 text-slate-800">
                <button
                    type="button"
                    onClick={toggleListening}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isListening 
                        ? 'bg-red-500 text-white shadow-lg scale-110' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="พิมพ์ข้อความหรือใช้เสียง..." 
                    className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nt-yellow/50 transition-shadow"
                />
                <button 
                    type="submit" 
                    disabled={isLoading || !input.trim()}
                    className="w-10 h-10 bg-nt-dark text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                <Send className="w-4 h-4 ml-0.5" />
                </button>
            </form>
        </div>
      </div>

      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-nt-yellow hover:bg-yellow-400 text-nt-dark rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 pointer-events-auto group"
      >
        <MessageSquare className="w-7 h-7 group-hover:rotate-12 transition-transform" />
      </button>
    </div>
  );
};
