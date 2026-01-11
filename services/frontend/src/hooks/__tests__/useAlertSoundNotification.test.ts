import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAlertSoundNotification } from '../useAlertSoundNotification';
import { Alert } from '../../types';
import * as alertSounds from '../../utils/alertSounds';
import * as alertSoundStore from '../../stores/alertSoundStore';

vi.mock('../../utils/alertSounds');
vi.mock('../../stores/alertSoundStore');

describe('useAlertSoundNotification', () => {
  const mockPlaySeverityBeep = vi.fn();
  const mockResume = vi.fn();
  const mockSetVolume = vi.fn();
  const mockShouldPlaySound = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockPlaySeverityBeep.mockResolvedValue(undefined);
    mockResume.mockResolvedValue(undefined);
    mockShouldPlaySound.mockReturnValue(true);

    vi.mocked(alertSounds.getAlertSoundPlayer).mockReturnValue({
      playSeverityBeep: mockPlaySeverityBeep,
      resume: mockResume,
      setVolume: mockSetVolume,
      play: vi.fn(),
      playBeep: vi.fn(),
    } as any);

    vi.mocked(alertSoundStore.useAlertSoundStore).mockReturnValue({
      settings: { enabled: true, volume: 0.7, respectReducedMotion: true },
      setEnabled: vi.fn(),
      setVolume: vi.fn(),
      setRespectReducedMotion: vi.fn(),
      toggleMute: vi.fn(),
      shouldPlaySound: mockShouldPlaySound,
    } as any);
  });

  it('should not play sound on initial render', () => {
    const alerts: Alert[] = [
      {
        id: '1',
        severity: 'critical',
        status: 'active',
        facilityId: 'f1',
        zoneId: 'z1',
        batterySystemId: 'b1',
        type: 'temperature',
        message: 'Test alert',
        createdAt: Date.now(),
      } as Alert,
    ];

    renderHook(() => useAlertSoundNotification(alerts));

    expect(mockPlaySeverityBeep).not.toHaveBeenCalled();
  });

  it('should play sound when a new alert arrives', () => {
    const initialAlerts: Alert[] = [];

    const { rerender } = renderHook(({ alerts }) => useAlertSoundNotification(alerts), {
      initialProps: { alerts: initialAlerts },
    });

    const newAlerts: Alert[] = [
      {
        id: '1',
        severity: 'critical',
        status: 'active',
        facilityId: 'f1',
        zoneId: 'z1',
        batterySystemId: 'b1',
        type: 'temperature',
        message: 'Test alert',
        createdAt: Date.now(),
      } as Alert,
    ];

    rerender({ alerts: newAlerts });

    expect(mockPlaySeverityBeep).toHaveBeenCalledWith('critical');
  });

  it('should not play sound when sound is disabled', () => {
    mockShouldPlaySound.mockReturnValue(false);

    const initialAlerts: Alert[] = [];

    const { rerender } = renderHook(({ alerts }) => useAlertSoundNotification(alerts), {
      initialProps: { alerts: initialAlerts },
    });

    const newAlerts: Alert[] = [
      {
        id: '1',
        severity: 'critical',
        status: 'active',
        facilityId: 'f1',
        zoneId: 'z1',
        batterySystemId: 'b1',
        type: 'temperature',
        message: 'Test alert',
        createdAt: Date.now(),
      } as Alert,
    ];

    rerender({ alerts: newAlerts });

    expect(mockPlaySeverityBeep).not.toHaveBeenCalled();
  });

  it('should not play sound for acknowledged alerts', () => {
    const initialAlerts: Alert[] = [];

    const { rerender } = renderHook(({ alerts }) => useAlertSoundNotification(alerts), {
      initialProps: { alerts: initialAlerts },
    });

    const newAlerts: Alert[] = [
      {
        id: '1',
        severity: 'critical',
        status: 'acknowledged',
        facilityId: 'f1',
        zoneId: 'z1',
        batterySystemId: 'b1',
        type: 'temperature',
        message: 'Test alert',
        createdAt: Date.now(),
      } as Alert,
    ];

    rerender({ alerts: newAlerts });

    expect(mockPlaySeverityBeep).not.toHaveBeenCalled();
  });

  it('should play sound for most severe alert when multiple new alerts arrive', () => {
    const initialAlerts: Alert[] = [];

    const { rerender } = renderHook(({ alerts }) => useAlertSoundNotification(alerts), {
      initialProps: { alerts: initialAlerts },
    });

    const newAlerts: Alert[] = [
      {
        id: '1',
        severity: 'medium',
        status: 'active',
        facilityId: 'f1',
        zoneId: 'z1',
        batterySystemId: 'b1',
        type: 'temperature',
        message: 'Test alert 1',
        createdAt: Date.now(),
      } as Alert,
      {
        id: '2',
        severity: 'critical',
        status: 'active',
        facilityId: 'f1',
        zoneId: 'z1',
        batterySystemId: 'b1',
        type: 'temperature',
        message: 'Test alert 2',
        createdAt: Date.now(),
      } as Alert,
      {
        id: '3',
        severity: 'high',
        status: 'active',
        facilityId: 'f1',
        zoneId: 'z1',
        batterySystemId: 'b1',
        type: 'temperature',
        message: 'Test alert 3',
        createdAt: Date.now(),
      } as Alert,
    ];

    rerender({ alerts: newAlerts });

    expect(mockPlaySeverityBeep).toHaveBeenCalledWith('critical');
    expect(mockPlaySeverityBeep).toHaveBeenCalledTimes(1);
  });

  it('should update volume when settings change', () => {
    const alerts: Alert[] = [];

    const { rerender } = renderHook(() => useAlertSoundNotification(alerts));

    expect(mockSetVolume).toHaveBeenCalledWith(0.7);

    vi.mocked(alertSoundStore.useAlertSoundStore).mockReturnValue({
      settings: { enabled: true, volume: 0.5, respectReducedMotion: true },
      setEnabled: vi.fn(),
      setVolume: vi.fn(),
      setRespectReducedMotion: vi.fn(),
      toggleMute: vi.fn(),
      shouldPlaySound: mockShouldPlaySound,
    } as any);

    rerender();

    expect(mockSetVolume).toHaveBeenCalledWith(0.5);
  });

  it('should provide playTestSound function', () => {
    const alerts: Alert[] = [];

    const { result } = renderHook(() => useAlertSoundNotification(alerts));

    act(() => {
      result.current.playTestSound('high');
    });

    expect(mockPlaySeverityBeep).toHaveBeenCalledWith('high');
  });
});
