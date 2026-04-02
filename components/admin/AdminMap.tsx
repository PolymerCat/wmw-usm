"use client";

import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
  ZoomControl,
} from "react-leaflet";
import { DivIcon, type LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Building } from "@/lib/types";

interface AdminMapProps {
  buildings: Building[];
  selectedBuildingId: string | null;
  pinEnabled: boolean;
  disableBuildingSelection?: boolean;
  pendingPin: { latitude: number; longitude: number } | null;
  onSelectBuilding: (buildingId: string) => void;
  onPinSelect: (pin: { latitude: number; longitude: number }) => void;
}

const USM_CENTER: [number, number] = [5.356174000404129, 100.2989353671396];
const USM_BOUNDS: LatLngBoundsExpression = [
  [5.351636862846997, 100.2865113240709],
  [5.363583489536974, 100.31088833599742],
];
const MAP_MIN_ZOOM = 17;
const MAP_MAX_ZOOM = 19;

function createBuildingIcon(isSelected: boolean) {
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

function createPendingIcon() {
  return new DivIcon({
    className: "bg-transparent border-none",
    html: `
      <div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;">
        <span style="width:16px;height:16px;border-radius:9999px;background:#16a34a;border:3px solid #ecfdf3;box-shadow:0 10px 18px -10px rgba(22,163,74,0.9);"></span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function MapController({
  buildings,
  selectedBuildingId,
  pendingPin,
}: {
  buildings: Building[];
  selectedBuildingId: string | null;
  pendingPin: { latitude: number; longitude: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (pendingPin) {
      map.flyTo([pendingPin.latitude, pendingPin.longitude], MAP_MAX_ZOOM, {
        duration: 1.2,
      });
      return;
    }

    if (!selectedBuildingId) {
      map.flyTo(USM_CENTER, MAP_MIN_ZOOM, { duration: 1.2 });
      return;
    }

    const selected = buildings.find((building) => building.id === selectedBuildingId);
    if (selected) {
      map.flyTo([selected.latitude, selected.longitude], MAP_MAX_ZOOM, {
        duration: 1.2,
      });
    }
  }, [buildings, map, pendingPin, selectedBuildingId]);

  return null;
}

function MapPinPicker({
  pinEnabled,
  onPinSelect,
}: {
  pinEnabled: boolean;
  onPinSelect: (pin: { latitude: number; longitude: number }) => void;
}) {
  useMapEvents({
    click(event) {
      if (!pinEnabled) {
        return;
      }

      onPinSelect({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });

  return null;
}

export default function AdminMap({
  buildings,
  selectedBuildingId,
  pinEnabled,
  disableBuildingSelection = false,
  pendingPin,
  onSelectBuilding,
  onPinSelect,
}: AdminMapProps) {
  return (
    <div className="h-full min-h-[22rem] w-full overflow-hidden rounded-2xl border border-[#d4c6e8]">
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
        <MapController
          buildings={buildings}
          selectedBuildingId={selectedBuildingId}
          pendingPin={pendingPin}
        />
        <MapPinPicker pinEnabled={pinEnabled} onPinSelect={onPinSelect} />

        {buildings.map((building) => (
          <Marker
            key={building.id}
            position={[building.latitude, building.longitude]}
            icon={createBuildingIcon(selectedBuildingId === building.id)}
            eventHandlers={{
              click: () => {
                if (disableBuildingSelection) {
                  return;
                }
                onSelectBuilding(building.id);
              },
            }}
          />
        ))}

        {pendingPin ? (
          <Marker
            position={[pendingPin.latitude, pendingPin.longitude]}
            icon={createPendingIcon()}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
