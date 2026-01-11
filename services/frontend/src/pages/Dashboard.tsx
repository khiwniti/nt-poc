

export function Dashboard() {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>Dashboard</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginTop: '2rem' }}>
        <div style={{ padding: '1.5rem', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>Active Zones</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>12</p>
        </div>
        <div style={{ padding: '1.5rem', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>Active Alerts</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>3</p>
        </div>
        <div style={{ padding: '1.5rem', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>Occupancy</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>85%</p>
        </div>
      </div>
    </div>
  );
}
