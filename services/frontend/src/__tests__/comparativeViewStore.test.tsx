import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useComparativeViewStore } from '../../stores/comparativeViewStore';

describe('useComparativeViewStore', () => {
  beforeEach(() => {
    const { reset } = useComparativeViewStore.getState();
    reset();
  });

  describe('Initial State', () => {
    it('should have default initial state', () => {
      const { result } = renderHook(() => useComparativeViewStore());

      expect(result.current.leftView.facilityId).toBeNull();
      expect(result.current.rightView.facilityId).toBeNull();
      expect(result.current.splitOrientation).toBe('horizontal');
      expect(result.current.syncCamera).toBe(true);
      expect(result.current.showDifferences).toBe(false);
      expect(result.current.differenceThreshold).toBe(0.1);
    });

    it('should have default camera positions', () => {
      const { result } = renderHook(() => useComparativeViewStore());

      expect(result.current.leftView.cameraPosition).toEqual([5, 5, 5]);
      expect(result.current.rightView.cameraPosition).toEqual([5, 5, 5]);
      expect(result.current.leftView.cameraTarget).toEqual([0, 0, 0]);
      expect(result.current.rightView.cameraTarget).toEqual([0, 0, 0]);
    });
  });

  describe('View Updates', () => {
    it('should update left view facility', () => {
      const { result } = renderHook(() => useComparativeViewStore());

      act(() => {
        result.current.setLeftView({ facilityId: 'facility-1' });
      });

      expect(result.current.leftView.facilityId).toBe('facility-1');
    });

    it('should update right view facility', () => {
      const { result } = renderHook(() => useComparativeViewStore());

      act(() => {
        result.current.setRightView({ facilityId: 'facility-2' });
      });

      expect(result.current.rightView.facilityId).toBe('facility-2');
    });

    it('should update left view timestamp', () => {
      const { result } = renderHook(() => useComparativeViewStore());
      const timestamp = new Date('2024-01-01');

      act(() => {
        result.current.setLeftView({ timestamp });
      });

      expect(result.current.leftView.timestamp).toBe(timestamp);
    });

    it('should update camera position in views', () => {
      const { result } = renderHook(() => useComparativeViewStore());
      const newPosition: [number, number, number] = [10, 10, 10];

      act(() => {
        result.current.setLeftView({ cameraPosition: newPosition });
      });

      expect(result.current.leftView.cameraPosition).toEqual(newPosition);
    });
  });

  describe('Split Orientation', () => {
    it('should toggle split orientation', () => {
      const { result } = renderHook(() => useComparativeViewStore());

      expect(result.current.splitOrientation).toBe('horizontal');

      act(() => {
        result.current.setSplitOrientation('vertical');
      });

      expect(result.current.splitOrientation).toBe('vertical');

      act(() => {
        result.current.setSplitOrientation('horizontal');
      });

      expect(result.current.splitOrientation).toBe('horizontal');
    });
  });

  describe('Camera Synchronization', () => {
    it('should toggle sync camera', () => {
      const { result } = renderHook(() => useComparativeViewStore());

      expect(result.current.syncCamera).toBe(true);

      act(() => {
        result.current.toggleSyncCamera();
      });

      expect(result.current.syncCamera).toBe(false);

      act(() => {
        result.current.toggleSyncCamera();
      });

      expect(result.current.syncCamera).toBe(true);
    });

    it('should sync camera position when enabled', () => {
      const { result } = renderHook(() => useComparativeViewStore());
      const position: [number, number, number] = [10, 15, 20];
      const target: [number, number, number] = [1, 2, 3];

      act(() => {
        result.current.syncCameraPosition(position, target);
      });

      expect(result.current.leftView.cameraPosition).toEqual(position);
      expect(result.current.rightView.cameraPosition).toEqual(position);
      expect(result.current.leftView.cameraTarget).toEqual(target);
      expect(result.current.rightView.cameraTarget).toEqual(target);
    });

    it('should not sync camera position when disabled', () => {
      const { result } = renderHook(() => useComparativeViewStore());
      const originalLeftPosition = [...result.current.leftView.cameraPosition];
      const originalRightPosition = [...result.current.rightView.cameraPosition];

      act(() => {
        result.current.toggleSyncCamera(); // Disable sync
        result.current.syncCameraPosition([10, 15, 20], [1, 2, 3]);
      });

      expect(result.current.leftView.cameraPosition).toEqual(originalLeftPosition);
      expect(result.current.rightView.cameraPosition).toEqual(originalRightPosition);
    });
  });

  describe('Difference Highlighting', () => {
    it('should toggle show differences', () => {
      const { result } = renderHook(() => useComparativeViewStore());

      expect(result.current.showDifferences).toBe(false);

      act(() => {
        result.current.toggleShowDifferences();
      });

      expect(result.current.showDifferences).toBe(true);

      act(() => {
        result.current.toggleShowDifferences();
      });

      expect(result.current.showDifferences).toBe(false);
    });

    it('should update difference threshold', () => {
      const { result } = renderHook(() => useComparativeViewStore());

      act(() => {
        result.current.setDifferenceThreshold(0.5);
      });

      expect(result.current.differenceThreshold).toBe(0.5);
    });

    it('should clamp difference threshold between 0 and 1', () => {
      const { result } = renderHook(() => useComparativeViewStore());

      act(() => {
        result.current.setDifferenceThreshold(-0.5);
      });

      expect(result.current.differenceThreshold).toBe(0);

      act(() => {
        result.current.setDifferenceThreshold(1.5);
      });

      expect(result.current.differenceThreshold).toBe(1);
    });
  });

  describe('Performance Metrics', () => {
    it('should update performance metrics', () => {
      const { result } = renderHook(() => useComparativeViewStore());

      act(() => {
        result.current.updatePerformanceMetrics({
          fps: 60,
          leftViewFps: 59,
          rightViewFps: 58,
          renderTime: 16.5,
        });
      });

      expect(result.current.performanceMetrics.fps).toBe(60);
      expect(result.current.performanceMetrics.leftViewFps).toBe(59);
      expect(result.current.performanceMetrics.rightViewFps).toBe(58);
      expect(result.current.performanceMetrics.renderTime).toBe(16.5);
    });

    it('should partially update performance metrics', () => {
      const { result } = renderHook(() => useComparativeViewStore());

      act(() => {
        result.current.updatePerformanceMetrics({ fps: 45 });
      });

      expect(result.current.performanceMetrics.fps).toBe(45);
      expect(result.current.performanceMetrics.leftViewFps).toBe(0); // Still default
    });
  });

  describe('Reset', () => {
    it('should reset to initial state', () => {
      const { result } = renderHook(() => useComparativeViewStore());

      // Make changes
      act(() => {
        result.current.setLeftView({ facilityId: 'facility-1' });
        result.current.setRightView({ facilityId: 'facility-2' });
        result.current.setSplitOrientation('vertical');
        result.current.toggleSyncCamera();
        result.current.toggleShowDifferences();
        result.current.setDifferenceThreshold(0.8);
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      // Verify reset
      expect(result.current.leftView.facilityId).toBeNull();
      expect(result.current.rightView.facilityId).toBeNull();
      expect(result.current.splitOrientation).toBe('horizontal');
      expect(result.current.syncCamera).toBe(true);
      expect(result.current.showDifferences).toBe(false);
      expect(result.current.differenceThreshold).toBe(0.1);
    });
  });
});
