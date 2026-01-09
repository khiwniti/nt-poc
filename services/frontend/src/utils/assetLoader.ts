import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface AssetLoadingState {
  isLoading: boolean;
  progress: number;
  error: string | null;
}

export interface CachedAsset {
  gltf: GLTF;
  url: string;
  timestamp: number;
}

class AssetCache {
  private cache = new Map<string, CachedAsset>();
  private loader = new GLTFLoader();
  private loadingStates = new Map<string, AssetLoadingState>();
  private progressCallbacks = new Map<string, Set<(progress: number) => void>>();

  async load(url: string, onProgress?: (progress: number) => void): Promise<GLTF> {
    const cached = this.cache.get(url);
    if (cached) {
      return cached.gltf;
    }

    if (this.loadingStates.has(url)) {
      return this.waitForLoad(url, onProgress);
    }

    this.loadingStates.set(url, {
      isLoading: true,
      progress: 0,
      error: null,
    });

    if (onProgress) {
      this.addProgressCallback(url, onProgress);
    }

    try {
      const gltf = await new Promise<GLTF>((resolve, reject) => {
        this.loader.load(
          url,
          (gltf: GLTF) => resolve(gltf),
          (event: ProgressEvent) => {
            if (event.lengthComputable) {
              const progress = (event.loaded / event.total) * 100;
              this.updateProgress(url, progress);
            }
          },
          (error: unknown) => reject(error)
        );
      });

      this.cache.set(url, {
        gltf,
        url,
        timestamp: Date.now(),
      });

      this.loadingStates.delete(url);
      this.progressCallbacks.delete(url);

      return gltf;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load asset';
      
      this.loadingStates.set(url, {
        isLoading: false,
        progress: 0,
        error: errorMessage,
      });

      this.progressCallbacks.delete(url);

      throw new Error(`Asset loading failed for ${url}: ${errorMessage}`);
    }
  }

  private async waitForLoad(url: string, onProgress?: (progress: number) => void): Promise<GLTF> {
    if (onProgress) {
      this.addProgressCallback(url, onProgress);
    }

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const state = this.loadingStates.get(url);
        const cached = this.cache.get(url);

        if (cached) {
          clearInterval(checkInterval);
          if (onProgress) {
            this.removeProgressCallback(url, onProgress);
          }
          resolve(cached.gltf);
        } else if (state?.error) {
          clearInterval(checkInterval);
          if (onProgress) {
            this.removeProgressCallback(url, onProgress);
          }
          reject(new Error(state.error));
        }
      }, 100);
    });
  }

  private addProgressCallback(url: string, callback: (progress: number) => void): void {
    if (!this.progressCallbacks.has(url)) {
      this.progressCallbacks.set(url, new Set());
    }
    this.progressCallbacks.get(url)!.add(callback);
  }

  private removeProgressCallback(url: string, callback: (progress: number) => void): void {
    const callbacks = this.progressCallbacks.get(url);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  private updateProgress(url: string, progress: number): void {
    const state = this.loadingStates.get(url);
    if (state) {
      state.progress = progress;
    }

    const callbacks = this.progressCallbacks.get(url);
    if (callbacks) {
      callbacks.forEach((callback) => callback(progress));
    }
  }

  getLoadingState(url: string): AssetLoadingState | null {
    return this.loadingStates.get(url) || null;
  }

  has(url: string): boolean {
    return this.cache.has(url);
  }

  clear(): void {
    this.cache.clear();
    this.loadingStates.clear();
    this.progressCallbacks.clear();
  }

  clearAsset(url: string): void {
    this.cache.delete(url);
    this.loadingStates.delete(url);
    this.progressCallbacks.delete(url);
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  getCachedUrls(): string[] {
    return Array.from(this.cache.keys());
  }
}

export const assetCache = new AssetCache();
