import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDashboardStore } from '../dashboardStore';
import * as dashboardApi from '../../api/dashboard';

vi.mock('../../api/dashboard');

describe('useDashboardStore', () => {
  beforeEach(() => {
    useDashboardStore.getState().reset();
    vi.clearAllMocks();
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useDashboardStore());

    expect(result.current.facility).toBeNull();
    expect(result.current.kpis).toBeNull();
    expect(result.current.alerts).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('fetches dashboard data successfully', async () => {
    const mockData = {
      facility: { id: 'fac-001', name: 'Test Facility' },
      kpis: { totalCapacity: 500, averageSoC: 78.5 },
      alerts: [{ id: 'alert-001', severity: 'high' }],
      timestamp: new Date().toISOString(),
    };

    vi.mocked(dashboardApi.dashboardApi.getFacilityDashboard).mockResolvedValue(mockData);

    const { result } = renderHook(() => useDashboardStore());

    await act(async () => {
      await result.current.fetchDashboard('fac-001');
    });

    expect(result.current.facility).toEqual(mockData.facility);
    expect(result.current.kpis).toEqual(mockData.kpis);
    expect(result.current.alerts).toEqual(mockData.alerts);
    expect(result.current.isLoading).toBe(false);
  });

  it('handles fetch errors', async () => {
    vi.mocked(dashboardApi.dashboardApi.getFacilityDashboard).mockRejectedValue(
      new Error('Network error')
    );

    const { result } = renderHook(() => useDashboardStore());

    await act(async () => {
      await result.current.fetchDashboard('fac-001');
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.isLoading).toBe(false);
  });

  it('updates KPIs', () => {
    const { result } = renderHook(() => useDashboardStore());

    const newKPIs = { totalCapacity: 600, averageSoC: 85.0 };

    act(() => {
      result.current.updateKPIs(newKPIs);
    });

    expect(result.current.kpis).toEqual(newKPIs);
    expect(result.current.lastUpdated).toBeDefined();
  });

  it('adds and removes alerts', () => {
    const { result } = renderHook(() => useDashboardStore());

    const newAlert = { id: 'alert-002', severity: 'critical' };

    act(() => {
      result.current.addAlert(newAlert);
    });

    expect(result.current.alerts).toContainEqual(newAlert);

    act(() => {
      result.current.removeAlert('alert-002');
    });

    expect(result.current.alerts).not.toContainEqual(newAlert);
  });

  it('resets state', () => {
    const { result } = renderHook(() => useDashboardStore());

    act(() => {
      result.current.updateKPIs({ totalCapacity: 500, averageSoC: 80 });
      result.current.addAlert({ id: 'alert-001' });
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.facility).toBeNull();
    expect(result.current.kpis).toBeNull();
    expect(result.current.alerts).toEqual([]);
  });
});
