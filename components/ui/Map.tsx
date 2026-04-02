"use client";

import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, ZoomControl } from "react-leaflet";
import { DivIcon, type LatLngBoundsExpression, type Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Building } from "@/lib/types";

type LatLng = {
  lat: number;
  lng: number;
};

interface MapProps {
  buildings: Building[];
  onBuildingSelect: (building: Building) => void;
  selectedBuildingId: string | null;
  userLocation: LatLng | null;
  onUserLocationChange: (location: LatLng | null) => void;
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
  userLocation,
  onMapReady,
}: {
  buildings: Building[];
  selectedBuildingId: string | null;
  userLocation: LatLng | null;
  onMapReady: (map: LeafletMap) => void;
}) {
  const map = useMap();

  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);

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

    if (userLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], MAP_MAX_ZOOM, { duration: 1.5 });
      return;
    }

    map.flyTo(USM_CENTER, MAP_MIN_ZOOM, { duration: 1.5 });
  }, [buildings, map, selectedBuildingId, userLocation]);

  return null;
}

function createCurrentLocationIcon() {
  return new DivIcon({
    className: "bg-transparent border-none",
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:30px;height:30px;">
        <span style="position:absolute;width:100%;height:100%;border-radius:9999px;background:rgba(60,174,252,0.35);animation:markerPulse 1.6s ease-out infinite;"></span>
        <span style="position:relative;width:12px;height:12px;border-radius:9999px;background:#3CAEFC;border:2px solid white;box-shadow:0 0 6px rgba(25,150,255,0.8);"></span>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
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
  userLocation,
  onUserLocationChange,
}: MapProps) {
  const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null);
  // THIS IS THE MAIN LOGIC FOR AUTO FINDING USER LOCATION
  const locateUser = () => {
    if (!navigator.geolocation) {
      window.alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation: LatLng = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        onUserLocationChange(newLocation);

        if (mapInstance) {
          mapInstance.flyTo([newLocation.lat, newLocation.lng], MAP_MAX_ZOOM, { duration: 1.2 });
        }
      },
      (error) => {
        console.error("Geolocation error", error);
        window.alert("Unable to retrieve your location. Please allow location access and try again.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const [hasAttemptedGeolocation, setHasAttemptedGeolocation] = useState(false);

  useEffect(() => {
    if (mapInstance && !userLocation && !hasAttemptedGeolocation) {
      setHasAttemptedGeolocation(true);
      locateUser();
    }
  }, [mapInstance, userLocation, hasAttemptedGeolocation]);

  useEffect(() => {
    if (userLocation && mapInstance) {
      mapInstance.flyTo([userLocation.lat, userLocation.lng], MAP_MAX_ZOOM, { duration: 0.9 });
    }
  }, [userLocation, mapInstance]);

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
        <MapController
          buildings={buildings}
          selectedBuildingId={selectedBuildingId}
          userLocation={userLocation}
          onMapReady={setMapInstance}
        />

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

        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={createCurrentLocationIcon()}
          />
        )}
      </MapContainer>
    </div>
  );
}
