import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assetCache } from '../assetLoader';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: vi.fn().mockImplementation(() => ({
    load: vi.fn((url, onLoad, onProgress, onError) => {
      if (url.includes('error')) {
        setTimeout(() => onError(new Error('Mock load error')), 10);
      } else {
        setTimeout(() => {
          if (onProgress) {
            onProgress({ lengthComputable: true, loaded: 50, total: 100 });
            onProgress({ lengthComputable: true, loaded: 100, total: 100 });
          }
          onLoad({
            scene: { clone: () => ({ type: 'Scene' }) },
            scenes: [],
            animations: [],
            cameras: [],
            asset: {},
            parser: {},
            userData: {},
          } as unknown as GLTF);
        }, 50);
      }
    }),
  })),
}));

describe('assetCache', () => {
  beforeEach(() => {
    assetCache.clear();
  });

  it('should load and cache an asset', async () => {
    const url = 'test-model.glb';
    const gltf = await assetCache.load(url);

    expect(gltf).toBeDefined();
    expect(gltf.scene).toBeDefined();
    expect(assetCache.has(url)).toBe(true);
  });

  it('should return cached asset on subsequent loads', async () => {
    const url = 'test-model.glb';
    
    const gltf1 = await assetCache.load(url);
    const gltf2 = await assetCache.load(url);

    expect(gltf1).toBe(gltf2);
  });

  it('should track loading progress', async () => {
    const url = 'test-model.glb';
    const progressValues: number[] = [];

    const promise = assetCache.load(url, (progress) => {
      progressValues.push(progress);
    });

    await promise;

    expect(progressValues.length).toBeGreaterThan(0);
    expect(progressValues[progressValues.length - 1]).toBe(100);
  });

  it('should handle loading errors', async () => {
    const url = 'error-model.glb';

    await expect(assetCache.load(url)).rejects.toThrow('Asset loading failed');
  });

  it('should allow multiple progress callbacks for same asset', async () => {
    const url = 'test-model.glb';
    const progress1: number[] = [];
    const progress2: number[] = [];

    const promise1 = assetCache.load(url, (p) => progress1.push(p));
    const promise2 = assetCache.load(url, (p) => progress2.push(p));

    await Promise.all([promise1, promise2]);

    expect(progress1.length).toBeGreaterThan(0);
    expect(progress2.length).toBeGreaterThan(0);
  });

  it('should clear specific asset from cache', async () => {
    const url = 'test-model.glb';
    
    await assetCache.load(url);
    expect(assetCache.has(url)).toBe(true);

    assetCache.clearAsset(url);
    expect(assetCache.has(url)).toBe(false);
  });

  it('should clear all assets from cache', async () => {
    await assetCache.load('model1.glb');
    await assetCache.load('model2.glb');

    expect(assetCache.getCacheSize()).toBe(2);

    assetCache.clear();
    expect(assetCache.getCacheSize()).toBe(0);
  });

  it('should return cached URLs', async () => {
    const urls = ['model1.glb', 'model2.glb', 'model3.glb'];

    for (const url of urls) {
      await assetCache.load(url);
    }

    const cachedUrls = assetCache.getCachedUrls();
    expect(cachedUrls).toEqual(expect.arrayContaining(urls));
    expect(cachedUrls.length).toBe(urls.length);
  });

  it('should return loading state for assets', async () => {
    const url = 'test-model.glb';
    
    const loadPromise = assetCache.load(url);
    
    const state = assetCache.getLoadingState(url);
    expect(state).toBeDefined();

    await loadPromise;
    
    const finalState = assetCache.getLoadingState(url);
    expect(finalState).toBeNull();
  });

  it('should handle concurrent loads of the same asset', async () => {
    const url = 'test-model.glb';
    
    const [gltf1, gltf2, gltf3] = await Promise.all([
      assetCache.load(url),
      assetCache.load(url),
      assetCache.load(url),
    ]);

    expect(gltf1).toBe(gltf2);
    expect(gltf2).toBe(gltf3);
    expect(assetCache.getCacheSize()).toBe(1);
  });
});
