/**
 * VR Device Detection Utility
 * Detects WebXR-compatible VR devices and capabilities
 */

export interface VRCapabilities {
  isSupported: boolean;
  isImmersiveVRSupported: boolean;
  isImmersiveARSupported: boolean;
  hasHandTracking: boolean;
  hasHitTest: boolean;
  deviceName?: string;
}

/**
 * Detects if WebXR is available in the current browser
 */
export function isWebXRAvailable(): boolean {
  return 'xr' in navigator;
}

/**
 * Checks if immersive VR mode is supported
 */
export async function checkVRSupport(): Promise<boolean> {
  if (!isWebXRAvailable()) {
    return false;
  }

  try {
    const supported = await navigator.xr?.isSessionSupported('immersive-vr');
    return supported || false;
  } catch (error) {
    console.error('Error checking VR support:', error);
    return false;
  }
}

/**
 * Checks if immersive AR mode is supported
 */
export async function checkARSupport(): Promise<boolean> {
  if (!isWebXRAvailable()) {
    return false;
  }

  try {
    const supported = await navigator.xr?.isSessionSupported('immersive-ar');
    return supported || false;
  } catch (error) {
    console.error('Error checking AR support:', error);
    return false;
  }
}

/**
 * Gets comprehensive VR capabilities of the current device
 */
export async function getVRCapabilities(): Promise<VRCapabilities> {
  const capabilities: VRCapabilities = {
    isSupported: isWebXRAvailable(),
    isImmersiveVRSupported: false,
    isImmersiveARSupported: false,
    hasHandTracking: false,
    hasHitTest: false,
  };

  if (!capabilities.isSupported) {
    return capabilities;
  }

  try {
    // Check immersive VR support
    capabilities.isImmersiveVRSupported = await checkVRSupport();

    // Check immersive AR support
    capabilities.isImmersiveARSupported = await checkARSupport();

    // Attempt to detect device name from user agent
    capabilities.deviceName = detectVRDevice();

  } catch (error) {
    console.error('Error getting VR capabilities:', error);
  }

  return capabilities;
}

/**
 * Detects specific VR device from user agent string
 */
export function detectVRDevice(): string | undefined {
  const userAgent = navigator.userAgent.toLowerCase();

  if (userAgent.includes('quest')) {
    return 'Meta Quest';
  } else if (userAgent.includes('oculus')) {
    return 'Oculus';
  } else if (userAgent.includes('vive')) {
    return 'HTC Vive';
  } else if (userAgent.includes('valve index')) {
    return 'Valve Index';
  } else if (userAgent.includes('windows mixed reality')) {
    return 'Windows Mixed Reality';
  } else if (userAgent.includes('pico')) {
    return 'Pico';
  }

  return undefined;
}

/**
 * Requests a VR session with specified features
 */
export async function requestVRSession(
  requiredFeatures: string[] = ['local-floor'],
  optionalFeatures: string[] = ['bounded-floor', 'hand-tracking']
): Promise<XRSession | null> {
  if (!isWebXRAvailable()) {
    throw new Error('WebXR is not available in this browser');
  }

  try {
    const session = await navigator.xr?.requestSession('immersive-vr', {
      requiredFeatures,
      optionalFeatures,
    });

    return session || null;
  } catch (error) {
    console.error('Error requesting VR session:', error);
    throw error;
  }
}

/**
 * Gets the recommended frame rate for VR rendering
 * Most VR headsets require 90 FPS, some support 120 FPS
 */
export function getRecommendedVRFrameRate(): number {
  const deviceName = detectVRDevice();

  // Quest 2, Quest Pro, Pico 4 support 120Hz
  if (deviceName?.includes('Quest') || deviceName?.includes('Pico')) {
    return 120;
  }

  // Default to 90 FPS for most VR devices
  return 90;
}
