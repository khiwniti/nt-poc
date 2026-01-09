import React from 'react';

function AlertsPage() {
  const alerts = [
    { id: 1, zone: 'Zone A', message: 'High occupancy detected', severity: 'warning', time: '5 min ago' },
    { id: 2, zone: 'Zone B', message: 'Temperature threshold exceeded', severity: 'critical', time: '12 min ago' },
    { id: 3, zone: 'Zone C', message: 'Motion detected after hours', severity: 'info', time: '1 hour ago' },
  ];

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Alerts</h2>
      <div style={{ marginTop: '2rem' }}>
        {alerts.map(alert => (
          <div 
            key={alert.id}
            style={{ 
              padding: '1rem', 
              border: '1px solid #ddd', 
              borderRadius: '8px',
              marginBottom: '1rem',
              borderLeft: `4px solid ${alert.severity === 'critical' ? 'red' : alert.severity === 'warning' ? 'orange' : 'blue'}`
            }}
          >
            <strong>{alert.zone}</strong> - {alert.message}
            <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>{alert.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AlertsPage;
