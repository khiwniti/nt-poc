import React, { useState, useEffect } from 'react';
import { Building2, AlertTriangle, MapPin } from 'lucide-react';
import { batterySystemsApi, FacilityStats } from '../../api/batterySystems';

interface FacilityStatsGridProps {
  onSelectFacility?: (facilityId: string) => void;
}

export const FacilityStatsGrid: React.FC<FacilityStatsGridProps> = ({ onSelectFacility }) => {
  const [facilitiesStats, setFacilitiesStats] = useState<FacilityStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFacilityStats();
    // Refresh every 2 minutes
    const interval = setInterval(loadFacilityStats, 120000);
    return () => clearInterval(interval);
  }, []);

  const loadFacilityStats = async () => {
    try {
      setLoading(true);
      const fleetData = await batterySystemsApi.getFleetSummary();
      setFacilitiesStats(fleetData.facilities);
    } catch (error) {
      console.error('Failed to load facility stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 bg-green-100';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusCounts = (stats: FacilityStats) => {
    const total = stats.totalBatteries;
    const operational = ((stats.operationalCount / total) * 100).toFixed(0);
    const maintenance = ((stats.maintenanceCount / total) * 100).toFixed(0);
    const fault = ((stats.faultCount / total) * 100).toFixed(0);

    return { operational, maintenance, fault };
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="animate-pulse bg-slate-100 rounded-xl h-64"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {facilitiesStats.map((facility) => {
        const statusCounts = getStatusCounts(facility);
        const hasIssues = facility.faultCount > 0 || facility.criticalBatteries > 0;

        return (
          <div
            key={facility.facilityId}
            onClick={() => onSelectFacility?.(facility.facilityId)}
            className={`p-5 rounded-xl border-2 transition-all cursor-pointer hover:shadow-lg ${
              hasIssues
                ? 'bg-red-50 border-red-200 hover:border-red-300'
                : 'bg-white border-slate-200 hover:border-blue-300'
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 size={18} className="text-blue-600" />
                  <h3 className="font-bold text-slate-800 text-sm">{facility.facilityName}</h3>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <MapPin size={12} />
                  <span>Data Center</span>
                </div>
              </div>
              {hasIssues && (
                <div className="px-2 py-1 bg-red-100 text-red-700 rounded-full">
                  <AlertTriangle size={14} />
                </div>
              )}
            </div>

            {/* Battery Count */}
            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-600">แบตเตอรี่ทั้งหมด</span>
                <span className="text-2xl font-black text-slate-800">
                  {facility.totalBatteries}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                ความจุรวม {facility.totalCapacityKwh.toFixed(1)} kWh
              </div>
            </div>

            {/* Status Distribution */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">ปกติ</span>
                <span className="font-bold text-green-600">{statusCounts.operational}%</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${statusCounts.operational}%` }}
                ></div>
              </div>

              {facility.maintenanceCount > 0 && (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">บำรุงรักษา</span>
                    <span className="font-bold text-yellow-600">{statusCounts.maintenance}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-500 transition-all"
                      style={{ width: `${statusCounts.maintenance}%` }}
                    ></div>
                  </div>
                </>
              )}

              {facility.faultCount > 0 && (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">ขัดข้อง</span>
                    <span className="font-bold text-red-600">{statusCounts.fault}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 transition-all"
                      style={{ width: `${statusCounts.fault}%` }}
                    ></div>
                  </div>
                </>
              )}
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200">
              <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">Avg SoC</div>
                <div
                  className={`text-sm font-bold px-2 py-1 rounded ${getHealthColor(facility.averageSoC)}`}
                >
                  {facility.averageSoC.toFixed(0)}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">Avg SoH</div>
                <div
                  className={`text-sm font-bold px-2 py-1 rounded ${getHealthColor(facility.averageSoH)}`}
                >
                  {facility.averageSoH.toFixed(0)}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">Avg Temp</div>
                <div className="text-sm font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded">
                  {facility.averageTemperature.toFixed(1)}°C
                </div>
              </div>
            </div>

            {/* Critical Alert */}
            {facility.criticalBatteries > 0 && (
              <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-600 flex-shrink-0" />
                <span className="text-xs font-bold text-red-800">
                  {facility.criticalBatteries} แบตเตอรี่ต้องการความสนใจ
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
