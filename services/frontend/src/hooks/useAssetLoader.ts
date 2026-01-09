import { useEffect, useState } from 'react';
import { assetCache } from '../utils/assetLoader';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface UseAssetLoaderOptions {
  url: string | null;
  enabled?: boolean;
}

export interface UseAssetLoaderResult {
  gltf: GLTF | null;
  isLoading: boolean;
  progress: number;
  error: string | null;
  reload: () => void;
}

export function useAssetLoader({ url, enabled = true }: UseAssetLoaderOptions): UseAssetLoaderResult {
  const [gltf, setGltf] = useState<GLTF | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    if (!url || !enabled) {
      setGltf(null);
      setIsLoading(false);
      setProgress(0);
      setError(null);
      return;
    }

    let cancelled = false;

    const loadAsset = async () => {
      setIsLoading(true);
      setProgress(0);
      setError(null);

      try {
        const loadedGltf = await assetCache.load(url, (p) => {
          if (!cancelled) {
            setProgress(p);
          }
        });

        if (!cancelled) {
          setGltf(loadedGltf);
          setIsLoading(false);
          setProgress(100);
        }
      } catch (err) {
        if (!cancelled) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load asset';
          setError(errorMessage);
          setIsLoading(false);
          setProgress(0);
        }
      }
    };

    loadAsset();

    return () => {
      cancelled = true;
    };
  }, [url, enabled, reloadTrigger]);

  const reload = () => {
    if (url) {
      assetCache.clearAsset(url);
      setReloadTrigger((prev) => prev + 1);
    }
  };

  return {
    gltf,
    isLoading,
    progress,
    error,
    reload,
  };
}
