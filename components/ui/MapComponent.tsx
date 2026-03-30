"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { LatLngBoundsExpression, DivIcon } from 'leaflet';
import L from 'leaflet';

import { BUILDINGS_DATA, Building } from '@/lib/data';

// USM Coordinates
const USM_CENTER: [number, number] = [5.3585, 100.3015];
const USM_BOUNDS: LatLngBoundsExpression = [
  [5.3400, 100.2900], // Southwest
  [5.3700, 100.3150], // Northeast
];

interface MapComponentProps {
  onBuildingSelect: (building: Building) => void;
  selectedBuildingId: string | null;
}

// A custom map hook to pan and zoom on selection
function MapController({ selectedBuildingId }: { selectedBuildingId: string | null }) {
  const map = useMap();

  useEffect(() => {
    if (selectedBuildingId) {
      const selected = BUILDINGS_DATA.find((b) => b.id === selectedBuildingId);
      if (selected) {
        map.flyTo([selected.latitude, selected.longitude], 18, {
          duration: 1.5,
        });
      }
    } else {
      map.flyTo(USM_CENTER, 15, { duration: 1.5 });
    }
  }, [selectedBuildingId, map]);

  return null;
}

export default function MapComponent({ onBuildingSelect, selectedBuildingId }: MapComponentProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Use custom div icon for better styling with Tailwind
  const createIcon = (isSelected: boolean) => {
    return new DivIcon({
      className: 'bg-transparent border-none',
      html: `
        <div class="relative flex items-center justify-center w-8 h-8">
          <div class="absolute w-full h-full rounded-full opacity-30 animate-ping ${isSelected ? 'bg-blue-500' : 'bg-blue-400'}"></div>
          <div class="relative w-4 h-4 rounded-full shadow-lg ${isSelected ? 'bg-blue-600 scale-150 ring-4 ring-white' : 'bg-blue-500 ring-2 ring-white'} transition-all duration-300"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16], // center
    });
  };

  return (
    <MapContainer
      center={USM_CENTER}
      zoom={15}
      minZoom={14}
      maxZoom={19}
      maxBounds={USM_BOUNDS}
      maxBoundsViscosity={1.0}
      className="w-full h-full"
      style={{ width: '100%', height: '100%', zIndex: 0 }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      
      <MapController selectedBuildingId={selectedBuildingId} />

      {BUILDINGS_DATA.map((building) => (
        <Marker
          key={building.id}
          position={[building.latitude, building.longitude]}
          icon={createIcon(selectedBuildingId === building.id)}
          eventHandlers={{
            click: () => onBuildingSelect(building),
          }}
        />
      ))}
    </MapContainer>
  );
}
