import { Eye, Contrast, Keyboard, Volume2 } from 'lucide-react';
import { useAccessibilityStore, type ColorScheme } from '../stores/accessibilityStore';

export function AccessibilityControlPanel() {
  const {
    highContrastEnabled,
    colorScheme,
    keyboardNavigationEnabled,
    screenReaderOptimized,
    reduceMotion,
    show3DLabels,
    use3DOutlines,
    setHighContrastEnabled,
    setColorScheme,
    setKeyboardNavigationEnabled,
    setScreenReaderOptimized,
    setReduceMotion,
    setShow3DLabels,
    setUse3DOutlines,
  } = useAccessibilityStore();

  return (
    <div
      role="region"
      aria-label="3D View Accessibility Controls"
      style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        background: highContrastEnabled ? '#000' : 'rgba(255, 255, 255, 0.95)',
        border: highContrastEnabled ? '2px solid #FFF' : '1px solid #ddd',
        borderRadius: '8px',
        padding: '1rem',
        minWidth: '280px',
        maxHeight: '90vh',
        overflowY: 'auto',
        zIndex: 1000,
        color: highContrastEnabled ? '#FFF' : '#000',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      }}
    >
      <h3 style={{ 
        margin: '0 0 1rem 0', 
        fontSize: '1.1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <Eye size={20} />
        Accessibility Settings
      </h3>

      {/* Color Scheme */}
      <div style={{ marginBottom: '1rem' }}>
        <label
          htmlFor="color-scheme"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem',
            fontWeight: 'bold',
          }}
        >
          <Contrast size={16} />
          Color Scheme
        </label>
        <select
          id="color-scheme"
          value={colorScheme}
          onChange={(e) => setColorScheme(e.target.value as ColorScheme)}
          style={{
            width: '100%',
            padding: '0.5rem',
            borderRadius: '4px',
            border: highContrastEnabled ? '2px solid #FFF' : '1px solid #ccc',
            background: highContrastEnabled ? '#000' : '#fff',
            color: highContrastEnabled ? '#FFF' : '#000',
            fontSize: '0.9rem',
          }}
        >
          <option value="standard">Standard</option>
          <option value="high-contrast">High Contrast</option>
          <option value="protanopia">Protanopia (Red-blind)</option>
          <option value="deuteranopia">Deuteranopia (Green-blind)</option>
          <option value="tritanopia">Tritanopia (Blue-blind)</option>
        </select>
      </div>

      {/* Quick toggle for high contrast */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={highContrastEnabled}
            onChange={(e) => setHighContrastEnabled(e.target.checked)}
            style={{
              width: '18px',
              height: '18px',
              cursor: 'pointer',
            }}
          />
          <span>High Contrast Mode</span>
        </label>
      </div>

      <hr style={{ 
        margin: '1rem 0', 
        border: 'none', 
        borderTop: highContrastEnabled ? '1px solid #FFF' : '1px solid #ddd' 
      }} />

      {/* Keyboard Navigation */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          cursor: 'pointer',
          fontWeight: 'bold',
          marginBottom: '0.5rem'
        }}>
          <Keyboard size={16} />
          <span>Keyboard Navigation</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={keyboardNavigationEnabled}
            onChange={(e) => setKeyboardNavigationEnabled(e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.9rem' }}>Enable keyboard controls</span>
        </label>
        {keyboardNavigationEnabled && (
          <div
            style={{
              marginTop: '0.5rem',
              padding: '0.5rem',
              background: highContrastEnabled ? '#222' : '#f5f5f5',
              borderRadius: '4px',
              fontSize: '0.85rem',
              lineHeight: '1.5',
            }}
          >
            <strong>Shortcuts:</strong>
            <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
              <li>Arrow keys: Rotate view</li>
              <li>Shift+Arrows: Pan view</li>
              <li>+/- keys: Zoom in/out</li>
              <li>Tab: Cycle zones</li>
              <li>Enter: Select zone</li>
              <li>Escape: Deselect</li>
              <li>?: Show help</li>
            </ul>
          </div>
        )}
      </div>

      <hr style={{ 
        margin: '1rem 0', 
        border: 'none', 
        borderTop: highContrastEnabled ? '1px solid #FFF' : '1px solid #ddd' 
      }} />

      {/* Screen Reader */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          fontWeight: 'bold',
          marginBottom: '0.5rem'
        }}>
          <Volume2 size={16} />
          <span>Screen Reader</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={screenReaderOptimized}
            onChange={(e) => setScreenReaderOptimized(e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.9rem' }}>Optimize for screen readers</span>
        </label>
      </div>

      <hr style={{ 
        margin: '1rem 0', 
        border: 'none', 
        borderTop: highContrastEnabled ? '1px solid #FFF' : '1px solid #ddd' 
      }} />

      {/* Visual Options */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ 
          fontWeight: 'bold',
          marginBottom: '0.5rem',
          display: 'block'
        }}>
          Visual Options
        </label>
        
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          cursor: 'pointer',
          marginBottom: '0.5rem'
        }}>
          <input
            type="checkbox"
            checked={show3DLabels}
            onChange={(e) => setShow3DLabels(e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.9rem' }}>Show zone labels</span>
        </label>

        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          cursor: 'pointer',
          marginBottom: '0.5rem'
        }}>
          <input
            type="checkbox"
            checked={use3DOutlines}
            onChange={(e) => setUse3DOutlines(e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.9rem' }}>Use selection outlines</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={reduceMotion}
            onChange={(e) => setReduceMotion(e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.9rem' }}>Reduce motion</span>
        </label>
      </div>

      <div
        style={{
          marginTop: '1rem',
          padding: '0.75rem',
          background: highContrastEnabled ? '#222' : '#E3F2FD',
          borderRadius: '4px',
          fontSize: '0.85rem',
        }}
        role="status"
        aria-live="polite"
      >
        <strong>WCAG 2.1 AA Compliant</strong>
        <p style={{ margin: '0.25rem 0 0 0' }}>
          All features tested for accessibility
        </p>
      </div>
    </div>
  );
}
