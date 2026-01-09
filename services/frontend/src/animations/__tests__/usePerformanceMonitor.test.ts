import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePerformanceMonitor } from '../usePerformanceMonitor';

describe('usePerformanceMonitor', () => {
  it('initializes with default metrics', () => {
    const { result } = renderHook(() => usePerformanceMonitor(false));

    expect(result.current.metrics).toEqual({
      fps: 60,
      avgFrameTime: 0,
      droppedFrames: 0,
    });
  });

  it('provides reset function', () => {
    const { result } = renderHook(() => usePerformanceMonitor(false));

    expect(() => {
      result.current.reset();
    }).not.toThrow();
  });

  it('provides isPerformant flag', () => {
    const { result } = renderHook(() => usePerformanceMonitor(false));

    expect(typeof result.current.isPerformant).toBe('boolean');
  });

  it('starts monitoring when enabled', async () => {
    const { result } = renderHook(() => usePerformanceMonitor(true));

    await waitFor(
      () => {
        expect(result.current.metrics.fps).toBeGreaterThan(0);
      },
      { timeout: 1000 }
    );
  });

  it('resets metrics when reset is called', () => {
    const { result } = renderHook(() => usePerformanceMonitor(false));

    result.current.reset();

    expect(result.current.metrics).toEqual({
      fps: 60,
      avgFrameTime: 0,
      droppedFrames: 0,
    });
  });
});
