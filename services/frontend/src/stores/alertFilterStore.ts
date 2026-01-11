import { create } from 'zustand';
import { AlertSeverity, AlertStatus, AlertType } from '../types';

export { AlertSeverity, AlertStatus, AlertType };
export type DateRange = '24h' | '7d' | '30d' | 'custom';

export interface AlertFilterState {
  status: AlertStatus[];
  severity: AlertSeverity[];
  type: AlertType[];
  dateRange: DateRange;
  customStartDate: string | null;
  customEndDate: string | null;

  setStatus: (status: AlertStatus[]) => void;
  setSeverity: (severity: AlertSeverity[]) => void;
  setType: (type: AlertType[]) => void;
  setDateRange: (range: DateRange) => void;
  setCustomDateRange: (start: string, end: string) => void;
  clearFilters: () => void;

  getURLParams: () => URLSearchParams;
  setFromURLParams: (params: URLSearchParams) => void;
}

const initialState = {
  status: [] as AlertStatus[],
  severity: [] as AlertSeverity[],
  type: [] as AlertType[],
  dateRange: '30d' as DateRange,
  customStartDate: null,
  customEndDate: null,
};

export const useAlertFilterStore = create<AlertFilterState>((set, get) => ({
  ...initialState,

  setStatus: (status) => set({ status }),

  setSeverity: (severity) => set({ severity }),

  setType: (type) => set({ type }),

  setDateRange: (range) => set({ dateRange: range }),

  setCustomDateRange: (start, end) =>
    set({
      dateRange: 'custom',
      customStartDate: start,
      customEndDate: end,
    }),

  clearFilters: () => set(initialState),

  getURLParams: () => {
    const state = get();
    const params = new URLSearchParams();

    if (state.status.length > 0) {
      params.set('status', state.status.join(','));
    }
    if (state.severity.length > 0) {
      params.set('severity', state.severity.join(','));
    }
    if (state.type.length > 0) {
      params.set('type', state.type.join(','));
    }
    if (state.dateRange) {
      params.set('dateRange', state.dateRange);
    }
    if (state.dateRange === 'custom' && state.customStartDate && state.customEndDate) {
      params.set('startDate', state.customStartDate);
      params.set('endDate', state.customEndDate);
    }

    return params;
  },

  setFromURLParams: (params) => {
    const status = (params.get('status')?.split(',').filter(Boolean) as AlertStatus[]) || [];
    const severity = (params.get('severity')?.split(',').filter(Boolean) as AlertSeverity[]) || [];
    const type = (params.get('type')?.split(',').filter(Boolean) as AlertType[]) || [];
    const dateRange = (params.get('dateRange') as DateRange) || '30d';
    const customStartDate = params.get('startDate') || null;
    const customEndDate = params.get('endDate') || null;

    set({
      status,
      severity,
      type,
      dateRange,
      customStartDate,
      customEndDate,
    });
  },
}));
