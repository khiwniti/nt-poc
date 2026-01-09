import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from '../useOnlineStatus';

describe('useOnlineStatus', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { onLine: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should return online status', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });

  it('should update status when going offline', () => {
    const { result } = renderHook(() => useOnlineStatus());
    
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    
    expect(result.current).toBe(false);
  });

  it('should update status when going online', () => {
    vi.stubGlobal('navigator', { onLine: false });
    const { result } = renderHook(() => useOnlineStatus());
    
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    
    expect(result.current).toBe(true);
  });

  it('should cleanup event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useOnlineStatus());
    
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });
});
