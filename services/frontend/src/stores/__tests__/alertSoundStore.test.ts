import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAlertSoundStore } from '../alertSoundStore';

describe('alertSoundStore', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('should initialize with default settings', () => {
    const { result } = renderHook(() => useAlertSoundStore());

    expect(result.current.settings).toEqual({
      enabled: true,
      volume: 0.7,
      respectReducedMotion: true,
    });
  });

  it('should toggle enabled state', () => {
    const { result } = renderHook(() => useAlertSoundStore());

    act(() => {
      result.current.setEnabled(false);
    });

    expect(result.current.settings.enabled).toBe(false);

    act(() => {
      result.current.setEnabled(true);
    });

    expect(result.current.settings.enabled).toBe(true);
  });

  it('should update volume', () => {
    const { result } = renderHook(() => useAlertSoundStore());

    act(() => {
      result.current.setVolume(0.5);
    });

    expect(result.current.settings.volume).toBe(0.5);
  });

  it('should clamp volume between 0 and 1', () => {
    const { result } = renderHook(() => useAlertSoundStore());

    act(() => {
      result.current.setVolume(1.5);
    });

    expect(result.current.settings.volume).toBe(1);

    act(() => {
      result.current.setVolume(-0.5);
    });

    expect(result.current.settings.volume).toBe(0);
  });

  it('should toggle mute', () => {
    const { result } = renderHook(() => useAlertSoundStore());

    const initialEnabled = result.current.settings.enabled;

    act(() => {
      result.current.toggleMute();
    });

    expect(result.current.settings.enabled).toBe(!initialEnabled);

    act(() => {
      result.current.toggleMute();
    });

    expect(result.current.settings.enabled).toBe(initialEnabled);
  });

  it('should update respectReducedMotion setting', () => {
    const { result } = renderHook(() => useAlertSoundStore());

    act(() => {
      result.current.setRespectReducedMotion(false);
    });

    expect(result.current.settings.respectReducedMotion).toBe(false);

    act(() => {
      result.current.setRespectReducedMotion(true);
    });

    expect(result.current.settings.respectReducedMotion).toBe(true);
  });

  it('should return false from shouldPlaySound when disabled', () => {
    const { result } = renderHook(() => useAlertSoundStore());

    act(() => {
      result.current.setEnabled(false);
    });

    expect(result.current.shouldPlaySound()).toBe(false);
  });

  it('should return true from shouldPlaySound when enabled and no reduced motion', () => {
    const { result } = renderHook(() => useAlertSoundStore());

    act(() => {
      result.current.setEnabled(true);
    });

    expect(result.current.shouldPlaySound()).toBe(true);
  });

  it('should persist settings to localStorage', () => {
    const { result } = renderHook(() => useAlertSoundStore());

    act(() => {
      result.current.setEnabled(false);
      result.current.setVolume(0.3);
    });

    // Create a new instance to verify persistence
    const { result: result2 } = renderHook(() => useAlertSoundStore());

    expect(result2.current.settings.enabled).toBe(false);
    expect(result2.current.settings.volume).toBe(0.3);
  });
});
