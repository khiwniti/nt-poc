import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardNavigation3D } from '../useKeyboardNavigation3D';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Camera } from 'three';

describe('useKeyboardNavigation3D', () => {
  let controlsRef: React.RefObject<OrbitControlsImpl>;
  let cameraRef: React.RefObject<Camera>;
  let onZoneSelect: ReturnType<typeof vi.fn>;
  let onAnnouncement: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock refs
    const mockControls = {
      target: { x: 0, y: 0, z: 0 },
      update: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any;

    const mockCamera = {
      position: { x: 5, y: 5, z: 5 },
    } as any;

    controlsRef = { current: mockControls };
    cameraRef = { current: mockCamera };
    onZoneSelect = vi.fn();
    onAnnouncement = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should handle arrow key navigation', () => {
    renderHook(() =>
      useKeyboardNavigation3D(controlsRef, cameraRef, {
        enabled: true,
        onZoneSelect,
        onAnnouncement,
      })
    );

    const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    window.dispatchEvent(event);

    expect(onAnnouncement).toHaveBeenCalledWith(expect.stringContaining('Rotated'));
    expect(controlsRef.current?.update).toHaveBeenCalled();
  });

  it('should handle zoom in/out with +/- keys', () => {
    renderHook(() =>
      useKeyboardNavigation3D(controlsRef, cameraRef, {
        enabled: true,
        onAnnouncement,
      })
    );

    const zoomInEvent = new KeyboardEvent('keydown', { key: '+' });
    window.dispatchEvent(zoomInEvent);
    expect(onAnnouncement).toHaveBeenCalledWith('Zoomed in');

    const zoomOutEvent = new KeyboardEvent('keydown', { key: '-' });
    window.dispatchEvent(zoomOutEvent);
    expect(onAnnouncement).toHaveBeenCalledWith('Zoomed out');
  });

  it('should handle tab navigation through zones', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation3D(controlsRef, cameraRef, {
        enabled: true,
        onZoneSelect,
        onAnnouncement,
      })
    );

    act(() => {
      result.current.setTotalZones(3);
    });

    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
    window.dispatchEvent(tabEvent);

    expect(onZoneSelect).toHaveBeenCalledWith(1);
  });

  it('should handle Enter key for zone selection', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation3D(controlsRef, cameraRef, {
        enabled: true,
        onZoneSelect,
        onAnnouncement,
      })
    );

    act(() => {
      result.current.setTotalZones(3);
    });

    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    window.dispatchEvent(enterEvent);

    expect(onZoneSelect).toHaveBeenCalled();
  });

  it('should handle Escape key to deselect', () => {
    renderHook(() =>
      useKeyboardNavigation3D(controlsRef, cameraRef, {
        enabled: true,
        onZoneSelect,
        onAnnouncement,
      })
    );

    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    window.dispatchEvent(escapeEvent);

    expect(onZoneSelect).toHaveBeenCalledWith(-1);
    expect(onAnnouncement).toHaveBeenCalledWith('Zone deselected');
  });

  it('should show help with ? key', () => {
    renderHook(() =>
      useKeyboardNavigation3D(controlsRef, cameraRef, {
        enabled: true,
        onAnnouncement,
      })
    );

    const helpEvent = new KeyboardEvent('keydown', { key: '?' });
    window.dispatchEvent(helpEvent);

    expect(onAnnouncement).toHaveBeenCalledWith(
      expect.stringContaining('Keyboard shortcuts')
    );
  });

  it('should handle pan with Shift+Arrow keys', () => {
    renderHook(() =>
      useKeyboardNavigation3D(controlsRef, cameraRef, {
        enabled: true,
        onAnnouncement,
      })
    );

    const event = new KeyboardEvent('keydown', { key: 'ArrowUp', shiftKey: true });
    window.dispatchEvent(event);

    expect(onAnnouncement).toHaveBeenCalledWith('Panned up');
  });

  it('should not respond when disabled', () => {
    renderHook(() =>
      useKeyboardNavigation3D(controlsRef, cameraRef, {
        enabled: false,
        onAnnouncement,
      })
    );

    const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    window.dispatchEvent(event);

    expect(onAnnouncement).not.toHaveBeenCalled();
  });
});
