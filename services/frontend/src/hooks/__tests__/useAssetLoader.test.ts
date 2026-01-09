import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAssetLoader } from '../useAssetLoader';
import { assetCache } from '../../utils/assetLoader';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

vi.mock('../../utils/assetLoader', () => ({
  assetCache: {
    load: vi.fn(),
    clearAsset: vi.fn(),
    has: vi.fn(),
  },
}));

const mockGLTF: GLTF = {
  scene: { clone: () => ({ type: 'Scene' }) },
  scenes: [],
  animations: [],
  cameras: [],
  asset: {},
  parser: {},
  userData: {},
} as any;

describe('useAssetLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load asset successfully', async () => {
    vi.mocked(assetCache.load).mockImplementation(async (_url, onProgress) => {
      if (onProgress) {
        onProgress(50);
        onProgress(100);
      }
      return mockGLTF;
    });

    const { result } = renderHook(() =>
      useAssetLoader({ url: 'test.glb', enabled: true })
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.gltf).toBeNull();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.gltf).toBe(mockGLTF);
    expect(result.current.error).toBeNull();
    expect(result.current.progress).toBe(100);
  });

  it('should handle loading errors', async () => {
    const errorMessage = 'Failed to load asset';
    vi.mocked(assetCache.load).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() =>
      useAssetLoader({ url: 'error.glb', enabled: true })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toContain(errorMessage);
    expect(result.current.gltf).toBeNull();
  });

  it('should not load when enabled is false', async () => {
    const { result } = renderHook(() =>
      useAssetLoader({ url: 'test.glb', enabled: false })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(assetCache.load).not.toHaveBeenCalled();
    expect(result.current.gltf).toBeNull();
  });

  it('should not load when url is null', async () => {
    const { result } = renderHook(() =>
      useAssetLoader({ url: null, enabled: true })
    );

    expect(assetCache.load).not.toHaveBeenCalled();
    expect(result.current.gltf).toBeNull();
  });

  it('should track progress during loading', async () => {
    vi.mocked(assetCache.load).mockImplementation(async (_url, onProgress) => {
      if (onProgress) {
        onProgress(25);
        onProgress(50);
        onProgress(75);
        onProgress(100);
      }
      return mockGLTF;
    });

    const { result } = renderHook(() =>
      useAssetLoader({ url: 'test.glb', enabled: true })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.progress).toBe(100);
  });

  it('should support reload functionality', async () => {
    vi.mocked(assetCache.load).mockResolvedValue(mockGLTF);

    const { result } = renderHook(() =>
      useAssetLoader({ url: 'test.glb', enabled: true })
    );

    await waitFor(() => {
      expect(result.current.gltf).toBe(mockGLTF);
    });

    expect(assetCache.load).toHaveBeenCalledTimes(1);

    result.current.reload();

    await waitFor(() => {
      expect(assetCache.clearAsset).toHaveBeenCalledWith('test.glb');
      expect(assetCache.load).toHaveBeenCalledTimes(2);
    });
  });

  it('should cleanup on unmount', async () => {
    vi.mocked(assetCache.load).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { unmount } = renderHook(() =>
      useAssetLoader({ url: 'test.glb', enabled: true })
    );

    unmount();

    // Should not throw or cause issues
    expect(true).toBe(true);
  });

  it('should reload when url changes', async () => {
    vi.mocked(assetCache.load).mockResolvedValue(mockGLTF);

    const { result, rerender } = renderHook(
      ({ url }) => useAssetLoader({ url, enabled: true }),
      { initialProps: { url: 'test1.glb' } }
    );

    await waitFor(() => {
      expect(result.current.gltf).toBe(mockGLTF);
    });

    expect(assetCache.load).toHaveBeenCalledWith('test1.glb', expect.any(Function));

    rerender({ url: 'test2.glb' });

    await waitFor(() => {
      expect(assetCache.load).toHaveBeenCalledWith('test2.glb', expect.any(Function));
    });
  });
});
