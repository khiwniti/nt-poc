import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Alert, alertsApi } from '../api/alerts';

type SortKey = 'time' | 'severity';
type SortOrder = 'asc' | 'desc';

const severityRank: Record<Alert['severity'], number> = {
  critical: 3,
  warning: 2,
  info: 1,
};

function getSeverityColor(severity: string) {
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
}

function getStatusBadgeColor(status: string) {
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
}

function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleString();
}

export interface AlertListProps {
  alerts: Alert[];
  loading?: boolean;
  onSelectAlert?: (alertId: string) => void;
  onRefresh?: () => void | Promise<void>;
  defaultPageSize?: number;
}

export function AlertList({ alerts, loading = false, onSelectAlert, onRefresh, defaultPageSize = 20 }: AlertListProps) {
  const [sortKey, setSortKey] = useState<SortKey>('time');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [bulkAcknowledging, setBulkAcknowledging] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<Alert | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolving, setResolving] = useState(false);
  const [inFlightAction, setInFlightAction] = useState<{ id: string; action: 'ack' } | null>(null);

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [alerts, pageSize]);

  const sortedAlerts = useMemo(() => {
    const items = [...alerts];
    items.sort((a, b) => {
      if (sortKey === 'time') {
        const delta = a.createdAt - b.createdAt;
        return sortOrder === 'desc' ? -delta : delta;
      }

      const delta = severityRank[a.severity] - severityRank[b.severity];
      if (delta !== 0) {
        return sortOrder === 'desc' ? -delta : delta;
      }

      const timeDelta = a.createdAt - b.createdAt;
      return -timeDelta;
    });
    return items;
  }, [alerts, sortKey, sortOrder]);

  const total = sortedAlerts.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pageAlerts = sortedAlerts.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    if (safePage !== page) setPage(safePage);
  }, [safePage, page]);

  const pageAlertIds = pageAlerts.map((a) => a.id);
  const selectedOnPage = selectedIds.filter((id) => pageAlertIds.includes(id));
  const allOnPageSelected = pageAlertIds.length > 0 && selectedOnPage.length === pageAlertIds.length;

  const toggleSort = (key: SortKey) => {
    setPage(1);
    if (sortKey === key) {
      setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'));
      return;
    }
    setSortKey(key);
    setSortOrder(key === 'time' ? 'desc' : 'desc');
  };

  const toggleSelected = (alertId: string) => {
    setSelectedIds((prev) => (prev.includes(alertId) ? prev.filter((id) => id !== alertId) : [...prev, alertId]));
  };

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      if (allOnPageSelected) {
        return prev.filter((id) => !pageAlertIds.includes(id));
      }
      const next = new Set(prev);
      pageAlertIds.forEach((id) => next.add(id));
      return Array.from(next);
    });
  };

  const acknowledgeSingle = async (alert: Alert) => {
    if (alert.status !== 'active') return;
    try {
      setError(null);
      setInFlightAction({ id: alert.id, action: 'ack' });
      await alertsApi.acknowledgeAlert(alert.id);
      await onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to acknowledge alert');
    } finally {
      setInFlightAction(null);
    }
  };

  const acknowledgeSelected = async () => {
    const alertsById = new Map(alerts.map((a) => [a.id, a] as const));
    const idsToAck = selectedIds.filter((id) => alertsById.get(id)?.status === 'active');
    if (idsToAck.length === 0) return;

    try {
      setError(null);
      setBulkAcknowledging(true);
      await Promise.all(idsToAck.map((id) => alertsApi.acknowledgeAlert(id)));
      setSelectedIds([]);
      await onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to acknowledge selected alerts');
    } finally {
      setBulkAcknowledging(false);
    }
  };

  const openResolve = (alert: Alert) => {
    if (alert.status === 'resolved') return;
    setError(null);
    setResolveTarget(alert);
    setResolveNotes('');
  };

  const closeResolve = () => {
    if (resolving) return;
    setResolveTarget(null);
    setResolveNotes('');
  };

  const resolveAlert = async () => {
    if (!resolveTarget) return;
    const notes = resolveNotes.trim();
    if (!notes) {
      setError('Please provide resolution notes');
      return;
    }

    try {
      setError(null);
      setResolving(true);
      await alertsApi.resolveAlert(resolveTarget.id, notes);
      setResolveTarget(null);
      setResolveNotes('');
      await onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve alert');
    } finally {
      setResolving(false);
    }
  };

  const eligibleSelectedToAck = useMemo(() => {
    const alertsById = new Map(alerts.map((a) => [a.id, a] as const));
    return selectedIds.filter((id) => alertsById.get(id)?.status === 'active').length;
  }, [alerts, selectedIds]);

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      {error && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderBottom: '1px solid #fecaca',
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Bulk actions */}
      <div
        style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          backgroundColor: '#f9fafb',
        }}
      >
        <div style={{ fontSize: '0.875rem', color: '#374151' }}>
          {selectedIds.length > 0 ? `${selectedIds.length} selected` : `${total} alerts`}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={acknowledgeSelected}
            disabled={eligibleSelectedToAck === 0 || bulkAcknowledging}
            style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: eligibleSelectedToAck === 0 ? '#e5e7eb' : '#3b82f6',
              color: eligibleSelectedToAck === 0 ? '#6b7280' : 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: eligibleSelectedToAck === 0 || bulkAcknowledging ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            {bulkAcknowledging ? 'Acknowledging…' : `Acknowledge Selected${eligibleSelectedToAck > 0 ? ` (${eligibleSelectedToAck})` : ''}`}
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#374151' }}>
            Page size
            <select
              value={pageSize}
              onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
              style={{ padding: '0.4rem 0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: 'white' }}
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '0.75rem 0.75rem', textAlign: 'left', width: 44 }}>
                <input
                  aria-label="Select all alerts on page"
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleSelectAllOnPage}
                />
              </th>
              <th
                onClick={() => toggleSort('severity')}
                style={{
                  padding: '0.75rem 1rem',
                  textAlign: 'left',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                Severity {sortKey === 'severity' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                Type
              </th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                Message
              </th>
              <th
                onClick={() => toggleSort('time')}
                style={{
                  padding: '0.75rem 1rem',
                  textAlign: 'left',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                Time {sortKey === 'time' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                Status
              </th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {pageAlerts.length === 0 && !loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  No alerts found
                </td>
              </tr>
            ) : (
              pageAlerts.map((alert, index) => (
                <tr
                  key={alert.id}
                  onClick={() => onSelectAlert?.(alert.id)}
                  style={{
                    borderBottom: index < pageAlerts.length - 1 ? '1px solid #e5e7eb' : 'none',
                    backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb',
                    cursor: onSelectAlert ? 'pointer' : 'default',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#f9fafb';
                  }}
                >
                  <td style={{ padding: '1rem 0.75rem' }} onClick={(e) => e.stopPropagation()}>
                    <input
                      aria-label={`Select alert ${alert.id}`}
                      type="checkbox"
                      checked={selectedIds.includes(alert.id)}
                      onChange={() => toggleSelected(alert.id)}
                    />
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: `${getSeverityColor(alert.severity)}20`,
                        color: getSeverityColor(alert.severity),
                        textTransform: 'capitalize',
                      }}
                    >
                      {alert.severity}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#374151', whiteSpace: 'nowrap' }}>{alert.type}</td>
                  <td
                    style={{
                      padding: '1rem',
                      fontSize: '0.875rem',
                      color: '#374151',
                      maxWidth: 520,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={alert.message}
                  >
                    {alert.message}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#374151', whiteSpace: 'nowrap' }}>
                    {formatTimestamp(alert.createdAt)}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: `${getStatusBadgeColor(alert.status)}20`,
                        color: getStatusBadgeColor(alert.status),
                        textTransform: 'capitalize',
                      }}
                    >
                      {alert.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => acknowledgeSingle(alert)}
                        disabled={alert.status !== 'active' || inFlightAction?.id === alert.id}
                        style={{
                          padding: '0.4rem 0.75rem',
                          backgroundColor: alert.status === 'active' ? '#3b82f6' : '#e5e7eb',
                          color: alert.status === 'active' ? 'white' : '#6b7280',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: alert.status === 'active' && inFlightAction?.id !== alert.id ? 'pointer' : 'not-allowed',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                        }}
                      >
                        {inFlightAction?.id === alert.id ? 'Acknowledging…' : 'Acknowledge'}
                      </button>
                      <button
                        onClick={() => openResolve(alert)}
                        disabled={alert.status === 'resolved'}
                        style={{
                          padding: '0.4rem 0.75rem',
                          backgroundColor: alert.status === 'resolved' ? '#e5e7eb' : '#10b981',
                          color: alert.status === 'resolved' ? '#6b7280' : 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: alert.status === 'resolved' ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                        }}
                      >
                        Resolve
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div
        style={{
          padding: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: 'white',
        }}
      >
        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          {total === 0 ? 'Showing 0 results' : `Showing ${startIndex + 1} to ${Math.min(startIndex + pageSize, total)} of ${total} results`}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: safePage === 1 ? 'not-allowed' : 'pointer',
              opacity: safePage === 1 ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>
          <div style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}>
            Page {safePage} of {totalPages}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
              opacity: safePage === totalPages ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Resolve modal */}
      {resolveTarget && (
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
          onClick={closeResolve}
        >
          <div
            style={{ backgroundColor: 'white', borderRadius: '8px', width: '100%', maxWidth: '560px', overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Resolve Alert</div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{resolveTarget.type}</div>
              </div>
              <button
                onClick={closeResolve}
                disabled={resolving}
                style={{ border: 'none', backgroundColor: 'transparent', cursor: resolving ? 'not-allowed' : 'pointer', color: '#6b7280' }}
                aria-label="Close resolve dialog"
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1rem 1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                Resolution notes
              </label>
              <textarea
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="Describe the resolution"
                rows={4}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', resize: 'vertical' }}
                disabled={resolving}
              />
            </div>

            <div
              style={{
                padding: '1rem 1.25rem',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                backgroundColor: '#f9fafb',
              }}
            >
              <button
                onClick={closeResolve}
                disabled={resolving}
                style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: resolving ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                onClick={resolveAlert}
                disabled={resolving || resolveNotes.trim().length === 0}
                style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: resolveNotes.trim().length === 0 ? '#e5e7eb' : '#10b981',
                  color: resolveNotes.trim().length === 0 ? '#6b7280' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: resolving || resolveNotes.trim().length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                {resolving ? 'Resolving…' : 'Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

