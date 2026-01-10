import { useState, useEffect } from 'react';
import { X, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { Alert, alertsApi } from '../api/alerts';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface AlertDetailModalProps {
  alertId: string;
  onClose: () => void;
  onUpdate?: () => void;
}

interface SensorReading {
  timestamp: number;
  temperature: number;
  voltage: number;
  soc: number;
}

interface TimelineEvent {
  timestamp: number;
  event: string;
  user?: string;
  notes?: string;
}

export function AlertDetailModal({ alertId, onClose, onUpdate }: AlertDetailModalProps) {
  const [alert, setAlert] = useState<Alert | null>(null);
  const [sensorReadings, setSensorReadings] = useState<SensorReading[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [acknowledging, setAcknowledging] = useState(false);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    fetchAlertDetails();
  }, [alertId]);

  const fetchAlertDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const [alertResponse, historyResponse] = await Promise.all([
        alertsApi.getAlert(alertId),
        alertsApi.getSensorHistory(alertId),
      ]);

      setAlert(alertResponse.data);
      setSensorReadings(historyResponse.readings);
      setTimeline(historyResponse.timeline);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alert details');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!alert) return;

    try {
      setAcknowledging(true);
      await alertsApi.acknowledgeAlert(alertId);
      await fetchAlertDetails();
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to acknowledge alert');
    } finally {
      setAcknowledging(false);
    }
  };

  const handleResolve = async () => {
    if (!alert || !resolutionNotes.trim()) {
      setError('Please provide resolution notes');
      return;
    }

    try {
      setResolving(true);
      await alertsApi.resolveAlert(alertId, resolutionNotes);
      await fetchAlertDetails();
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve alert');
    } finally {
      setResolving(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'info':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#ef4444';
      case 'acknowledged':
        return '#f59e0b';
      case 'resolved':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
      >
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <p>Loading alert details...</p>
        </div>
      </div>
    );
  }

  if (!alert) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            backgroundColor: '#fff',
            zIndex: 10,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>Alert Details</h2>
            <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
              {alert.id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close alert details"
            title="Close"
            style={{
              padding: '0.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
            }}
          >
            <X size={24} aria-hidden="true" focusable="false" />
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* Error Display */}
          {error && (
            <div
              style={{
                padding: '1rem',
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                borderRadius: '6px',
                marginBottom: '1.5rem',
              }}
            >
              {error}
            </div>
          )}

          {/* Alert Information */}
          <div style={{ marginBottom: '2rem' }}>
            <h3
              style={{
                marginTop: 0,
                marginBottom: '1rem',
                fontSize: '1.125rem',
                fontWeight: '600',
              }}
            >
              Alert Information
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1rem',
                padding: '1rem',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
              }}
            >
              <div>
                <p
                  style={{
                    margin: '0 0 0.25rem',
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    fontWeight: '600',
                  }}
                >
                  SEVERITY
                </p>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    backgroundColor: `${getSeverityColor(alert.severity)}20`,
                    color: getSeverityColor(alert.severity),
                  }}
                >
                  {alert.severity.toUpperCase()}
                </span>
              </div>
              <div>
                <p
                  style={{
                    margin: '0 0 0.25rem',
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    fontWeight: '600',
                  }}
                >
                  STATUS
                </p>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    backgroundColor: `${getStatusBadgeColor(alert.status)}20`,
                    color: getStatusBadgeColor(alert.status),
                  }}
                >
                  {alert.status.toUpperCase()}
                </span>
              </div>
              <div>
                <p
                  style={{
                    margin: '0 0 0.25rem',
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    fontWeight: '600',
                  }}
                >
                  TYPE
                </p>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>{alert.type}</p>
              </div>
              <div>
                <p
                  style={{
                    margin: '0 0 0.25rem',
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    fontWeight: '600',
                  }}
                >
                  CREATED AT
                </p>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>
                  {formatTimestamp(alert.createdAt)}
                </p>
              </div>
              {alert.acknowledgedAt && (
                <div>
                  <p
                    style={{
                      margin: '0 0 0.25rem',
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      fontWeight: '600',
                    }}
                  >
                    ACKNOWLEDGED AT
                  </p>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>
                    {formatTimestamp(alert.acknowledgedAt)}
                  </p>
                </div>
              )}
              {alert.resolvedAt && (
                <div>
                  <p
                    style={{
                      margin: '0 0 0.25rem',
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      fontWeight: '600',
                    }}
                  >
                    RESOLVED AT
                  </p>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>
                    {formatTimestamp(alert.resolvedAt)}
                  </p>
                </div>
              )}
            </div>
            <div
              style={{
                marginTop: '1rem',
                padding: '1rem',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
              }}
            >
              <p
                style={{
                  margin: '0 0 0.5rem',
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  fontWeight: '600',
                }}
              >
                MESSAGE
              </p>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>{alert.message}</p>
            </div>
          </div>

          {/* Affected Battery/Zone Information */}
          <div style={{ marginBottom: '2rem' }}>
            <h3
              style={{
                marginTop: 0,
                marginBottom: '1rem',
                fontSize: '1.125rem',
                fontWeight: '600',
              }}
            >
              Affected Assets
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1rem',
                padding: '1rem',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
              }}
            >
              <div>
                <p
                  style={{
                    margin: '0 0 0.25rem',
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    fontWeight: '600',
                  }}
                >
                  BATTERY SYSTEM
                </p>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>
                  {alert.batterySystemId}
                </p>
              </div>
              <div>
                <p
                  style={{
                    margin: '0 0 0.25rem',
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    fontWeight: '600',
                  }}
                >
                  ZONE
                </p>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>{alert.zoneId}</p>
              </div>
              {alert.metadata && (
                <>
                  <div>
                    <p
                      style={{
                        margin: '0 0 0.25rem',
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        fontWeight: '600',
                      }}
                    >
                      THRESHOLD
                    </p>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>
                      {typeof alert.metadata.threshold === 'number'
                        ? alert.metadata.threshold.toFixed(2)
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p
                      style={{
                        margin: '0 0 0.25rem',
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        fontWeight: '600',
                      }}
                    >
                      ACTUAL VALUE
                    </p>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>
                      {typeof alert.metadata.actualValue === 'number'
                        ? alert.metadata.actualValue.toFixed(2)
                        : 'N/A'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Historical Sensor Readings */}
          {sensorReadings.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: '1rem',
                  fontSize: '1.125rem',
                  fontWeight: '600',
                }}
              >
                Historical Context (Last 24 Hours)
              </h3>
              <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '6px' }}>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={sensorReadings}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
                      style={{ fontSize: '0.75rem' }}
                    />
                    <YAxis style={{ fontSize: '0.75rem' }} />
                    <Tooltip
                      labelFormatter={(ts) => new Date(ts as number).toLocaleString()}
                      contentStyle={{ fontSize: '0.75rem' }}
                    />
                    <Line type="monotone" dataKey="temperature" stroke="#ef4444" name="Temp (°C)" />
                    <Line type="monotone" dataKey="voltage" stroke="#3b82f6" name="Voltage (V)" />
                    <Line type="monotone" dataKey="soc" stroke="#10b981" name="SoC (%)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Alert Timeline */}
          {timeline.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: '1rem',
                  fontSize: '1.125rem',
                  fontWeight: '600',
                }}
              >
                Alert Timeline
              </h3>
              <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '6px' }}>
                {timeline.map((event, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      marginBottom: index < timeline.length - 1 ? '1rem' : 0,
                      paddingBottom: index < timeline.length - 1 ? '1rem' : 0,
                      borderBottom: index < timeline.length - 1 ? '1px solid #e5e7eb' : 'none',
                    }}
                  >
                    <div style={{ flexShrink: 0 }}>
                      <Clock size={16} color="#6b7280" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          margin: '0 0 0.25rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: '#374151',
                        }}
                      >
                        {event.event}
                      </p>
                      <p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', color: '#6b7280' }}>
                        {formatTimestamp(event.timestamp)}
                        {event.user && ` • ${event.user}`}
                      </p>
                      {event.notes && (
                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#374151' }}>
                          {event.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resolution Actions */}
          {alert.status !== 'resolved' && (
            <div style={{ marginBottom: '1rem' }}>
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: '1rem',
                  fontSize: '1.125rem',
                  fontWeight: '600',
                }}
              >
                Resolution Actions
              </h3>

              {alert.status === 'active' && (
                <button
                  onClick={handleAcknowledge}
                  disabled={acknowledging}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    marginBottom: '1rem',
                    backgroundColor: acknowledging ? '#9ca3af' : '#f59e0b',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: acknowledging ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <AlertCircle size={16} />
                  {acknowledging ? 'Acknowledging...' : 'Acknowledge Alert'}
                </button>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                  }}
                >
                  Resolution Notes *
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Describe the resolution steps taken..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              <button
                onClick={handleResolve}
                disabled={resolving || !resolutionNotes.trim()}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: resolving || !resolutionNotes.trim() ? '#9ca3af' : '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: resolving || !resolutionNotes.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <CheckCircle size={16} />
                {resolving ? 'Resolving...' : 'Resolve Alert'}
              </button>
            </div>
          )}

          {alert.status === 'resolved' && (
            <div
              style={{
                padding: '1rem',
                backgroundColor: '#d1fae5',
                color: '#065f46',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <CheckCircle size={20} />
              <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                This alert has been resolved
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
