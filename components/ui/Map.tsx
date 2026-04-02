"use client";

import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, ZoomControl } from "react-leaflet";
import { DivIcon, type LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Building } from "@/lib/types";

interface MapProps {
  buildings: Building[];
  onBuildingSelect: (building: Building) => void;
  selectedBuildingId: string | null;
}

const USM_CENTER: [number, number] = [5.356174000404129, 100.2989353671396];
const USM_BOUNDS: LatLngBoundsExpression = [
  [5.351636862846997, 100.2865113240709],
  [5.363583489536974, 100.31088833599742],
];
const MAP_MIN_ZOOM = 17;
const MAP_MAX_ZOOM = 19;
const MOBILE_BREAKPOINT_PX = 768;
const MOBILE_FOCUS_Y_RATIO = 0.4;

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
        const targetPosition: [number, number] = [selected.latitude, selected.longitude];

        if (window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`).matches) {
          const mapSize = map.getSize();
          const markerPoint = map.project(targetPosition, MAP_MAX_ZOOM);
          const targetScreenY = mapSize.y * MOBILE_FOCUS_Y_RATIO;
          const yOffsetFromCenter = targetScreenY - mapSize.y / 2;
          const adjustedCenterPoint = markerPoint.subtract([0, yOffsetFromCenter]);
          const adjustedCenter = map.unproject(adjustedCenterPoint, MAP_MAX_ZOOM);

          map.flyTo(adjustedCenter, MAP_MAX_ZOOM, { duration: 1.5 });
          return;
        }

        map.flyTo(targetPosition, MAP_MAX_ZOOM, { duration: 1.5 });
        return;
      }
    }

    map.flyTo(USM_CENTER, MAP_MIN_ZOOM, { duration: 1.5 });
  }, [buildings, map, selectedBuildingId]);

  return null;
}

function createIcon(isSelected: boolean) {
  const pulseColor = isSelected ? "rgba(235,132,35,0.45)" : "rgba(102,49,170,0.35)";
  const dotColor = isSelected ? "#EB8423" : "#6631AA";
  const ringColor = isSelected ? "#431A7C" : "#FFFFFF";

  return new DivIcon({
    className: "bg-transparent border-none",
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:34px;height:34px;">
        <span style="position:absolute;width:100%;height:100%;border-radius:9999px;background:${pulseColor};animation:markerPulse 1.8s ease-out infinite;"></span>
        <span style="position:relative;width:${isSelected ? "17px" : "13px"};height:${isSelected ? "17px" : "13px"};border-radius:9999px;background:${dotColor};box-shadow:0 10px 20px -12px rgba(67,26,124,0.9);border:${isSelected ? "4px" : "2px"} solid ${ringColor};transition:all 220ms ease;"></span>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

export default function Map({
  buildings,
  onBuildingSelect,
  selectedBuildingId,
}: MapProps) {
  return (
    <div className="h-full min-h-[100svh] w-full">
      <MapContainer
        center={USM_CENTER}
        zoom={MAP_MIN_ZOOM}
        className="h-full w-full"
        zoomControl={false}
        minZoom={MAP_MIN_ZOOM}
        maxZoom={MAP_MAX_ZOOM}
        maxBounds={USM_BOUNDS}
        maxBoundsViscosity={1.0}
      >
        <TileLayer url="/new_tiles/{z}/{x}/{y}.png" maxZoom={MAP_MAX_ZOOM} />
        <ZoomControl position="bottomright" />
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
