import React, { useState, useEffect, useCallback } from 'react';
import { Battery, ChevronLeft, ChevronRight, Search, Filter, Zap, Thermometer } from 'lucide-react';
import { batterySystemsApi, BatterySystemWithMetrics } from '../../api/batterySystems';

interface BatteryListProps {
  facilityId?: string;
  zoneId?: string;
  onSelectBattery?: (battery: BatterySystemWithMetrics) => void;
}

export const BatteryList: React.FC<BatteryListProps> = ({
  facilityId,
  zoneId,
  onSelectBattery,
}) => {
  const [batteries, setBatteries] = useState<BatterySystemWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBatteries, setTotalBatteries] = useState(0);
  const [pageSize] = useState(50);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const loadBatteries = useCallback(async () => {
    try {
      setLoading(true);
      const response = await batterySystemsApi.getBatteries({
        page: currentPage,
        pageSize,
        facilityId,
        zoneId,
        status: statusFilter || undefined,
        sortBy: 'serial_number',
        sortOrder: 'asc',
      });

      setBatteries(response.data);
      setTotalPages(response.totalPages);
      setTotalBatteries(response.total);
    } catch (error) {
      console.error('Failed to load batteries:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, facilityId, zoneId, statusFilter]);

  useEffect(() => {
    loadBatteries();
  }, [loadBatteries]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadBatteries();
      return;
    }

    try {
      setLoading(true);
      const results = await batterySystemsApi.searchBatteries(searchQuery, pageSize);
      setBatteries(results as BatterySystemWithMetrics[]);
      setTotalPages(1);
      setTotalBatteries(results.length);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'fault':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getHealthIndicator = (soh?: number) => {
    if (!soh) return 'bg-gray-300';
    if (soh >= 80) return 'bg-green-500';
    if (soh >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Battery size={20} className="text-blue-600" />
              รายการแบตเตอรี่
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              แสดง {batteries.length} จาก {totalBatteries.toLocaleString()} แบตเตอรี่
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${
              showFilters
                ? 'bg-blue-100 text-blue-600'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Filter size={18} />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="ค้นหา Serial Number หรือ Model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search size={18} className="absolute left-3 top-2.5 text-slate-400" />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              ค้นหา
            </button>
          </div>

          {showFilters && (
            <div className="flex gap-2 p-3 bg-slate-50 rounded-lg">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">ทุกสถานะ</option>
                <option value="operational">ปกติ</option>
                <option value="maintenance">บำรุงรักษา</option>
                <option value="fault">ขัดข้อง</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Battery List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="animate-pulse bg-slate-100 rounded-lg h-24"></div>
            ))}
          </div>
        ) : batteries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Battery size={48} className="mb-3 opacity-20" />
            <p className="text-sm font-medium">ไม่พบข้อมูลแบตเตอรี่</p>
          </div>
        ) : (
          <div className="space-y-2">
            {batteries.map((battery) => (
              <div
                key={battery.id}
                onClick={() => onSelectBattery?.(battery)}
                className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer bg-white"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-slate-800 text-sm">{battery.serial_number}</h4>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded border ${getStatusColor(battery.status)}`}
                      >
                        {battery.status === 'operational'
                          ? 'ปกติ'
                          : battery.status === 'maintenance'
                            ? 'บำรุงรักษา'
                            : 'ขัดข้อง'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {battery.model} • {battery.facility_name} • {battery.zone_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 mb-1">ความจุ</div>
                    <div className="text-sm font-bold text-slate-800">
                      {battery.capacity_kwh.toFixed(2)} kWh
                    </div>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-100">
                  <div className="text-center">
                    <div className="text-xs text-slate-500 mb-1 flex items-center justify-center gap-1">
                      <Zap size={12} /> แรงดัน
                    </div>
                    <div className="text-sm font-bold text-slate-800">
                      {battery.voltage ? `${battery.voltage.toFixed(1)}V` : '-'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-500 mb-1 flex items-center justify-center gap-1">
                      <Thermometer size={12} /> อุณหภูมิ
                    </div>
                    <div className="text-sm font-bold text-slate-800">
                      {battery.temperature ? `${battery.temperature.toFixed(1)}°C` : '-'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-500 mb-1">SoC</div>
                    <div className="text-sm font-bold text-slate-800">
                      {battery.soc ? `${battery.soc.toFixed(0)}%` : '-'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-500 mb-1">SoH</div>
                    <div className="flex items-center justify-center gap-1">
                      <div
                        className={`w-2 h-2 rounded-full ${getHealthIndicator(battery.soh)}`}
                      ></div>
                      <div className="text-sm font-bold text-slate-800">
                        {battery.soh ? `${battery.soh.toFixed(0)}%` : '-'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* RUL Prediction */}
                {battery.rul_days !== undefined && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500">อายุการใช้งานคงเหลือ (RUL)</span>
                    <span className="text-xs font-bold text-blue-600">
                      {battery.rul_days.toFixed(0)} วัน (
                      {battery.rul_confidence
                        ? `${(battery.rul_confidence * 100).toFixed(0)}%`
                        : '-'}
                      )
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-slate-200 flex items-center justify-between">
        <div className="text-sm text-slate-600">
          หน้า {currentPage} จาก {totalPages}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1 || loading}
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || loading}
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
