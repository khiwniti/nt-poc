import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDashboardRefresh } from '../useDashboardRefresh';
import { useDashboardStore } from '../../stores/dashboardStore';

vi.mock('../../stores/dashboardStore');

describe('useDashboardRefresh', () => {
  const mockFetchDashboard = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockFetchDashboard.mockResolvedValue(undefined);
    (useDashboardStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      fetchDashboard: mockFetchDashboard,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('performs initial fetch on mount when enabled', async () => {
    await act(async () => {
      renderHook(() =>
        useDashboardRefresh({
          facilityId: 'facility-1',
          enabled: true,
        })
      );
      await vi.runOnlyPendingTimersAsync();
    });

    expect(mockFetchDashboard).toHaveBeenCalledWith('facility-1');
  });

  it('does not fetch when facilityId is undefined', () => {
    renderHook(() =>
      useDashboardRefresh({
        facilityId: undefined,
        enabled: true,
      })
    );

    expect(mockFetchDashboard).not.toHaveBeenCalled();
  });

  it('does not fetch when enabled is false', () => {
    renderHook(() =>
      useDashboardRefresh({
        facilityId: 'facility-1',
        enabled: false,
      })
    );

    expect(mockFetchDashboard).not.toHaveBeenCalled();
  });

  it('refreshes at specified interval', async () => {
    await act(async () => {
      renderHook(() =>
        useDashboardRefresh({
          facilityId: 'facility-1',
          interval: 10000,
          enabled: true,
        })
      );
    });

    // Initial fetch happens immediately
    expect(mockFetchDashboard).toHaveBeenCalledTimes(1);

    // Advance time by 10 seconds to trigger next refresh
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(mockFetchDashboard).toHaveBeenCalledTimes(2);

    // Advance time by another 10 seconds
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(mockFetchDashboard).toHaveBeenCalledTimes(3);
  });

  it('clears interval on unmount', async () => {
    let unmount: () => void;
    await act(async () => {
      const result = renderHook(() =>
        useDashboardRefresh({
          facilityId: 'facility-1',
          interval: 10000,
          enabled: true,
        })
      );
      unmount = result.unmount;
      await vi.runOnlyPendingTimersAsync();
    });

    expect(mockFetchDashboard).toHaveBeenCalledTimes(1);

    act(() => {
      unmount!();
    });

    // Advance time - should not trigger more fetches
    await act(async () => {
      vi.advanceTimersByTime(10000);
      await vi.runOnlyPendingTimersAsync();
    });
    expect(mockFetchDashboard).toHaveBeenCalledTimes(1);
  });

  it('clears interval when enabled changes to false', async () => {
    let rerender: (props: { enabled: boolean }) => void;
    await act(async () => {
      const result = renderHook(
        ({ enabled }) =>
          useDashboardRefresh({
            facilityId: 'facility-1',
            interval: 10000,
            enabled,
          }),
        { initialProps: { enabled: true } }
      );
      rerender = result.rerender;
      await vi.runOnlyPendingTimersAsync();
    });

    expect(mockFetchDashboard).toHaveBeenCalledTimes(1);

    // Disable refresh
    act(() => {
      rerender!({ enabled: false });
    });

    // Advance time - should not trigger more fetches
    await act(async () => {
      vi.advanceTimersByTime(10000);
      await vi.runOnlyPendingTimersAsync();
    });
    expect(mockFetchDashboard).toHaveBeenCalledTimes(1);
  });

  it('restarts interval when facilityId changes', async () => {
    let rerender: (props: { facilityId: string }) => void;
    await act(async () => {
      const result = renderHook(
        ({ facilityId }) =>
          useDashboardRefresh({
            facilityId,
            interval: 10000,
            enabled: true,
          }),
        { initialProps: { facilityId: 'facility-1' } }
      );
      rerender = result.rerender;
      await vi.runOnlyPendingTimersAsync();
    });

    expect(mockFetchDashboard).toHaveBeenCalledWith('facility-1');

    mockFetchDashboard.mockClear();

    // Change facility
    await act(async () => {
      rerender!({ facilityId: 'facility-2' });
      await vi.runOnlyPendingTimersAsync();
    });

    expect(mockFetchDashboard).toHaveBeenCalledWith('facility-2');
  });

  it('handles fetch errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetchDashboard.mockRejectedValueOnce(new Error('Network error'));

    await act(async () => {
      renderHook(() =>
        useDashboardRefresh({
          facilityId: 'facility-1',
          enabled: true,
        })
      );
      await vi.runOnlyPendingTimersAsync();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Dashboard refresh failed:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it('returns refresh function that can be called manually', async () => {
    let result: any;
    await act(async () => {
      result = renderHook(() =>
        useDashboardRefresh({
          facilityId: 'facility-1',
          enabled: true,
        })
      );
      await vi.runOnlyPendingTimersAsync();
    });

    expect(mockFetchDashboard).toHaveBeenCalledTimes(1);

    mockFetchDashboard.mockClear();

    // Manual refresh
    await act(async () => {
      await result.result.current.refresh();
    });

    expect(mockFetchDashboard).toHaveBeenCalledWith('facility-1');
  });

  it('manual refresh respects facilityId and enabled state', async () => {
    const { result } = renderHook(() =>
      useDashboardRefresh({
        facilityId: undefined,
        enabled: false,
      })
    );

    await result.current.refresh();

    expect(mockFetchDashboard).not.toHaveBeenCalled();
  });

  it('uses default interval of 30 seconds', async () => {
    await act(async () => {
      renderHook(() =>
        useDashboardRefresh({
          facilityId: 'facility-1',
          enabled: true,
        })
      );
    });

    expect(mockFetchDashboard).toHaveBeenCalledTimes(1);

    // Advance time by 30 seconds
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });
    expect(mockFetchDashboard).toHaveBeenCalledTimes(2);
  });
});
