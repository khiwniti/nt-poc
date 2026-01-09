import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAlertPulse } from '../useAlertPulse';

describe('useAlertPulse', () => {
  it('initializes with default values', () => {
    const { result } = renderHook(() => useAlertPulse());

    expect(result.current.scale).toBeDefined();
    expect(result.current.opacity).toBeDefined();
    expect(result.current.stop).toBeInstanceOf(Function);
    expect(result.current.start).toBeInstanceOf(Function);
  });

  it('can be disabled', () => {
    const { result } = renderHook(() => useAlertPulse({ enabled: false }));

    expect(result.current.scale).toBeDefined();
    expect(result.current.opacity).toBeDefined();
  });

  it('accepts custom min and max scale', () => {
    const { result } = renderHook(() =>
      useAlertPulse({ minScale: 0.8, maxScale: 1.5 })
    );

    expect(result.current.scale).toBeDefined();
  });

  it('provides stop function', () => {
    const { result } = renderHook(() => useAlertPulse());

    expect(() => {
      result.current.stop();
    }).not.toThrow();
  });

  it('provides start function', () => {
    const { result } = renderHook(() => useAlertPulse({ enabled: false }));

    expect(() => {
      result.current.start();
    }).not.toThrow();
  });
});
