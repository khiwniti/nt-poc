import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useColorTransition } from '../useColorTransition';

describe('useColorTransition', () => {
  it('initializes with target color', () => {
    const { result } = renderHook(() =>
      useColorTransition({ targetColor: '#ff0000' })
    );

    expect(result.current.color).toBeDefined();
    expect(result.current.updateColor).toBeInstanceOf(Function);
  });

  it('provides updateColor function', () => {
    const { result } = renderHook(() =>
      useColorTransition({ targetColor: '#00ff00' })
    );

    expect(() => {
      result.current.updateColor('#0000ff');
    }).not.toThrow();
  });

  it('accepts hex color strings', () => {
    const { result } = renderHook(() =>
      useColorTransition({ targetColor: '#808080' })
    );

    expect(() => {
      result.current.updateColor('#ffffff');
    }).not.toThrow();
  });

  it('accepts named colors', () => {
    const { result } = renderHook(() =>
      useColorTransition({ targetColor: 'red' })
    );

    expect(() => {
      result.current.updateColor('blue');
    }).not.toThrow();
  });
});
