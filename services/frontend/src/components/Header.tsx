import React from 'react';
import { useNavigate } from 'react-router-dom';

export function Header() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <header
      style={{
        padding: '1rem',
        borderBottom: '1px solid #ddd',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <h1>Facility Manager</h1>
      <nav style={{ display: 'flex', gap: '1rem' }}>
        <a href="/" style={{ textDecoration: 'none' }}>
          Dashboard
        </a>
        <a href="/3d" style={{ textDecoration: 'none' }}>
          3D View
        </a>
        <a href="/geospatial" style={{ textDecoration: 'none' }}>
          Map
        </a>
        <a href="/alerts" style={{ textDecoration: 'none' }}>
          Alerts
        </a>
        <a href="/reports" style={{ textDecoration: 'none' }}>
          Reports
        </a>
        <a href="/comparative-analysis" style={{ textDecoration: 'none' }}>
          ML Analysis
        </a>
        <a href="/health-dashboard" style={{ textDecoration: 'none' }}>
          Health Dashboard
        </a>
        <a href="/settings" style={{ textDecoration: 'none' }}>
          Settings
        </a>
        <button onClick={handleLogout}>Logout</button>
      </nav>
    </header>
  );
}
