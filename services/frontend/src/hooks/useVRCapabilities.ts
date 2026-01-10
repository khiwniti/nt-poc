import { useState, useEffect } from 'react';
import { getVRCapabilities, VRCapabilities } from '../utils/vrDetection';

/**
 * Hook to detect VR capabilities and device support
 */
export function useVRCapabilities() {
  const [capabilities, setCapabilities] = useState<VRCapabilities>({
    isSupported: false,
    isImmersiveVRSupported: false,
    isImmersiveARSupported: false,
    hasHandTracking: false,
    hasHitTest: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function detectCapabilities() {
      try {
        setIsLoading(true);
        const caps = await getVRCapabilities();

        if (mounted) {
          setCapabilities(caps);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to detect VR capabilities'));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    detectCapabilities();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    capabilities,
    isLoading,
    error,
    isVRSupported: capabilities.isImmersiveVRSupported,
  };
}
