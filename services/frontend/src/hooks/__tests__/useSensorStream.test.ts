import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSensorStream } from '../useSensorStream';

// Mock EventSource instances
const mockEventSourceInstances: MockEventSource[] = [];

class MockEventSource {
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
    mockEventSourceInstances.push(this);
  }
}

describe('useSensorStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEventSourceInstances.length = 0;
    vi.stubGlobal('EventSource', MockEventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('connects to SSE stream', () => {
    const onReading = vi.fn();

    renderHook(() =>
      useSensorStream({
        batterySystemId: 'bat-123',
        onReading,
        enabled: true,
      })
    );

    expect(mockEventSourceInstances.length).toBe(1);
    expect(mockEventSourceInstances[0].url).toContain('batterySystemId=bat-123');
  });

  it('calls onReading when data arrives', () => {
    const onReading = vi.fn();
    const mockReading = { voltage: 48.5, current: 10.2 };

    renderHook(() =>
      useSensorStream({
        batterySystemId: 'bat-123',
        onReading,
      })
    );

    const eventSource = mockEventSourceInstances[0];

    act(() => {
      eventSource.onmessage?.({ data: JSON.stringify(mockReading) } as MessageEvent);
    });

    expect(onReading).toHaveBeenCalledWith(mockReading);
  });

  it('does not connect when disabled', () => {
    renderHook(() =>
      useSensorStream({
        batterySystemId: 'bat-123',
        onReading: vi.fn(),
        enabled: false,
      })
    );

    expect(mockEventSourceInstances.length).toBe(0);
  });

  it('disconnects on unmount', () => {
    const { unmount } = renderHook(() =>
      useSensorStream({
        batterySystemId: 'bat-123',
        onReading: vi.fn(),
      })
    );

    const eventSource = mockEventSourceInstances[0];

    unmount();

    expect(eventSource.close).toHaveBeenCalled();
  });

  it('calls onError when error occurs', () => {
    const onReading = vi.fn();
    const onError = vi.fn();

    renderHook(() =>
      useSensorStream({
        batterySystemId: 'bat-123',
        onReading,
        onError,
      })
    );

    const eventSource = mockEventSourceInstances[0];
    const errorEvent = new Event('error');

    act(() => {
      eventSource.onerror?.(errorEvent);
    });

    expect(onError).toHaveBeenCalledWith(errorEvent);
  });

  it('handles invalid JSON gracefully', () => {
    const onReading = vi.fn();

    renderHook(() =>
      useSensorStream({
        batterySystemId: 'bat-123',
        onReading,
      })
    );

    const eventSource = mockEventSourceInstances[0];

    // Should not throw
    act(() => {
      eventSource.onmessage?.({ data: 'invalid json' } as MessageEvent);
    });

    expect(onReading).not.toHaveBeenCalled();
  });
});
