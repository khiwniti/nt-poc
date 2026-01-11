import { useEffect, useRef } from 'react';
import { Alert } from '../types';
import { getAlertSoundPlayer, AlertSeverity } from '../utils/alertSounds';
import { useAlertSoundStore } from '../stores/alertSoundStore';

export function useAlertSoundNotification(alerts: Alert[]) {
  const previousAlertsRef = useRef<Set<string>>(new Set());
  const soundStore = useAlertSoundStore();
  const soundPlayerRef = useRef(getAlertSoundPlayer());

  useEffect(() => {
    const soundPlayer = soundPlayerRef.current;

    // Update volume when settings change
    soundPlayer.setVolume(soundStore.settings.volume);
  }, [soundStore.settings.volume]);

  useEffect(() => {
    if (!soundStore.shouldPlaySound()) {
      return;
    }

    const currentAlertIds = new Set(alerts.map((a) => a.id));
    const previousAlertIds = previousAlertsRef.current;

    // Find new alerts (alerts that weren't in the previous set)
    const newAlerts = alerts.filter(
      (alert) => !previousAlertIds.has(alert.id) && alert.status === 'active'
    );

    // Play sound for each new alert (limited to prevent sound spam)
    if (newAlerts.length > 0) {
      // Resume audio context on user interaction (required by browsers)
      soundPlayerRef.current.resume().catch(() => {
        // Silently fail if resume is not possible
      });

      // Play sound for the most severe new alert
      const mostSevereAlert = newAlerts.reduce((prev, current) => {
        const severityOrder: Record<string, number> = {
          critical: 4,
          high: 3,
          warning: 3,
          medium: 2,
          info: 1,
          low: 0,
        };

        const prevSeverity = severityOrder[prev.severity] || 0;
        const currentSeverity = severityOrder[current.severity] || 0;

        return currentSeverity > prevSeverity ? current : prev;
      }, newAlerts[0]);

      // Play sound for most severe alert
      soundPlayerRef.current
        .playSeverityBeep(mostSevereAlert.severity as AlertSeverity)
        .catch((error) => {
          console.warn('Failed to play alert sound:', error);
        });
    }

    // Update the previous alerts set
    previousAlertsRef.current = currentAlertIds;
  }, [alerts, soundStore]);

  return {
    playTestSound: (severity: AlertSeverity) => {
      if (!soundStore.shouldPlaySound()) {
        return Promise.resolve();
      }
      return soundPlayerRef.current.playSeverityBeep(severity);
    },
  };
}
