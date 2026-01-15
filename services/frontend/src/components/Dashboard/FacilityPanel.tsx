
import React, { useState, useEffect } from 'react';
import { Branch, WeatherData } from '../../types';
import { Card } from '../ui/Card';
import { Activity, Thermometer, Search, BrainCircuit, TrendingDown, View, Box, Cloud, CloudRain, Sun, Wind, Droplets, CloudLightning, CloudFog, Loader2, Check, Zap, Server } from 'lucide-react';
import { analyzeLocation } from '../../services/geminiService';
import { getLocalWeather } from '../../services/weatherService';

interface FacilityPanelProps {
  branch: Branch;
  onOpen3D: () => void;
}

export const FacilityPanel: React.FC<FacilityPanelProps> = ({ branch, onOpen3D }) => {
  const [mapAnalysis, setMapAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [groundingChunks, setGroundingChunks] = useState<any[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isApplyingSettings, setIsApplyingSettings] = useState(false);
  const [settingsApplied, setSettingsApplied] = useState(false);

  useEffect(() => {
    const loadWeather = async () => {
      setWeather(null);
      if (branch) {
         const data = await getLocalWeather(branch.lat, branch.lng);
         setWeather(data);
      }
    };
    loadWeather();
  }, [branch]);

  const handleAnalyzeLocation = async () => {
    setIsLoading(true);
    setMapAnalysis(null);
    setGroundingChunks([]);
    const query = `Analyze location ${branch.name}`;
    const result = await analyzeLocation(query, branch.lat, branch.lng);
    setMapAnalysis(result.text);
    if(result.chunks) setGroundingChunks(result.chunks);
    setIsLoading(false);
  };

  const handleApplySettings = () => {
    setIsApplyingSettings(true);
    setTimeout(() => {
        setIsApplyingSettings(false);
        setSettingsApplied(true);
    }, 1500);
  };

  const getWeatherIcon = (condition: string) => {
    if (condition.includes('Rain') || condition.includes('Drizzle')) return <CloudRain className="w-10 h-10 text-blue-400" />;
    if (condition.includes('Storm') || condition.includes('Thunder')) return <CloudLightning className="w-10 h-10 text-purple-500" />;
    if (condition.includes('Fog')) return <CloudFog className="w-10 h-10 text-gray-400" />;
    if (condition.includes('Cloud')) return <Cloud className="w-10 h-10 text-gray-400" />;
    return <Sun className="w-10 h-10 text-orange-400" />;
  };

  return (
    <div className="h-full flex flex-col gap-5 overflow-y-auto pr-2 text-slate-800">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <h2 className="text-3xl font-bold text-nt-dark flex items-center gap-3">
            <span className="w-2 h-8 bg-nt-yellow rounded-sm"></span>
            {branch.name}
          </h2>
          <p className="text-slate-600 text-sm font-medium ml-5 mt-1">Data Center (Tier 3)</p>
        </div>
        <div className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide shadow-sm ${
          branch.status === 'operational' ? 'bg-green-100 text-green-700' :
          branch.status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {branch.status === 'operational' ? 'ปกติ' : branch.status === 'warning' ? 'แจ้งเตือน' : 'วิกฤต'}
        </div>
      </div>

      {/* Intelligence Alert - Anomaly Context */}
      {branch.status === 'critical' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-4 animate-pulse shadow-sm">
              <BrainCircuit className="text-red-600 shrink-0 mt-1 w-6 h-6" />
              <p className="text-xs text-red-800 font-bold leading-relaxed">
                  ระบบ SCADA ตรวจพบความผิดปกติในระบบปรับอากาศ (HVAC) คาดว่าจะสูญเสียประสิทธิภาพ 42% แนะนำให้เข้าตรวจสอบทันที
              </p>
            </div>
      )}

      {/* Weather Widget */}
      <Card title="สภาพอากาศท้องถิ่น (Real-time)">
        {weather ? (
          <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-4">
                  {getWeatherIcon(weather.condition)}
                  <div>
                      <div className="text-4xl font-bold text-slate-800 tracking-tight">{weather.temperature}°C</div>
                      <div className="text-sm text-slate-600 font-medium mt-1">{weather.condition}</div>
                  </div>
              </div>
              <div className="space-y-2 text-right">
                  <div className="flex items-center justify-end gap-2 text-sm text-slate-600 font-medium">
                      <Wind size={16} className="text-blue-500" /> 
                      <span className="font-mono font-bold text-slate-800">{weather.windSpeed}</span> km/h
                  </div>
                  <div className="flex items-center justify-end gap-2 text-sm text-slate-600 font-medium">
                      <Droplets size={16} className="text-cyan-500" /> 
                      <span className="font-mono font-bold text-slate-800">{weather.humidity}</span>%
                  </div>
              </div>
          </div>
        ) : (
          <div className="flex items-center justify-between animate-pulse">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="space-y-2">
                   <div className="w-24 h-8 bg-gray-200 rounded"></div>
                   <div className="w-16 h-4 bg-gray-200 rounded"></div>
                </div>
             </div>
             <div className="space-y-2">
                <div className="w-20 h-4 bg-gray-200 rounded"></div>
                <div className="w-20 h-4 bg-gray-200 rounded"></div>
             </div>
          </div>
        )}
      </Card>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="flex flex-col items-center justify-center p-6 bg-blue-50 border-blue-100">
          <Zap className="w-8 h-8 text-blue-600 mb-3" />
          <span className="text-3xl font-bold text-slate-900">{branch.metrics.powerUsage}</span>
          <span className="text-sm text-slate-600 font-medium mt-1">Power Load (kW)</span>
        </Card>
        <Card className="flex flex-col items-center justify-center p-6 bg-red-50 border-red-100">
          <Thermometer className="w-8 h-8 text-red-600 mb-3" />
          <span className="text-3xl font-bold text-slate-900">{branch.metrics.temperature}°C</span>
          <span className="text-sm text-slate-600 font-medium mt-1">Rack Inlet Temp</span>
        </Card>
      </div>

      {/* Power Source Status */}
      <div className="grid grid-cols-2 gap-4">
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 flex flex-col items-center shadow-sm">
              <span className="text-xs text-emerald-700 font-bold uppercase mb-2 tracking-wide">Utility (MEA/PEA)</span>
              <span className="text-base font-black text-emerald-800 flex items-center gap-2"><Zap size={16} fill="currentColor"/> Active</span>
          </div>
          <div className="bg-slate-100 rounded-xl p-4 border border-slate-200 flex flex-col items-center shadow-sm">
              <span className="text-xs text-slate-500 font-bold uppercase mb-2 tracking-wide">Generator</span>
              <span className="text-base font-black text-slate-600 flex items-center gap-2"><Server size={16}/> Standby</span>
          </div>
      </div>

      {/* AI Recommendation Card */}
      <Card className="bg-emerald-700 text-white border-none overflow-hidden relative group shadow-lg">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:rotate-12 transition-transform">
              <TrendingDown size={80} />
          </div>
          <div className="relative z-10 p-2">
              <h4 className="text-xs font-bold uppercase tracking-widest opacity-90 mb-2 flex items-center gap-2">
                  <BrainCircuit size={16} /> คำแนะนำเพื่อประสิทธิภาพ
              </h4>
              <p className="text-sm font-medium leading-relaxed opacity-100">
                  ปรับอุณหภูมิ CRAC Unit เป็น 24.5°C ช่วงเวลา 10:00-12:00 เพื่อประหยัดพลังงาน <span className="font-black text-emerald-200 text-base">12.4 kWh</span> วันนี้
              </p>
              <button 
                onClick={handleApplySettings}
                disabled={isApplyingSettings || settingsApplied}
                className="mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-all flex items-center gap-2 disabled:cursor-not-allowed shadow-inner backdrop-blur-sm w-full justify-center"
              >
                  {isApplyingSettings ? (
                      <><Loader2 size={14} className="animate-spin" /> กำลังปรับค่า...</>
                  ) : settingsApplied ? (
                      <><Check size={14} /> ปรับค่าเรียบร้อย</>
                  ) : (
                      "ใช้ค่าตั้งค่าอัตโนมัติ"
                  )}
              </button>
          </div>
      </Card>
      
      {/* 3D Digital Twin Trigger */}
      <Card title="ข้อมูลโครงสร้างพื้นฐาน">
         <button 
            onClick={onOpen3D}
            className="w-full flex items-center justify-center gap-3 bg-nt-dark text-white hover:bg-slate-800 py-4 px-6 rounded-xl transition-all shadow-md group border border-slate-700"
        >
            <Box className="w-6 h-6 group-hover:rotate-12 transition-transform text-nt-yellow" />
            <span className="font-bold text-sm">เปิดระบบตรวจสอบยูนิต 3 มิติ (Digital Twin)</span>
        </button>
      </Card>

      <Card title="การวิเคราะห์ตำแหน่งเชิงพื้นที่" className="flex-1 min-h-[250px] flex flex-col">
        <div className="flex flex-col gap-4 h-full">
            <button 
                onClick={handleAnalyzeLocation}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 py-3 px-4 rounded-xl transition-colors shadow-sm disabled:opacity-50 font-bold text-sm"
            >
                {isLoading ? <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div> : <Search className="w-5 h-5" />}
                <span>รันการตรวจสอบพลังงาน (Audit)</span>
            </button>
            
            <div className="flex-1 overflow-y-auto overflow-x-auto bg-slate-50 rounded-xl p-4 text-sm leading-relaxed text-slate-700 border border-slate-200 max-h-80 scrollbar-thin scrollbar-thumb-slate-300 shadow-inner">
                {mapAnalysis ? (
                    <div className="flex flex-col gap-4">
                        <div className="markdown prose prose-sm prose-slate break-words max-w-none">
                            {mapAnalysis}
                        </div>
                        {/* Always display URLs from groundingChunks when using googleSearch */}
                        {groundingChunks && groundingChunks.length > 0 && (
                            <div className="mt-2 pt-3 border-t border-slate-200">
                                <p className="font-bold text-slate-800 mb-2 text-xs uppercase tracking-wider">แหล่งข้อมูลอ้างอิง (Sources):</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    {groundingChunks.map((chunk: any, i: number) => (
                                        chunk.web && (
                                            <li key={i} className="text-xs">
                                                <a 
                                                    href={chunk.web.uri} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="text-blue-600 hover:underline break-all font-medium"
                                                >
                                                    {chunk.web.title || chunk.web.uri}
                                                </a>
                                            </li>
                                        )
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-slate-400 italic flex flex-col items-center justify-center h-full gap-2">
                        <Search size={24} className="opacity-20" />
                        <span>ข้อมูลการตรวจสอบจะปรากฏที่นี่...</span>
                    </div>
                )}
            </div>
        </div>
      </Card>
    </div>
  );
};
