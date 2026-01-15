
import React, { useState } from 'react';
import { ShieldCheck, Lock, User, AlertCircle, ArrowRight, Eye, EyeOff, Server, Globe } from 'lucide-react';

interface LoginPageProps {
  onLogin: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate API Auth
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (email && password) {
      onLogin();
    } else {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center relative overflow-hidden text-slate-800">
      
      {/* Background Image */}
      <div className="absolute inset-0 z-0 opacity-30 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center"></div>

      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/40 pointer-events-none z-0"></div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-grid-slate opacity-10 pointer-events-none z-0" style={{ backgroundSize: '40px 40px', backgroundImage: 'linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)' }}></div>

      {/* Login Card */}
      <div className="w-full max-w-md z-10 px-6 animate-fade-in-up">
        <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative">
          
          {/* Header */}
          <div className="p-8 pb-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-nt-yellow to-yellow-600 rounded-2xl mb-6 shadow-lg shadow-yellow-500/20 transform rotate-3 hover:rotate-6 transition-transform duration-300">
               <ShieldCheck size={32} className="text-nt-dark" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-black text-white mb-2 tracking-tight">NT Facility 3D</h1>
            <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">
                Nationwide Infrastructure Command
            </p>
          </div>

          {/* Form Area */}
          <div className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 p-3 rounded-lg flex items-start gap-3 animate-pulse">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                  <p className="text-sm text-red-200 font-medium">{error}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Corporate Identity</label>
                <div className="relative group">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-nt-yellow transition-colors" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-nt-yellow/50 focus:border-nt-yellow/50 transition-all font-medium"
                    placeholder="admin@ntplc.co.th"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Secure Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-nt-yellow transition-colors" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-12 pr-12 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-nt-yellow/50 focus:border-nt-yellow/50 transition-all font-medium"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3.5 text-slate-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2">
                <label className="flex items-center gap-2 text-slate-400 cursor-pointer hover:text-slate-300 transition-colors">
                  <input type="checkbox" className="rounded border-slate-600 bg-slate-800 text-nt-yellow focus:ring-offset-0 focus:ring-nt-yellow" />
                  <span>Remember device</span>
                </label>
                <button 
                    type="button"
                    onClick={() => setIsForgotPassword(!isForgotPassword)}
                    className="text-nt-yellow/80 hover:text-nt-yellow font-bold hover:underline transition-colors"
                >
                    Forgot password?
                </button>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-nt-yellow hover:bg-yellow-400 text-nt-dark font-black py-3.5 rounded-xl shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 group mt-4"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-3 border-nt-dark/30 border-t-nt-dark rounded-full animate-spin" />
                    <span>AUTHENTICATING...</span>
                  </>
                ) : (
                  <>
                    ACCESS SYSTEM <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
          
          {/* Footer Info */}
          <div className="bg-slate-950/50 px-8 py-4 border-t border-white/5 flex justify-between items-center text-[10px] text-slate-500 font-mono">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                SYSTEM ONLINE
            </div>
            <div>v2.4.0-ENT</div>
          </div>
        </div>

        {/* Floating Badges */}
        <div className="flex justify-center gap-4 mt-8 opacity-60">
            <div className="flex items-center gap-2 text-white/40 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                <Globe size={14} /> <span className="text-[10px] font-bold">ISO 27001</span>
            </div>
            <div className="flex items-center gap-2 text-white/40 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                <Server size={14} /> <span className="text-[10px] font-bold">Encrypted</span>
            </div>
        </div>
      </div>
    </div>
  );
};
