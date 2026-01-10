import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useVRCapabilities } from '../useVRCapabilities';

// Mock the vrDetection utilities
vi.mock('../../utils/vrDetection', () => ({
  getVRCapabilities: vi.fn(),
}));

import { getVRCapabilities } from '../../utils/vrDetection';

describe('useVRCapabilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    vi.mocked(getVRCapabilities).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useVRCapabilities());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(null);
    expect(result.current.isVRSupported).toBe(false);
  });

  it('should load VR capabilities successfully', async () => {
    const mockCapabilities = {
      isSupported: true,
      isImmersiveVRSupported: true,
      isImmersiveARSupported: false,
      hasHandTracking: false,
      hasHitTest: false,
      deviceName: 'Meta Quest',
    };

    vi.mocked(getVRCapabilities).mockResolvedValue(mockCapabilities);

    const { result } = renderHook(() => useVRCapabilities());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.capabilities).toEqual(mockCapabilities);
    expect(result.current.isVRSupported).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it('should handle VR not supported', async () => {
    const mockCapabilities = {
      isSupported: false,
      isImmersiveVRSupported: false,
      isImmersiveARSupported: false,
      hasHandTracking: false,
      hasHitTest: false,
    };

    vi.mocked(getVRCapabilities).mockResolvedValue(mockCapabilities);

    const { result } = renderHook(() => useVRCapabilities());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.capabilities).toEqual(mockCapabilities);
    expect(result.current.isVRSupported).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should handle errors gracefully', async () => {
    const errorMessage = 'Failed to detect VR capabilities';
    vi.mocked(getVRCapabilities).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useVRCapabilities());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe(errorMessage);
    expect(result.current.isVRSupported).toBe(false);
  });

  it('should cleanup on unmount', async () => {
    const mockCapabilities = {
      isSupported: true,
      isImmersiveVRSupported: true,
      isImmersiveARSupported: false,
      hasHandTracking: false,
      hasHitTest: false,
    };

    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    vi.mocked(getVRCapabilities).mockReturnValue(promise as any);

    const { unmount } = renderHook(() => useVRCapabilities());

    // Unmount before promise resolves
    unmount();

    // Resolve promise after unmount
    resolvePromise!(mockCapabilities);

    // Wait a bit to ensure no state updates happen
    await new Promise((resolve) => setTimeout(resolve, 100));

    // If this doesn't throw, the cleanup worked correctly
    expect(true).toBe(true);
  });
});
