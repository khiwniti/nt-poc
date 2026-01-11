import { useParams } from 'react-router-dom';

function ZoneDetail() {
  const { id } = useParams();

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Zone Details - {id}</h2>
      <div style={{ marginTop: '2rem' }}>
        <p><strong>Status:</strong> Active</p>
        <p><strong>Occupancy:</strong> 75%</p>
        <p><strong>Temperature:</strong> 22°C</p>
        <p><strong>Last Updated:</strong> 2 minutes ago</p>
      </div>
    </div>
  );
}

export default ZoneDetail;
