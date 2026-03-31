"use client";

import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { DivIcon, type LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Building } from "@/lib/types";

interface NewMapProps {
  buildings: Building[];
  onBuildingSelect: (building: Building) => void;
  selectedBuildingId: string | null;
}

const USM_CENTER: [number, number] = [5.356174000404129, 100.2989353671396];
const USM_BOUNDS: LatLngBoundsExpression = [
  [5.351636862846997, 100.2865113240709],
  [5.363583489536974, 100.31088833599742],
];

function MapController({
  buildings,
  selectedBuildingId,
}: {
  buildings: Building[];
  selectedBuildingId: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedBuildingId) {
      const selected = buildings.find((building) => building.id === selectedBuildingId);
      if (selected) {
        map.flyTo([selected.latitude, selected.longitude], 18, { duration: 1.5 });
        return;
      }
    }

    map.flyTo(USM_CENTER, 17, { duration: 1.5 });
  }, [buildings, map, selectedBuildingId]);

  return null;
}

function createIcon(isSelected: boolean) {
  return new DivIcon({
    className: "bg-transparent border-none",
    html: `
      <div class="relative flex items-center justify-center w-8 h-8">
        <div class="absolute w-full h-full rounded-full opacity-30 animate-ping ${isSelected ? "bg-red-500" : "bg-red-400"}"></div>
        <div class="relative w-4 h-4 rounded-full shadow-lg ${isSelected ? "bg-blue-600 scale-150 ring-4 ring-white" : "bg-blue-500 ring-2 ring-white"} transition-all duration-300"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export default function NewMap({
  buildings,
  onBuildingSelect,
  selectedBuildingId,
}: NewMapProps) {
  return (
    <div className="h-screen w-full">
      <MapContainer
        center={USM_CENTER}
        zoom={17}
        className="h-full w-full"
        minZoom={17}
        maxZoom={19}
        maxBounds={USM_BOUNDS}
        maxBoundsViscosity={1.0}
      >
        <TileLayer url="new_tiles/{z}/{x}/{y}.png" />
        <MapController buildings={buildings} selectedBuildingId={selectedBuildingId} />
        {buildings.map((building) => (
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
    </div>
  );
}
