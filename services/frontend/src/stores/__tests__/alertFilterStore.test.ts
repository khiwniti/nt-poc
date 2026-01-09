import { describe, it, expect, beforeEach } from 'vitest';
import { useAlertFilterStore } from '../alertFilterStore';

describe('alertFilterStore', () => {
  beforeEach(() => {
    const { clearFilters } = useAlertFilterStore.getState();
    clearFilters();
  });

  it('should initialize with default values', () => {
    const state = useAlertFilterStore.getState();
    expect(state.status).toEqual([]);
    expect(state.severity).toEqual([]);
    expect(state.type).toEqual([]);
    expect(state.dateRange).toBe('30d');
    expect(state.customStartDate).toBeNull();
    expect(state.customEndDate).toBeNull();
  });

  it('should set status filter', () => {
    const { setStatus } = useAlertFilterStore.getState();
    setStatus(['active', 'critical']);
    const state = useAlertFilterStore.getState();
    expect(state.status).toEqual(['active', 'critical']);
  });

  it('should set severity filter', () => {
    const { setSeverity } = useAlertFilterStore.getState();
    setSeverity(['critical', 'warning']);
    const state = useAlertFilterStore.getState();
    expect(state.severity).toEqual(['critical', 'warning']);
  });

  it('should set type filter', () => {
    const { setType } = useAlertFilterStore.getState();
    setType(['Temperature High', 'Voltage Anomaly']);
    const state = useAlertFilterStore.getState();
    expect(state.type).toEqual(['Temperature High', 'Voltage Anomaly']);
  });

  it('should set date range', () => {
    const { setDateRange } = useAlertFilterStore.getState();
    setDateRange('7d');
    const state = useAlertFilterStore.getState();
    expect(state.dateRange).toBe('7d');
  });

  it('should set custom date range', () => {
    const { setCustomDateRange } = useAlertFilterStore.getState();
    setCustomDateRange('2024-01-01', '2024-01-31');
    const state = useAlertFilterStore.getState();
    expect(state.dateRange).toBe('custom');
    expect(state.customStartDate).toBe('2024-01-01');
    expect(state.customEndDate).toBe('2024-01-31');
  });

  it('should clear all filters', () => {
    const { setStatus, setSeverity, setDateRange, clearFilters } = useAlertFilterStore.getState();
    
    setStatus(['active']);
    setSeverity(['critical']);
    setDateRange('7d');
    
    clearFilters();
    
    const state = useAlertFilterStore.getState();
    expect(state.status).toEqual([]);
    expect(state.severity).toEqual([]);
    expect(state.type).toEqual([]);
    expect(state.dateRange).toBe('30d');
  });

  it('should generate URL params correctly', () => {
    const { setStatus, setSeverity, setType, setDateRange } = useAlertFilterStore.getState();
    
    setStatus(['active', 'acknowledged']);
    setSeverity(['critical']);
    setType(['Temperature High']);
    setDateRange('7d');
    
    const { getURLParams } = useAlertFilterStore.getState();
    const params = getURLParams();
    
    expect(params.get('status')).toBe('active,acknowledged');
    expect(params.get('severity')).toBe('critical');
    expect(params.get('type')).toBe('Temperature High');
    expect(params.get('dateRange')).toBe('7d');
  });

  it('should generate URL params with custom date range', () => {
    const { setCustomDateRange } = useAlertFilterStore.getState();
    
    setCustomDateRange('2024-01-01', '2024-01-31');
    
    const { getURLParams } = useAlertFilterStore.getState();
    const params = getURLParams();
    
    expect(params.get('dateRange')).toBe('custom');
    expect(params.get('startDate')).toBe('2024-01-01');
    expect(params.get('endDate')).toBe('2024-01-31');
  });

  it('should set state from URL params', () => {
    const params = new URLSearchParams();
    params.set('status', 'active,resolved');
    params.set('severity', 'critical,warning');
    params.set('type', 'Temperature High,Voltage Anomaly');
    params.set('dateRange', '24h');
    
    const { setFromURLParams } = useAlertFilterStore.getState();
    setFromURLParams(params);
    
    const state = useAlertFilterStore.getState();
    expect(state.status).toEqual(['active', 'resolved']);
    expect(state.severity).toEqual(['critical', 'warning']);
    expect(state.type).toEqual(['Temperature High', 'Voltage Anomaly']);
    expect(state.dateRange).toBe('24h');
  });

  it('should set custom date range from URL params', () => {
    const params = new URLSearchParams();
    params.set('dateRange', 'custom');
    params.set('startDate', '2024-01-01');
    params.set('endDate', '2024-01-31');
    
    const { setFromURLParams } = useAlertFilterStore.getState();
    setFromURLParams(params);
    
    const state = useAlertFilterStore.getState();
    expect(state.dateRange).toBe('custom');
    expect(state.customStartDate).toBe('2024-01-01');
    expect(state.customEndDate).toBe('2024-01-31');
  });

  it('should handle empty URL params', () => {
    const params = new URLSearchParams();
    
    const { setFromURLParams } = useAlertFilterStore.getState();
    setFromURLParams(params);
    
    const state = useAlertFilterStore.getState();
    expect(state.status).toEqual([]);
    expect(state.severity).toEqual([]);
    expect(state.type).toEqual([]);
    expect(state.dateRange).toBe('30d');
  });
});
