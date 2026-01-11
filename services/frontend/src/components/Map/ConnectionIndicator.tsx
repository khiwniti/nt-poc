/**
 * ConnectionIndicator - Shows SSE connection state
 *
 * Displays current connection status with color-coded indicator and pulse animation
 * States: connecting, open (connected), reconnecting, closed, error, disabled
 */

export type ConnectionState = 'connecting' | 'open' | 'reconnecting' | 'closed' | 'error' | 'disabled';

interface ConnectionIndicatorProps {
  state: ConnectionState;
}

const stateConfig: Record<ConnectionState, { color: string; text: string }> = {
  connecting: { color: 'bg-yellow-500', text: 'Connecting...' },
  open: { color: 'bg-green-500', text: 'Connected' },
  reconnecting: { color: 'bg-orange-500', text: 'Reconnecting...' },
  closed: { color: 'bg-gray-500', text: 'Disconnected' },
  error: { color: 'bg-red-500', text: 'Connection Error' },
  disabled: { color: 'bg-gray-400', text: 'Disabled' }
};

export function ConnectionIndicator({ state }: ConnectionIndicatorProps) {
  const config = stateConfig[state];

  return (
    <div className="connection-indicator flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow">
      <div
        className={`w-3 h-3 rounded-full ${config.color} ${state === 'open' ? 'animate-pulse' : ''}`}
      />
      <span className="text-sm font-medium">{config.text}</span>
    </div>
  );
}
