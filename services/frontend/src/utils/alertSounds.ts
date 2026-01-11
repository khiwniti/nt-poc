// Alert sound notification system
// Provides different sounds for different alert severity levels

export const ALERT_SOUNDS = {
  critical:
    'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFgH16dXBrbGdko6Wno6GfnZuamZiXlpWUk5KRkJCPjo6NjYyMi4uKioqJiYmIiIiHh4eGhoaFhYWEhISDg4ODg4KCgoKBgYGBgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA',
  high: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAgICAgICAgICAgYGBgoKChISEhYWFh4eHiImJi4uLjY2Nj4+PkZGRk5OTlZWVl5eXmZmZm5ubnZ2dn5+foaGho6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Oj',
  medium:
    'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAgICAgICAgYGBgoKChISFhYaGh4iIiYqKi4yMjY6Oj5CQkZKSk5SUlZaWl5iYmZqam5ycnZ6en6Cgo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojow==',
};

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'warning';

export class AlertSoundPlayer {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new AudioContext();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
    }
  }

  setVolume(volume: number) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  async play(severity: AlertSeverity): Promise<void> {
    // Map severity to sound types
    let soundKey: keyof typeof ALERT_SOUNDS;

    if (severity === 'critical') {
      soundKey = 'critical';
    } else if (severity === 'high' || severity === 'warning') {
      soundKey = 'high';
    } else {
      soundKey = 'medium';
    }

    const soundData = ALERT_SOUNDS[soundKey];

    try {
      // Use Web Audio API for more reliable playback
      if (this.audioContext && this.masterGain) {
        const response = await fetch(soundData);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.masterGain);
        source.start(0);
      } else {
        // Fallback to HTML5 Audio
        const audio = new Audio(soundData);
        await audio.play();
      }
    } catch (error) {
      console.warn('Failed to play alert sound:', error);
    }
  }

  // Generate a simple beep sound programmatically
  async playBeep(frequency: number, duration: number = 200): Promise<void> {
    if (!this.audioContext || !this.masterGain) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        this.audioContext.currentTime + duration / 1000
      );

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration / 1000);
    } catch (error) {
      console.warn('Failed to play beep:', error);
    }
  }

  async playSeverityBeep(severity: AlertSeverity): Promise<void> {
    // Different frequencies for different severities
    let frequency: number;
    let duration: number;

    switch (severity) {
      case 'critical':
        frequency = 880; // A5 - high pitched
        duration = 300;
        // Play twice for critical
        await this.playBeep(frequency, duration);
        await new Promise((resolve) => setTimeout(resolve, 100));
        await this.playBeep(frequency, duration);
        break;
      case 'high':
      case 'warning':
        frequency = 659; // E5 - medium-high pitched
        duration = 250;
        await this.playBeep(frequency, duration);
        break;
      case 'medium':
      case 'info':
        frequency = 523; // C5 - medium pitched
        duration = 200;
        await this.playBeep(frequency, duration);
        break;
      default:
        frequency = 440; // A4 - lower pitched
        duration = 150;
        await this.playBeep(frequency, duration);
    }
  }

  async resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }
}

// Singleton instance
let soundPlayerInstance: AlertSoundPlayer | null = null;

export function getAlertSoundPlayer(): AlertSoundPlayer {
  if (!soundPlayerInstance) {
    soundPlayerInstance = new AlertSoundPlayer();
  }
  return soundPlayerInstance;
}
