import React, { useEffect, useState } from 'react';
import { Map } from '../components/map/Map';
import { useMapStore } from '../stores/mapStore';
import type { Facility } from '../components/map/types';
import '../styles/map.css';

// Mock facility data - in production this would come from an API
const mockFacilities: Facility[] = [
  {
    id: '1',
    name: 'Bangkok Energy Storage',
    latitude: 13.7563,
    longitude: 100.5018,
    status: 'active',
    alertCount: 0,
    description: 'Primary battery facility in Bangkok metropolitan area',
  },
  {
    id: '2',
    name: 'Chiang Mai Facility',
    latitude: 18.7883,
    longitude: 98.9853,
    status: 'active',
    alertCount: 2,
    description: 'Northern region battery storage facility',
  },
  {
    id: '3',
    name: 'Phuket Battery Center',
    latitude: 7.8804,
    longitude: 98.3923,
    status: 'maintenance',
    alertCount: 5,
    description: 'Southern coastal facility undergoing scheduled maintenance',
  },
  {
    id: '4',
    name: 'Nakhon Ratchasima Hub',
    latitude: 14.9799,
    longitude: 102.0978,
    status: 'active',
    alertCount: 1,
    description: 'Northeast regional storage hub',
  },
  {
    id: '5',
    name: 'Hat Yai Operations',
    latitude: 7.0089,
    longitude: 100.4733,
    status: 'critical',
    alertCount: 12,
    description: 'Facility experiencing critical temperature alerts',
  },
];

const MapView: React.FC = () => {
  const { setFacilities } = useMapStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading facilities from API
    const loadFacilities = async () => {
      try {
        setIsLoading(true);
        // In production, this would be an API call
        // const response = await fetch('/api/facilities');
        // const data = await response.json();

        // For now, use mock data
        await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay
        setFacilities(mockFacilities);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load facilities:', err);
        setError('Failed to load facility data');
        setIsLoading(false);
      }
    };

    loadFacilities();
  }, [setFacilities]);

  if (error) {
    return (
      <div className="map-view-container">
        <div className="map-error" role="alert">
          <h2>Error Loading Map</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="map-view-container">
      <div className="map-header">
        <h1>Facility Map</h1>
        <p className="map-subtitle">View and manage battery storage facilities</p>
      </div>

      {isLoading ? (
        <div className="map-loading" role="status">
          <p>Loading facilities...</p>
        </div>
      ) : (
        <div className="map-wrapper">
          <Map facilities={mockFacilities} />
        </div>
      )}
    </div>
  );
};

export default MapView;
