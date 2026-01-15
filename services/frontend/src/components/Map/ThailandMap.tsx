
import React, { useEffect, useRef, useState } from 'react';
import { BRANCHES } from '../../constants';
import { Branch } from '../../types';
import { getMarkerHtml } from './MapMarker';

// Declare Leaflet on window since we load via CDN
declare global {
  interface Window {
    L: typeof import('leaflet');
  }
}

interface ThailandMapProps {
  selectedBranch: Branch | null;
  onSelectBranch: (branch: Branch | null) => void;
}

export const ThailandMap: React.FC<ThailandMapProps> = ({ selectedBranch, onSelectBranch }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null); // Using any for Leaflet map instance from CDN
  const markers = useRef<any[]>([]);
  const [mapError, setMapError] = useState<boolean>(false);

  // Initialize Map
  useEffect(() => {
    if (typeof window.L === 'undefined') {
      console.error("Leaflet is not loaded.");
      setMapError(true);
      return;
    }
    
    if (map.current || !mapContainer.current) return;

    try {
      map.current = window.L.map(mapContainer.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([13.7563, 100.5018], 6); // Centered on Thailand

      // Darker, high-contrast map style for "Command Center" look
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map.current);

      // Add click handler to map to deselect branch
      map.current.on('click', () => {
        onSelectBranch(null);
      });
      
    } catch(e) {
      console.error("Failed to initialize Leaflet map:", e);
      setMapError(true);
    }

    // Cleanup
    return () => {
      if (map.current) {
        try { map.current.remove(); } catch (e) { /* ignore */ }
        map.current = null;
      }
    };
  }, []);

  // Handle Markers
  useEffect(() => {
    if (!map.current || !window.L || mapError) return;

    // Clear previous markers
    markers.current.forEach(marker => {
        try { marker.remove(); } catch (e) { /* ignore */ }
    });
    markers.current = [];

    BRANCHES.forEach((branch) => {
      if (
          typeof branch.lat !== 'number' || 
          typeof branch.lng !== 'number' || 
          !Number.isFinite(branch.lat) || 
          !Number.isFinite(branch.lng)
      ) {
        return;
      }

      const isSelected = selectedBranch?.id === branch.id;
      const iconHtml = getMarkerHtml(branch, isSelected);

      try {
          const icon = window.L.divIcon({
              html: iconHtml,
              className: 'leaflet-custom-div-icon', // Removes default square border
              iconSize: [64, 64],
              iconAnchor: [32, 58], // Anchored at bottom center visually
          });

          const marker = window.L.marker([branch.lat, branch.lng], { icon, zIndexOffset: isSelected ? 1000 : 100 })
            .addTo(map.current);

          marker.on('click', (e: any) => {
            window.L.DomEvent.stopPropagation(e);
            onSelectBranch(branch);
          });

          markers.current.push(marker);
      } catch (err) {
          console.error(`Failed to create marker for ${branch.name}`, err);
      }
    });

  }, [selectedBranch, onSelectBranch, mapError]);

  // Handle FlyTo Logic
  useEffect(() => {
    if (!map.current || mapError) return;
    
    try {
        map.current.invalidateSize();
    } catch (e) {
        console.warn("Invalidate size failed", e);
    }

    const timer = setTimeout(() => {
        // Critical: Check map.current again inside timeout as it might be destroyed
        if (!map.current) return;

        try {
            let targetLat = 13.7563;
            let targetLng = 100.5018;
            let zoomLevel = 6;

            if (selectedBranch) {
                // Ensure values are converted to Numbers
                const lat = typeof selectedBranch.lat === 'string' ? parseFloat(selectedBranch.lat) : Number(selectedBranch.lat);
                const lng = typeof selectedBranch.lng === 'string' ? parseFloat(selectedBranch.lng) : Number(selectedBranch.lng);

                if (Number.isFinite(lat) && Number.isFinite(lng)) {
                    targetLat = lat;
                    targetLng = lng;
                    zoomLevel = 13;
                }
            }

            // Double check validation before calling Leaflet
            if (Number.isFinite(targetLat) && Number.isFinite(targetLng)) {
                map.current.flyTo([targetLat, targetLng], zoomLevel, {
                    animate: true,
                    duration: 1.5
                });
            }
        } catch (err) { 
            // Suppress FlyTo errors if coordinates were somehow still invalid during animation
            console.warn("FlyTo warning:", err);
        }
    }, 100);

    return () => clearTimeout(timer);
  }, [selectedBranch, mapError]);


  if (mapError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-200">
        <div className="text-center text-gray-500 p-4 bg-white/50 rounded-lg">
          <p className="font-semibold text-lg">Map could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative group bg-gray-200">
      <div ref={mapContainer} className="w-full h-full outline-none" />
    </div>
  );
};
