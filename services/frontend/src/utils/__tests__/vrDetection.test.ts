import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isWebXRAvailable,
  checkVRSupport,
  checkARSupport,
  getVRCapabilities,
  detectVRDevice,
  getRecommendedVRFrameRate,
} from '../vrDetection';

// Mock navigator.xr
const mockNavigator = () => {
  const xrMock = {
    isSessionSupported: vi.fn(),
    requestSession: vi.fn(),
  };

  Object.defineProperty(global.navigator, 'xr', {
    value: xrMock,
    writable: true,
    configurable: true,
  });

  return xrMock;
};

describe('vrDetection', () => {
  describe('isWebXRAvailable', () => {
    it('should return true when WebXR is available', () => {
      mockNavigator();
      expect(isWebXRAvailable()).toBe(true);
    });

    it('should return false when WebXR is not available', () => {
      // @ts-ignore
      delete global.navigator.xr;
      expect(isWebXRAvailable()).toBe(false);
    });
  });

  describe('checkVRSupport', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return true when VR is supported', async () => {
      const xrMock = mockNavigator();
      xrMock.isSessionSupported.mockResolvedValue(true);

      const result = await checkVRSupport();
      expect(result).toBe(true);
      expect(xrMock.isSessionSupported).toHaveBeenCalledWith('immersive-vr');
    });

    it('should return false when VR is not supported', async () => {
      const xrMock = mockNavigator();
      xrMock.isSessionSupported.mockResolvedValue(false);

      const result = await checkVRSupport();
      expect(result).toBe(false);
    });

    it('should return false when WebXR is not available', async () => {
      // @ts-ignore
      delete global.navigator.xr;
      const result = await checkVRSupport();
      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      const xrMock = mockNavigator();
      xrMock.isSessionSupported.mockRejectedValue(new Error('Test error'));

      const result = await checkVRSupport();
      expect(result).toBe(false);
    });
  });

  describe('checkARSupport', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return true when AR is supported', async () => {
      const xrMock = mockNavigator();
      xrMock.isSessionSupported.mockResolvedValue(true);

      const result = await checkARSupport();
      expect(result).toBe(true);
      expect(xrMock.isSessionSupported).toHaveBeenCalledWith('immersive-ar');
    });

    it('should return false when AR is not supported', async () => {
      const xrMock = mockNavigator();
      xrMock.isSessionSupported.mockResolvedValue(false);

      const result = await checkARSupport();
      expect(result).toBe(false);
    });
  });

  describe('getVRCapabilities', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return full capabilities when VR is supported', async () => {
      const xrMock = mockNavigator();
      xrMock.isSessionSupported.mockImplementation((mode) => {
        return Promise.resolve(mode === 'immersive-vr');
      });

      // Mock user agent for Quest
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Quest 2',
        writable: true,
        configurable: true,
      });

      const capabilities = await getVRCapabilities();

      expect(capabilities.isSupported).toBe(true);
      expect(capabilities.isImmersiveVRSupported).toBe(true);
      expect(capabilities.isImmersiveARSupported).toBe(false);
      expect(capabilities.deviceName).toBe('Meta Quest');
    });

    it('should return minimal capabilities when WebXR is not available', async () => {
      // @ts-ignore
      delete global.navigator.xr;

      const capabilities = await getVRCapabilities();

      expect(capabilities.isSupported).toBe(false);
      expect(capabilities.isImmersiveVRSupported).toBe(false);
      expect(capabilities.isImmersiveARSupported).toBe(false);
    });
  });

  describe('detectVRDevice', () => {
    const testCases = [
      { userAgent: 'quest 2', expected: 'Meta Quest' },
      { userAgent: 'oculus rift', expected: 'Oculus' },
      { userAgent: 'htc vive pro', expected: 'HTC Vive' },
      { userAgent: 'valve index', expected: 'Valve Index' },
      { userAgent: 'windows mixed reality', expected: 'Windows Mixed Reality' },
      { userAgent: 'pico 4', expected: 'Pico' },
      { userAgent: 'unknown device', expected: undefined },
    ];

    testCases.forEach(({ userAgent, expected }) => {
      it(`should detect ${expected || 'unknown'} from user agent: ${userAgent}`, () => {
        Object.defineProperty(global.navigator, 'userAgent', {
          value: userAgent,
          writable: true,
          configurable: true,
        });

        const result = detectVRDevice();
        expect(result).toBe(expected);
      });
    });
  });

  describe('getRecommendedVRFrameRate', () => {
    it('should return 120 FPS for Quest devices', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Quest 2',
        writable: true,
        configurable: true,
      });

      expect(getRecommendedVRFrameRate()).toBe(120);
    });

    it('should return 120 FPS for Pico devices', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Pico 4',
        writable: true,
        configurable: true,
      });

      expect(getRecommendedVRFrameRate()).toBe(120);
    });

    it('should return 90 FPS for other devices', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'HTC Vive',
        writable: true,
        configurable: true,
      });

      expect(getRecommendedVRFrameRate()).toBe(90);
    });

    it('should return 90 FPS for unknown devices', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Unknown Device',
        writable: true,
        configurable: true,
      });

      expect(getRecommendedVRFrameRate()).toBe(90);
    });
  });
});
