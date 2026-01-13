/**
 * Real-Time Battery Card Example
 * Demonstrates how to use real sensor data from TimescaleDB
 */

import React from 'react';
import { Battery, Thermometer, Zap, Activity } from 'lucide-react';
import { useSensorData } from '../../hooks/useSensorData';

interface RealTimeBatteryCardProps {
  batterySystemId: string;
  name: string;
  location?: string;
  token?: string;  // Pass token as prop or use context
}

export const RealTimeBatteryCard: React.FC<RealTimeBatteryCardProps> = ({
  batterySystemId,
  name,
  location,
  token = '',
}) => {
  const { data: sensorData, loading, error } = useSensorData(batterySystemId, token, !!token);

  // Helper to get status color based on SoC and temperature
  const getStatusColor = () => {
    if (!sensorData) return 'bg-gray-400';
    
    if (sensorData.soc < 20 || sensorData.temperature > 45) {
      return 'bg-red-500';
    }
    if (sensorData.soc < 40 || sensorData.temperature > 35) {
      return 'bg-amber-500';
    }
    return 'bg-emerald-500';
  };

  // Helper to format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 60) return `${diffSec}วินาทีที่แล้ว`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}นาทีที่แล้ว`;
    return date.toLocaleTimeString('th-TH');
  };

  if (loading && !sensorData) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-6 shadow-sm">
        <div className="text-red-600 text-sm">
          <p className="font-semibold mb-1">⚠️ ไม่สามารถโหลดข้อมูลได้</p>
          <p className="text-xs text-red-500">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!sensorData) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="text-gray-500 text-sm text-center">
          <p>ไม่พบข้อมูลเซนเซอร์</p>
          <p className="text-xs mt-1">ID: {batterySystemId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
      {/* Status Indicator */}
      <div className={`absolute top-0 left-0 w-1 h-full ${getStatusColor()}`}></div>
      
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{name}</h3>
          <div className={`w-2 h-2 rounded-full ${getStatusColor()} animate-pulse`}></div>
        </div>
        {location && (
          <p className="text-xs text-gray-500 mt-1">{location}</p>
        )}
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* State of Charge */}
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
          <div className="flex items-center gap-2 mb-1">
            <Battery size={16} className="text-blue-600" />
            <span className="text-xs text-blue-600 font-semibold">SoC</span>
          </div>
          <div className="text-2xl font-bold text-blue-700">
            {sensorData.soc.toFixed(1)}%
          </div>
          <div className="w-full bg-blue-200 rounded-full h-1.5 mt-2">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(sensorData.soc, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Temperature */}
        <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
          <div className="flex items-center gap-2 mb-1">
            <Thermometer size={16} className="text-orange-600" />
            <span className="text-xs text-orange-600 font-semibold">อุณหภูมิ</span>
          </div>
          <div className="text-2xl font-bold text-orange-700">
            {sensorData.temperature.toFixed(1)}°C
          </div>
          <div className="text-xs text-orange-600 mt-1">
            {sensorData.temperature > 35 ? '⚠️ สูง' : '✓ ปกติ'}
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="space-y-2 border-t border-gray-100 pt-3">
        {/* Voltage */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 flex items-center gap-1">
            <Zap size={14} className="text-amber-500" />
            แรงดันไฟฟ้า
          </span>
          <span className="font-semibold text-slate-800">
            {sensorData.voltage.toFixed(2)} V
          </span>
        </div>

        {/* Current */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 flex items-center gap-1">
            <Activity size={14} className="text-cyan-500" />
            กระแสไฟฟ้า
          </span>
          <span className={`font-semibold ${sensorData.current < 0 ? 'text-red-600' : 'text-green-600'}`}>
            {sensorData.current.toFixed(2)} A
            {sensorData.current < 0 ? ' (discharge)' : ' (charge)'}
          </span>
        </div>

        {/* Power */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">กำลังไฟฟ้า</span>
          <span className="font-semibold text-slate-800">
            {Math.abs(sensorData.power).toFixed(1)} W
          </span>
        </div>

        {/* State of Health */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">สภาพสุขภาพ (SoH)</span>
          <span className={`font-semibold ${
            sensorData.soh > 90 ? 'text-green-600' :
            sensorData.soh > 70 ? 'text-amber-600' :
            'text-red-600'
          }`}>
            {sensorData.soh.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Timestamp Footer */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>อัพเดทล่าสุด</span>
          <span className="font-mono">{formatTimestamp(sensorData.time)}</span>
        </div>
      </div>

      {/* Live Indicator */}
      <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full border border-gray-200">
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
        <span className="text-[10px] text-gray-600 font-medium">LIVE</span>
      </div>
    </div>
  );
};

export default RealTimeBatteryCard;
