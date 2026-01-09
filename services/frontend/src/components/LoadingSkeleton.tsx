import React from 'react';

export function DashboardSkeleton() {
  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ 
        width: '100%', 
        height: '200px', 
        background: '#f0f0f0',
        borderRadius: '8px',
        marginBottom: '1rem',
        animation: 'pulse 1.5s ease-in-out infinite'
      }} />
      <div style={{ 
        width: '60%', 
        height: '100px', 
        background: '#f0f0f0',
        borderRadius: '8px',
        animation: 'pulse 1.5s ease-in-out infinite'
      }} />
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
