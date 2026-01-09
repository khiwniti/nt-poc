import React from 'react';

function ThreeDView() {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>3D Facility View</h2>
      <div style={{ 
        width: '100%', 
        height: '600px', 
        border: '1px solid #ddd', 
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#f5f5f5',
        marginTop: '1rem'
      }}>
        <p>3D Canvas (Three.js will be loaded here)</p>
      </div>
    </div>
  );
}

export default ThreeDView;
