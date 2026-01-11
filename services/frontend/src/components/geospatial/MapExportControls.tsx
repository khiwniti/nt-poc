import { Download } from 'lucide-react';
import { useState, useRef } from 'react';
import type { CSSProperties } from 'react';

export type ExportFormat = 'png' | 'geojson' | 'kml';

export interface MapExportControlsProps {
  onExport: (format: ExportFormat) => void;
  disabled?: boolean;
  highContrastMode?: boolean;
}

export function MapExportControls({
  onExport,
  disabled = false,
  highContrastMode = false,
}: MapExportControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleExport = (format: ExportFormat) => {
    onExport(format);
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent, format: ExportFormat) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleExport(format);
    }
  };

  const buttonStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    backgroundColor: highContrastMode ? '#ffffff' : '#3b82f6',
    color: highContrastMode ? '#000000' : '#ffffff',
    border: highContrastMode ? '2px solid #000000' : 'none',
    borderRadius: 8,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 14,
    fontWeight: 500,
    opacity: disabled ? 0.5 : 1,
    transition: 'background-color 0.2s',
  };

  const menuStyle: CSSProperties = {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    backgroundColor: highContrastMode ? '#000000' : '#ffffff',
    border: highContrastMode ? '2px solid #ffffff' : '1px solid #e2e8f0',
    borderRadius: 8,
    boxShadow: highContrastMode ? 'none' : '0 4px 12px rgba(0, 0, 0, 0.1)',
    minWidth: 160,
    zIndex: 1000,
    overflow: 'hidden',
  };

  const menuItemStyle = (hovered: boolean): CSSProperties => ({
    display: 'block',
    width: '100%',
    padding: '12px 16px',
    backgroundColor: hovered
      ? highContrastMode
        ? '#ffffff'
        : '#f8fafc'
      : 'transparent',
    color: highContrastMode ? '#ffffff' : '#1e293b',
    border: 'none',
    textAlign: 'left',
    fontSize: 14,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  });

  return (
    <div style={{ position: 'relative' }} data-testid="map-export-controls">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        aria-label="Export map"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        data-testid="export-button"
        style={buttonStyle}
      >
        <Download size={16} />
        Export
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Export format options"
          style={menuStyle}
          data-testid="export-menu"
        >
          <button
            role="menuitem"
            onClick={() => handleExport('png')}
            onKeyDown={(e) => handleKeyDown(e, 'png')}
            style={menuItemStyle(false)}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = highContrastMode
                ? '#ffffff'
                : '#f8fafc';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
            data-testid="export-png"
          >
            Export as PNG
          </button>
          <button
            role="menuitem"
            onClick={() => handleExport('geojson')}
            onKeyDown={(e) => handleKeyDown(e, 'geojson')}
            style={menuItemStyle(false)}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = highContrastMode
                ? '#ffffff'
                : '#f8fafc';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
            data-testid="export-geojson"
          >
            Export as GeoJSON
          </button>
          <button
            role="menuitem"
            onClick={() => handleExport('kml')}
            onKeyDown={(e) => handleKeyDown(e, 'kml')}
            style={menuItemStyle(false)}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = highContrastMode
                ? '#ffffff'
                : '#f8fafc';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
            data-testid="export-kml"
          >
            Export as KML
          </button>
        </div>
      )}
    </div>
  );
}
