import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAlertStream } from '../useAlertStream';
import type { Alert } from '../../api/alerts';

const mockEventSourceInstances: MockEventSource[] = [];

class MockEventSource {
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;
  readyState = 0;
  close = vi.fn(() => {
    this.readyState = 2;
  });

  constructor(url: string) {
    this.url = url;
    mockEventSourceInstances.push(this);
  }
}

describe('useAlertStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockEventSourceInstances.length = 0;
    vi.stubGlobal('EventSource', MockEventSource);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('connects to alerts SSE stream', () => {
    renderHook(() =>
      useAlertStream({
        onAlert: vi.fn(),
        enabled: true,
      })
    );

    expect(mockEventSourceInstances.length).toBe(1);
    expect(mockEventSourceInstances[0].url).toContain('/alerts');
  });

  it('adds filters to URL (facilityId, severity)', () => {
    renderHook(() =>
      useAlertStream({
        onAlert: vi.fn(),
        facilityId: 'fac-1',
        severity: ['critical', 'warning'],
      })
    );

    expect(mockEventSourceInstances[0].url).toContain('facilityId=fac-1');
    expect(mockEventSourceInstances[0].url).toContain('severity=critical%2Cwarning');
  });

  it('calls onAlert when alert arrives', () => {
    const onAlert = vi.fn();
    const mockAlert: Alert = {
      id: 'a-1',
      batterySystemId: 'bat-1',
      zoneId: 'z-1',
      type: 'Temperature High',
      severity: 'critical',
      status: 'active',
      message: 'Overtemp',
      createdAt: Date.now(),
    };

    renderHook(() =>
      useAlertStream({
        onAlert,
      })
    );

    const eventSource = mockEventSourceInstances[0];

    act(() => {
      eventSource.onmessage?.({ data: JSON.stringify(mockAlert) } as MessageEvent);
    });

    expect(onAlert).toHaveBeenCalledWith(mockAlert);
  });

  it('filters alerts by severity client-side', () => {
    const onAlert = vi.fn();
    const mockAlert: Alert = {
      id: 'a-1',
      batterySystemId: 'bat-1',
      zoneId: 'z-1',
      type: 'Temperature High',
      severity: 'info',
      status: 'active',
      message: 'FYI',
      createdAt: Date.now(),
    };

    renderHook(() =>
      useAlertStream({
        onAlert,
        severity: 'critical',
      })
    );

    const eventSource = mockEventSourceInstances[0];

    act(() => {
      eventSource.onmessage?.({ data: JSON.stringify(mockAlert) } as MessageEvent);
    });

    expect(onAlert).not.toHaveBeenCalled();
  });

  it('filters alerts by facilityId client-side when present', () => {
    const onAlert = vi.fn();
    const mockAlert = {
      id: 'a-1',
      batterySystemId: 'bat-1',
      zoneId: 'z-1',
      type: 'Temperature High',
      severity: 'critical',
      status: 'active',
      message: 'Overtemp',
      createdAt: Date.now(),
      facilityId: 'fac-2',
    } as unknown as Alert;

    renderHook(() =>
      useAlertStream({
        onAlert,
        facilityId: 'fac-1',
      })
    );

    const eventSource = mockEventSourceInstances[0];

    act(() => {
      eventSource.onmessage?.({ data: JSON.stringify(mockAlert) } as MessageEvent);
    });

    expect(onAlert).not.toHaveBeenCalled();
  });

  it('auto-reconnects after error', () => {
    renderHook(() =>
      useAlertStream({
        onAlert: vi.fn(),
        reconnectBaseDelayMs: 1000,
      })
    );

    const first = mockEventSourceInstances[0];

    act(() => {
      first.onerror?.(new Event('error'));
    });

    expect(first.close).toHaveBeenCalled();
    expect(mockEventSourceInstances.length).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockEventSourceInstances.length).toBe(2);
  });

  it('exposes connection state changes', () => {
    const { result } = renderHook(() =>
      useAlertStream({
        onAlert: vi.fn(),
      })
    );

    expect(result.current.state).toBe('connecting');

    const eventSource = mockEventSourceInstances[0];
    act(() => {
      eventSource.onopen?.(new Event('open'));
    });
    expect(result.current.state).toBe('open');

    act(() => {
      eventSource.onerror?.(new Event('error'));
    });
    expect(result.current.state).toBe('reconnecting');
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() =>
      useAlertStream({
        onAlert: vi.fn(),
      })
    );

    const eventSource = mockEventSourceInstances[0];
    unmount();
    expect(eventSource.close).toHaveBeenCalled();
  });

  it('does not connect when disabled', () => {
    renderHook(() =>
      useAlertStream({
        onAlert: vi.fn(),
        enabled: false,
      })
    );

    expect(mockEventSourceInstances.length).toBe(0);
  });
});

