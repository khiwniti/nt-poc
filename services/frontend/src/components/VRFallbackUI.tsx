import { AlertCircle, Monitor, Smartphone } from 'lucide-react';
import { VRCapabilities } from '../utils/vrDetection';

export interface VRFallbackUIProps {
  capabilities: VRCapabilities;
  onDismiss?: () => void;
}

/**
 * Fallback UI for devices that don't support VR
 * Provides helpful information and alternatives
 */
export function VRFallbackUI({ capabilities, onDismiss }: VRFallbackUIProps) {
  if (capabilities.isImmersiveVRSupported) {
    return null; // Don't show fallback if VR is supported
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: '2rem',
        borderRadius: '12px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
        <AlertCircle size={32} style={{ marginRight: '1rem', color: '#FFA500' }} />
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>VR Not Available</h2>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        {!capabilities.isSupported ? (
          <VRNotSupportedMessage />
        ) : (
          <VRDeviceNotDetectedMessage />
        )}
      </div>

      <AlternativeOptions />

      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            marginTop: '1.5rem',
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            fontWeight: 'bold',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Continue with Desktop View
        </button>
      )}
    </div>
  );
}

function VRNotSupportedMessage() {
  return (
    <div>
      <p style={{ marginBottom: '1rem' }}>
        Your browser doesn't support WebXR, which is required for VR experiences.
      </p>
      <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '1rem', borderRadius: '6px' }}>
        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          To enable VR:
        </p>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.875rem' }}>
          <li>Update to a modern browser (Chrome 79+, Edge 79+, Firefox 98+)</li>
          <li>Access this site via HTTPS (required for WebXR)</li>
          <li>Enable WebXR flags in your browser settings</li>
        </ul>
      </div>
    </div>
  );
}

function VRDeviceNotDetectedMessage() {
  return (
    <div>
      <p style={{ marginBottom: '1rem' }}>
        WebXR is supported, but no VR device is currently detected.
      </p>
      <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '1rem', borderRadius: '6px' }}>
        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          Make sure your VR headset is:
        </p>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.875rem' }}>
          <li>Connected to your computer</li>
          <li>Powered on and ready</li>
          <li>Properly configured with your system</li>
          <li>Running the latest firmware</li>
        </ul>
      </div>
    </div>
  );
}

function AlternativeOptions() {
  return (
    <div style={{ marginTop: '1.5rem' }}>
      <p style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        Alternative viewing options:
      </p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div
          style={{
            flex: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            padding: '1rem',
            borderRadius: '6px',
            textAlign: 'center',
          }}
        >
          <Monitor size={32} style={{ margin: '0 auto 0.5rem' }} />
          <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
            Desktop 3D View
          </div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
            Full 3D navigation with mouse and keyboard
          </div>
        </div>
        <div
          style={{
            flex: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            padding: '1rem',
            borderRadius: '6px',
            textAlign: 'center',
          }}
        >
          <Smartphone size={32} style={{ margin: '0 auto 0.5rem' }} />
          <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
            Mobile View
          </div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
            Touch-based 3D exploration
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Lightweight notification for VR availability status
 */
export function VRStatusBadge({ capabilities }: { capabilities: VRCapabilities }) {
  if (!capabilities.isSupported) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        backgroundColor: capabilities.isImmersiveVRSupported
          ? 'rgba(76, 175, 80, 0.9)'
          : 'rgba(255, 165, 0, 0.9)',
        color: 'white',
        padding: '0.5rem 1rem',
        borderRadius: '6px',
        fontSize: '0.875rem',
        fontWeight: 'bold',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}
    >
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: 'white',
        }}
      />
      {capabilities.isImmersiveVRSupported ? 'VR Ready' : 'VR Not Available'}
      {capabilities.deviceName && (
        <span style={{ opacity: 0.8, marginLeft: '0.25rem' }}>
          ({capabilities.deviceName})
        </span>
      )}
    </div>
  );
}
