
import React, { useEffect, useRef, useState } from 'react';
import { BRANCHES } from '../../constants';
import { Branch } from '../../types';

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
      
      // Cyber-Physical Color Palettes
      let mainColor = '#3b82f6'; // Blue
      let glowColor = 'rgba(59, 130, 246, 0.4)';
      let pulseRing = '';

      if (branch.status === 'critical') {
          mainColor = '#ef4444'; // Red
          glowColor = 'rgba(239, 68, 68, 0.5)';
          pulseRing = `
            <div class="absolute inset-0 rounded-full border-2 border-red-500 opacity-0 animate-ping-slow"></div>
            <div class="absolute inset-[-4px] rounded-full border border-red-500 opacity-0 animate-ping-slower delay-300"></div>
          `;
      } else if (branch.status === 'warning') {
          mainColor = '#f59e0b'; // Amber
          glowColor = 'rgba(245, 158, 11, 0.5)';
      } else {
          mainColor = '#10b981'; // Emerald (Operational)
          glowColor = 'rgba(16, 185, 129, 0.4)';
      }

      // High-Fidelity HTML Marker
      const iconHtml = `
        <div class="relative w-16 h-16 flex items-center justify-center group cursor-pointer" style="transform-style: preserve-3d;">
            <!-- Ground Shadow -->
            <div class="absolute bottom-2 w-8 h-3 bg-black/30 rounded-[100%] blur-[2px] transition-all duration-300 group-hover:w-10 group-hover:h-4 group-hover:opacity-50"></div>
            <!-- Pulse Rings (For Critical/Warning) -->
            ${pulseRing}
            <!-- 3D Pin Interaction Container (Handles Scaling & Selection Lift) -->
            <div class="relative transition-all duration-500 ease-out ${isSelected ? 'scale-125 -translate-y-4' : 'group-hover:-translate-y-2'}">
                <!-- 3D Pin Animation Container (Handles Floating Loop) -->
                <div class="marker-float">
                    <!-- Pin Head -->
                    <div class="relative w-10 h-10">
                         <!-- Outer Glow / Glass -->
                         <div class="absolute inset-0 bg-white rounded-full shadow-[0_4px_10px_${glowColor}] border-2 border-white overflow-hidden">
                            <div class="absolute inset-0 opacity-20 bg-gradient-to-br from-white to-black"></div>
                            <!-- Status Fill -->
                            <div class="absolute inset-1 rounded-full bg-gradient-to-br from-[${mainColor}] to-slate-900 shadow-inner flex items-center justify-center">
                                <!-- Inner Icon -->
                                <svg viewBox="0 0 24 24" class="w-5 h-5 text-white drop-shadow-md">
                                    <path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                                    <circle cx="12" cy="9" r="2.5" fill="white"/>
                                </svg>
                            </div>
                            <!-- Specular Highlight -->
                            <div class="absolute top-1 left-2 w-3 h-2 bg-white/40 rounded-[100%] blur-[1px]"></div>
                         </div>
                    </div>
                    <!-- Pin Needle -->
                    <div class="absolute top-[95%] left-1/2 -translate-x-1/2 w-1 h-4 bg-gradient-to-b from-gray-400 to-transparent opacity-80"></div>
                </div>
            </div>
            <!-- Floating Label -->
            <div class="absolute top-full mt-2 transition-all duration-300 ${isSelected ? 'opacity-100 translate-y-0 scale-100' : 'opacity-80 translate-y-1 scale-90 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100'}">
                <div class="px-3 py-1 bg-slate-900/90 backdrop-blur text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-xl border border-white/10 flex items-center gap-2 whitespace-nowrap">
                   <div class="w-1.5 h-1.5 rounded-full" style="background-color: ${mainColor}"></div>
                   ${branch.name}
                </div>
            </div>
        </div>
      `;

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
