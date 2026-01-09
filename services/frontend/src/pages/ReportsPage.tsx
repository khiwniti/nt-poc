import React from 'react';

function ReportsPage() {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>Reports</h2>
      <div style={{ marginTop: '2rem' }}>
        <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '1rem' }}>
          <h3>Weekly Occupancy Report</h3>
          <p>Average occupancy: 78%</p>
          <p>Peak hours: 10:00 AM - 2:00 PM</p>
        </div>
        <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '1rem' }}>
          <h3>Monthly Energy Usage</h3>
          <p>Total consumption: 15,420 kWh</p>
          <p>Trend: -5% vs last month</p>
        </div>
      </div>
    </div>
  );
}

export default ReportsPage;
