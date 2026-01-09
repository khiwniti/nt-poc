export interface AssetLoadingIndicatorProps {
  isLoading: boolean;
  progress: number;
  error: string | null;
  assetName?: string;
  onRetry?: () => void;
}

export function AssetLoadingIndicator({
  isLoading,
  progress,
  error,
  assetName = 'Asset',
  onRetry,
}: AssetLoadingIndicatorProps) {
  if (error) {
    return (
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255, 0, 0, 0.9)',
          color: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          textAlign: 'center',
          maxWidth: '400px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          Failed to load {assetName}
        </div>
        <div style={{ fontSize: '0.9rem', marginBottom: '1rem', opacity: 0.9 }}>
          {error}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              background: 'white',
              color: '#dc2626',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          textAlign: 'center',
          minWidth: '250px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          Loading {assetName}...
        </div>
        <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '4px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
              transition: 'width 0.3s ease',
              borderRadius: '4px',
            }}
          />
        </div>
        <div style={{ fontSize: '0.875rem', marginTop: '0.5rem', opacity: 0.8 }}>
          {Math.round(progress)}%
        </div>
      </div>
    );
  }

  return null;
}
