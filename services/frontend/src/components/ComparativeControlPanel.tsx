import { useComparativeViewStore } from '../stores/comparativeViewStore';

interface TimeSelectionProps {
  side: 'left' | 'right';
  facilityId: string | null;
  timestamp: Date | null;
  onFacilityChange: (facilityId: string) => void;
  onTimestampChange: (timestamp: Date) => void;
}

function TimeSelection({
  side,
  facilityId,
  timestamp,
  onFacilityChange,
  onTimestampChange,
}: TimeSelectionProps) {
  return (
    <div style={{
      padding: '12px',
      background: 'rgba(255, 255, 255, 0.95)',
      borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    }}>
      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
        {side === 'left' ? 'Left' : 'Right'} View
      </h4>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: '12px', fontWeight: '500' }}>
          Facility
        </label>
        <select
          value={facilityId || ''}
          onChange={(e) => onFacilityChange(e.target.value)}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid #ddd',
            borderRadius: 4,
            fontSize: '12px',
          }}
        >
          <option value="">Select Facility</option>
          <option value="facility-1">Facility A</option>
          <option value="facility-2">Facility B</option>
          <option value="facility-3">Facility C</option>
        </select>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: 4, fontSize: '12px', fontWeight: '500' }}>
          Time
        </label>
        <input
          type="datetime-local"
          value={timestamp ? timestamp.toISOString().slice(0, 16) : ''}
          onChange={(e) => onTimestampChange(new Date(e.target.value))}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid #ddd',
            borderRadius: 4,
            fontSize: '12px',
          }}
        />
      </div>
    </div>
  );
}

export function ComparativeControlPanel() {
  const {
    leftView,
    rightView,
    splitOrientation,
    syncCamera,
    showDifferences,
    differenceThreshold,
    performanceMetrics,
    setLeftView,
    setRightView,
    setSplitOrientation,
    toggleSyncCamera,
    toggleShowDifferences,
    setDifferenceThreshold,
  } = useComparativeViewStore();

  const isFpsWarning = performanceMetrics.fps < 30;

  return (
    <div style={{
      position: 'absolute',
      top: 16,
      left: 16,
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      maxWidth: 300,
    }}>
      {/* Time Selection for Both Views */}
      <TimeSelection
        side="left"
        facilityId={leftView.facilityId}
        timestamp={leftView.timestamp}
        onFacilityChange={(id) => setLeftView({ facilityId: id })}
        onTimestampChange={(ts) => setLeftView({ timestamp: ts })}
      />

      <TimeSelection
        side="right"
        facilityId={rightView.facilityId}
        timestamp={rightView.timestamp}
        onFacilityChange={(id) => setRightView({ facilityId: id })}
        onTimestampChange={(ts) => setRightView({ timestamp: ts })}
      />

      {/* View Controls */}
      <div style={{
        padding: '12px',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
          View Controls
        </h4>

        {/* Split Orientation */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: '12px', fontWeight: '500' }}>
            Split Orientation
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setSplitOrientation('horizontal')}
              style={{
                flex: 1,
                padding: '6px',
                border: splitOrientation === 'horizontal' ? '2px solid #007bff' : '1px solid #ddd',
                borderRadius: 4,
                background: splitOrientation === 'horizontal' ? '#e7f3ff' : 'white',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Horizontal
            </button>
            <button
              onClick={() => setSplitOrientation('vertical')}
              style={{
                flex: 1,
                padding: '6px',
                border: splitOrientation === 'vertical' ? '2px solid #007bff' : '1px solid #ddd',
                borderRadius: 4,
                background: splitOrientation === 'vertical' ? '#e7f3ff' : 'white',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Vertical
            </button>
          </div>
        </div>

        {/* Sync Camera */}
        <div style={{ marginBottom: 12 }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            fontSize: '12px',
          }}>
            <input
              type="checkbox"
              checked={syncCamera}
              onChange={toggleSyncCamera}
            />
            <span>Synchronize Camera</span>
          </label>
        </div>

        {/* Show Differences */}
        <div style={{ marginBottom: 12 }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            fontSize: '12px',
          }}>
            <input
              type="checkbox"
              checked={showDifferences}
              onChange={toggleShowDifferences}
            />
            <span>Highlight Differences</span>
          </label>
        </div>

        {/* Difference Threshold */}
        {showDifferences && (
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: '12px', fontWeight: '500' }}>
              Difference Threshold: {Math.round(differenceThreshold * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={differenceThreshold * 100}
              onChange={(e) => setDifferenceThreshold(Number(e.target.value) / 100)}
              style={{ width: '100%' }}
            />
          </div>
        )}
      </div>

      {/* Performance Monitor */}
      <div style={{
        padding: '12px',
        background: isFpsWarning ? 'rgba(255, 243, 205, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>
          Performance
        </h4>
        <div style={{ fontSize: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          <div>Overall FPS:</div>
          <div style={{ fontWeight: isFpsWarning ? 'bold' : 'normal', color: isFpsWarning ? '#e65100' : 'inherit' }}>
            {performanceMetrics.fps}
          </div>
          <div>Left View:</div>
          <div>{performanceMetrics.leftViewFps}</div>
          <div>Right View:</div>
          <div>{performanceMetrics.rightViewFps}</div>
          <div>Render Time:</div>
          <div>{performanceMetrics.renderTime.toFixed(2)}ms</div>
        </div>
        {isFpsWarning && (
          <div style={{
            marginTop: 8,
            padding: 8,
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: 4,
            fontSize: '11px',
            color: '#856404',
          }}>
            ⚠️ Performance below 30 FPS. Consider reducing scene complexity.
          </div>
        )}
      </div>
    </div>
  );
}
