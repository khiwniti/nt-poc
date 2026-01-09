import React from 'react';

function Unauthorized() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>Unauthorized Access</h2>
      <p>You don't have permission to access this resource.</p>
      <a href="/" style={{ marginTop: '1rem', display: 'inline-block' }}>Return to Dashboard</a>
    </div>
  );
}

export default Unauthorized;
