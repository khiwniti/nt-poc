import { Volume2, VolumeX, Play } from 'lucide-react';
import { useAlertSoundStore } from '../stores/alertSoundStore';
import { getAlertSoundPlayer } from '../utils/alertSounds';

export function AlertSoundSettings() {
  const soundStore = useAlertSoundStore();
  const { settings, setEnabled, setVolume, setRespectReducedMotion } = soundStore;

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);

    // Update sound player volume
    const player = getAlertSoundPlayer();
    player.setVolume(newVolume);
  };

  const handleTestSound = async (severity: 'critical' | 'high' | 'medium') => {
    const player = getAlertSoundPlayer();
    await player.resume();
    await player.playSeverityBeep(severity);
  };

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        padding: '1.5rem',
      }}
    >
      <h3
        style={{
          margin: '0 0 1rem',
          fontSize: '1.125rem',
          fontWeight: '600',
          color: '#111827',
        }}
      >
        Alert Sound Notifications
      </h3>

      {/* Mute Toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem',
          backgroundColor: '#f9fafb',
          borderRadius: '6px',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {settings.enabled ? (
            <Volume2 size={20} color="#10b981" />
          ) : (
            <VolumeX size={20} color="#6b7280" />
          )}
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
              Sound Notifications
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              {settings.enabled ? 'Enabled' : 'Muted'}
            </div>
          </div>
        </div>
        <button
          onClick={() => setEnabled(!settings.enabled)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: settings.enabled ? '#10b981' : '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '600',
            transition: 'background-color 0.2s',
          }}
          aria-label={settings.enabled ? 'Mute alerts' : 'Unmute alerts'}
        >
          {settings.enabled ? 'Mute' : 'Unmute'}
        </button>
      </div>

      {/* Volume Control */}
      <div
        style={{
          padding: '1rem',
          backgroundColor: '#f9fafb',
          borderRadius: '6px',
          marginBottom: '1rem',
        }}
      >
        <label
          htmlFor="alert-volume"
          style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '0.75rem',
          }}
        >
          Volume: {Math.round(settings.volume * 100)}%
        </label>
        <input
          id="alert-volume"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={settings.volume}
          onChange={handleVolumeChange}
          disabled={!settings.enabled}
          style={{
            width: '100%',
            cursor: settings.enabled ? 'pointer' : 'not-allowed',
            opacity: settings.enabled ? 1 : 0.5,
          }}
          aria-label="Alert sound volume"
        />
      </div>

      {/* Test Sounds */}
      <div
        style={{
          padding: '1rem',
          backgroundColor: '#f9fafb',
          borderRadius: '6px',
          marginBottom: '1rem',
        }}
      >
        <div
          style={{
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '0.75rem',
          }}
        >
          Test Alert Sounds
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleTestSound('critical')}
            disabled={!settings.enabled}
            style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: settings.enabled ? '#ef4444' : '#e5e7eb',
              color: settings.enabled ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: '6px',
              cursor: settings.enabled ? 'pointer' : 'not-allowed',
              fontSize: '0.875rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Play size={14} />
            Critical
          </button>
          <button
            onClick={() => handleTestSound('high')}
            disabled={!settings.enabled}
            style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: settings.enabled ? '#f59e0b' : '#e5e7eb',
              color: settings.enabled ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: '6px',
              cursor: settings.enabled ? 'pointer' : 'not-allowed',
              fontSize: '0.875rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Play size={14} />
            High
          </button>
          <button
            onClick={() => handleTestSound('medium')}
            disabled={!settings.enabled}
            style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: settings.enabled ? '#3b82f6' : '#e5e7eb',
              color: settings.enabled ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: '6px',
              cursor: settings.enabled ? 'pointer' : 'not-allowed',
              fontSize: '0.875rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Play size={14} />
            Medium
          </button>
        </div>
      </div>

      {/* Accessibility */}
      <div
        style={{
          padding: '1rem',
          backgroundColor: '#f9fafb',
          borderRadius: '6px',
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={settings.respectReducedMotion}
            onChange={(e) => setRespectReducedMotion(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
              Respect reduced motion preference
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              Disable sounds when user prefers reduced motion
              {prefersReducedMotion && ' (currently active)'}
            </div>
          </div>
        </label>
      </div>

      {prefersReducedMotion && settings.respectReducedMotion && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            backgroundColor: '#fef3c7',
            color: '#92400e',
            borderRadius: '6px',
            fontSize: '0.875rem',
          }}
          role="status"
        >
          Alert sounds are currently disabled due to your reduced motion preference.
        </div>
      )}
    </div>
  );
}
