import { AlertSoundSettings } from '../components/AlertSoundSettings';

function SettingsPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h2
        style={{ marginBottom: '2rem', fontSize: '1.75rem', fontWeight: '600', color: '#111827' }}
      >
        Settings
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <AlertSoundSettings />

        {/* Placeholder for future settings sections */}
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
              margin: '0 0 0.5rem',
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#111827',
            }}
          >
            Additional Settings
          </h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
            More settings will be available here in future updates.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
