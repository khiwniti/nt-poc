import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePositionScale } from '../usePositionScale';

describe('usePositionScale', () => {
  it('initializes with default position and scale', () => {
    const { result } = renderHook(() => usePositionScale());

    expect(result.current.position).toBeDefined();
    expect(result.current.scale).toBeDefined();
    expect(result.current.updatePosition).toBeInstanceOf(Function);
    expect(result.current.updateScale).toBeInstanceOf(Function);
    expect(result.current.updateBoth).toBeInstanceOf(Function);
  });

  it('initializes with custom position', () => {
    const initialPosition: [number, number, number] = [1, 2, 3];
    const { result } = renderHook(() =>
      usePositionScale({ initialPosition })
    );

    expect(result.current.position).toBeDefined();
  });

  it('initializes with custom scale', () => {
    const initialScale: [number, number, number] = [2, 2, 2];
    const { result } = renderHook(() =>
      usePositionScale({ initialScale })
    );

    expect(result.current.scale).toBeDefined();
  });

  it('provides updatePosition function', () => {
    const { result } = renderHook(() => usePositionScale());

    expect(() => {
      result.current.updatePosition([5, 6, 7]);
    }).not.toThrow();
  });

  it('provides updateScale function', () => {
    const { result } = renderHook(() => usePositionScale());

    expect(() => {
      result.current.updateScale([3, 3, 3]);
    }).not.toThrow();
  });

  it('provides updateBoth function', () => {
    const { result } = renderHook(() => usePositionScale());

    expect(() => {
      result.current.updateBoth([1, 1, 1], [2, 2, 2]);
    }).not.toThrow();
  });
});
