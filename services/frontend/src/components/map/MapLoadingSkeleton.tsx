import React from 'react';

export const MapLoadingSkeleton: React.FC = () => {
  return (
    <div className="map-loading-skeleton" role="status" aria-label="Loading map">
      <div className="skeleton-map">
        <div className="skeleton-controls">
          <div className="skeleton-button" />
          <div className="skeleton-button" />
          <div className="skeleton-button" />
        </div>
        <div className="skeleton-zoom-controls">
          <div className="skeleton-zoom-button" />
          <div className="skeleton-zoom-button" />
        </div>
      </div>
      <span className="sr-only">Loading map...</span>
    </div>
  );
};
