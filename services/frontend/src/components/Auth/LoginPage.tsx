
import React, { useState } from 'react';
import { ShieldCheck, Lock, User, AlertCircle, ArrowRight, Check } from 'lucide-react';

interface LoginPageProps {
  onLogin: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (email === 'admin@ntplc.co.th' && password === 'Admin123!') {
      onLogin();
    } else {
      setError('Invalid credentials. Please contact IT Support.');
      setIsLoading(false);
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
      e.preventDefault();
      setForgotSent(true);
      setTimeout(() => setForgotSent(false), 3000);
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,215,0,0.1),transparent_70%)]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/5 rounded-full"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/5 rounded-full"></div>
      </div>

      <div className="w-full max-w-md z-10 px-6">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/10 relative">
          
          {/* Header */}
          <div className="bg-nt-dark p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-nt-yellow"></div>
            <div className="inline-flex items-center justify-center w-16 h-16 bg-nt-yellow rounded-xl mb-4 shadow-lg text-nt-dark">
               <ShieldCheck size={32} strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Facility Manager 3D</h1>
            <p className="text-gray-400 text-sm">National Telecom Public Company Ltd.</p>
          </div>

          {/* Forgot Password Toast */}
          {forgotSent && (
             <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-bold animate-fade-in-up z-20">
                <Check size={14} /> Reset link sent to email!
             </div>
          )}

          {/* Form */}
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-start gap-3 animate-fade-in-up">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Corporate ID</label>
                <div className="relative group">
                  <User className="absolute left-3 top-3 w-5 h-5 text-gray-400 group-focus-within:text-nt-dark transition-colors" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-10 pr-4 text-slate-800 focus:outline-none focus:ring-2 focus:ring-nt-yellow focus:border-transparent transition-all"
                    placeholder="admin@ntplc.co.th"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400 group-focus-within:text-nt-dark transition-colors" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-10 pr-4 text-slate-800 focus:outline-none focus:ring-2 focus:ring-nt-yellow focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300 text-nt-dark focus:ring-nt-yellow" />
                  Remember device
                </label>
                <button onClick={handleForgotPassword} className="text-blue-600 hover:underline">Forgot password?</button>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-nt-dark hover:bg-slate-800 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
          
          <div className="bg-gray-50 px-8 py-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              Restricted Access System. Monitoring active. <br/>
              Server: <span className="font-mono text-gray-500">NT-HQ-SEC-01</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
