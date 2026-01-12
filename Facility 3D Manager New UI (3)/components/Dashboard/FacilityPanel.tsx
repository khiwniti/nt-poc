
import React, { useState, useEffect } from 'react';
import { Branch, WeatherData } from '../../types';
import { Card } from '../ui/Card';
import { Activity, Thermometer, Search, BrainCircuit, TrendingDown, View, Box, Cloud, CloudRain, Sun, Wind, Droplets, CloudLightning, CloudFog, Loader2, Check } from 'lucide-react';
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
    if (condition.includes('Rain') || condition.includes('Drizzle')) return <CloudRain className="w-8 h-8 text-blue-400" />;
    if (condition.includes('Storm') || condition.includes('Thunder')) return <CloudLightning className="w-8 h-8 text-purple-500" />;
    if (condition.includes('Fog')) return <CloudFog className="w-8 h-8 text-gray-400" />;
    if (condition.includes('Cloud')) return <Cloud className="w-8 h-8 text-gray-400" />;
    return <Sun className="w-8 h-8 text-orange-400" />;
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto pr-2 text-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-nt-dark flex items-center gap-2">
            <span className="w-2 h-8 bg-nt-yellow rounded-sm"></span>
            {branch.name}
          </h2>
          <p className="text-gray-500 text-sm ml-4">สาขาภูมิภาค {branch.region}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
          branch.status === 'operational' ? 'bg-green-100 text-green-700' :
          branch.status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {branch.status === 'operational' ? 'ปกติ' : branch.status === 'warning' ? 'แจ้งเตือน' : 'วิกฤต'}
        </div>
      </div>

      {/* Intelligence Alert - Anomaly Context */}
      {branch.status === 'critical' && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 animate-pulse">
              <BrainCircuit className="text-red-600 shrink-0" />
              <p className="text-[10px] text-red-700 font-bold leading-tight">
                  ระบบ SCADA ตรวจพบความผิดปกติในระบบปรับอากาศ (HVAC) คาดว่าจะสูญเสียประสิทธิภาพ 42% แนะนำให้เข้าตรวจสอบทันที
              </p>
            </div>
      )}

      {/* Weather Widget */}
      <Card title="สภาพอากาศท้องถิ่น (Real-time)">
        {weather ? (
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                  {getWeatherIcon(weather.condition)}
                  <div>
                      <div className="text-2xl font-bold text-slate-800">{weather.temperature}°C</div>
                      <div className="text-xs text-gray-500 font-medium">{weather.condition}</div>
                  </div>
              </div>
              <div className="space-y-1 text-right">
                  <div className="flex items-center justify-end gap-1.5 text-xs text-gray-600">
                      <Wind size={14} className="text-blue-500" /> 
                      <span className="font-mono font-bold">{weather.windSpeed}</span> km/h
                  </div>
                  <div className="flex items-center justify-end gap-1.5 text-xs text-gray-600">
                      <Droplets size={14} className="text-cyan-500" /> 
                      <span className="font-mono font-bold">{weather.humidity}</span>%
                  </div>
              </div>
          </div>
        ) : (
          <div className="flex items-center justify-between animate-pulse">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="space-y-1">
                   <div className="w-16 h-6 bg-gray-200 rounded"></div>
                   <div className="w-10 h-3 bg-gray-200 rounded"></div>
                </div>
             </div>
             <div className="space-y-1">
                <div className="w-12 h-3 bg-gray-200 rounded"></div>
                <div className="w-12 h-3 bg-gray-200 rounded"></div>
             </div>
          </div>
        )}
      </Card>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="flex flex-col items-center justify-center p-4 bg-blue-50/50">
          <Activity className="w-6 h-6 text-blue-500 mb-2" />
          <span className="text-2xl font-bold text-gray-800">{branch.metrics.powerUsage}</span>
          <span className="text-xs text-gray-500">การใช้พลังงาน (kW)</span>
        </Card>
        <Card className="flex flex-col items-center justify-center p-4 bg-red-50/50">
          <Thermometer className="w-6 h-6 text-red-500 mb-2" />
          <span className="text-2xl font-bold text-gray-800">{branch.metrics.temperature}°C</span>
          <span className="text-xs text-gray-500">อุณหภูมิภายใน</span>
        </Card>
      </div>

      {/* AI Recommendation Card */}
      <Card className="bg-emerald-600 text-white border-none overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-1 opacity-20 group-hover:rotate-12 transition-transform">
              <TrendingDown size={60} />
          </div>
          <div className="relative z-10">
              <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1 flex items-center gap-1">
                  <BrainCircuit size={12} /> คำแนะนำเพื่อประสิทธิภาพ
              </h4>
              <p className="text-xs font-medium leading-relaxed">
                  ปรับอุณหภูมิ HVAC เป็น 24.5°C ช่วงเวลา 10:00-12:00 เพื่อประหยัดพลังงาน <span className="font-black">12.4 kWh</span> วันนี้
              </p>
              <button 
                onClick={handleApplySettings}
                disabled={isApplyingSettings || settingsApplied}
                className="mt-3 px-3 py-1 bg-white/20 rounded hover:bg-white/30 text-[10px] font-bold transition-all flex items-center gap-2 disabled:cursor-not-allowed"
              >
                  {isApplyingSettings ? (
                      <><Loader2 size={12} className="animate-spin" /> กำลังปรับค่า...</>
                  ) : settingsApplied ? (
                      <><Check size={12} /> ปรับค่าเรียบร้อย</>
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
            className="w-full flex items-center justify-center gap-2 bg-nt-dark text-white hover:bg-gray-800 py-3 px-4 rounded-lg transition-all shadow-md group border border-white/10"
        >
            <Box className="w-5 h-5 group-hover:rotate-12 transition-transform text-nt-yellow" />
            <span className="font-medium">เปิดระบบตรวจสอบยูนิต 3 มิติ (Digital Twin)</span>
        </button>
      </Card>

      <Card title="การวิเคราะห์ตำแหน่งเชิงพื้นที่" className="flex-1 min-h-[200px] flex flex-col">
        <div className="flex flex-col gap-3 h-full">
            <button 
                onClick={handleAnalyzeLocation}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-slate-700 hover:bg-gray-50 py-2 px-4 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
                {isLoading ? <div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin"></div> : <Search className="w-4 h-4" />}
                <span>รันการตรวจสอบพลังงาน (Audit)</span>
            </button>
            
            <div className="flex-1 overflow-y-auto overflow-x-auto bg-gray-50 rounded-lg p-3 text-[10px] leading-relaxed text-gray-700 border border-gray-100 mt-2 max-h-60 scrollbar-thin scrollbar-thumb-gray-300">
                {mapAnalysis ? (
                    <div className="flex flex-col gap-4">
                        <div className="markdown prose prose-sm break-words max-w-none">
                            {mapAnalysis}
                        </div>
                        {/* Always display URLs from groundingChunks when using googleSearch */}
                        {groundingChunks && groundingChunks.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                                <p className="font-bold text-slate-800 mb-1">แหล่งข้อมูลอ้างอิง (Sources):</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    {groundingChunks.map((chunk: any, i: number) => (
                                        chunk.web && (
                                            <li key={i}>
                                                <a 
                                                    href={chunk.web.uri} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="text-blue-600 hover:underline break-all"
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
                    <span className="text-gray-400 italic flex items-center justify-center h-full">ข้อมูลการตรวจสอบจะปรากฏที่นี่...</span>
                )}
            </div>
        </div>
      </Card>
    </div>
  );
};
