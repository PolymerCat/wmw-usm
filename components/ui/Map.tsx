"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, ZoomControl } from "react-leaflet";
import { DivIcon, type LatLngBoundsExpression, type Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { haversineDistanceMeters } from "@/lib/nearest";
import type { Building, LatLng } from "@/lib/types";

interface MapProps {
  buildings: Building[];
  onBuildingSelect: (building: Building) => void;
  selectedBuildingId: string | null;
  nearestBuildingId: string | null;
  userLocation: LatLng | null;
  onUserLocationChange: (location: LatLng | null) => void;
}

const USM_CENTER: [number, number] = [5.356174000404129, 100.2989353671396];
const USM_BOUNDS: LatLngBoundsExpression = [
  [5.351636862846997, 100.2865113240709],
  [5.363583489536974, 100.31088833599742],
];
const MAP_MIN_ZOOM = 17;
const MAP_MAX_ZOOM = 20;
const MOBILE_BREAKPOINT_PX = 768;
const MOBILE_FOCUS_Y_RATIO = 0.4;
const LOCATION_UPDATE_MIN_DISTANCE_METERS = 8;
const LOCATION_UPDATE_MIN_INTERVAL_MS = 5000;
const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 10000,
  maximumAge: 5000,
};

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

    if (!userLocation) {
      map.flyTo(USM_CENTER, MAP_MIN_ZOOM, { duration: 1.5 });
    }
  }, [buildings, map, selectedBuildingId, userLocation]);

  return null;
}

function createCurrentLocationIcon() {
  return new DivIcon({
    className: "bg-transparent border-none",
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;width:86px;height:90px;">
        <span style="position:absolute;top:10px;padding:4px 8px;border-radius:9999px;background:#1f3f82;color:#ffffff;font-size:10px;font-weight:800;line-height:1;white-space:nowrap;box-shadow:0 8px 14px -10px rgba(12,34,78,0.95);">
          You are here
        </span>
        <span style="position:absolute;bottom:10px;width:30px;height:30px;border-radius:9999px;background:rgba(31,111,235,0.24);animation:markerPulse 1.7s ease-out infinite;"></span>
        <img src="/pin.png" alt="Current location pin" style="position:relative;width:34px;height:46px;object-fit:contain;filter:drop-shadow(0 10px 12px rgba(18,55,122,0.34));" />
      </div>
    `,
    iconSize: [86, 90],
    iconAnchor: [43, 84],
  });
}

function createIcon(isSelected: boolean, isNearest: boolean) {
  const pulseColor = isSelected ? "rgba(235,132,35,0.45)" : "rgba(102,49,170,0.35)";
  const dotColor = isSelected ? "#EB8423" : isNearest ? "#0F766E" : "#6631AA";
  const ringColor = isSelected ? "#431A7C" : "#FFFFFF";
  const nearestRingColor = "rgba(13,148,136,0.95)";
  const nearestGlowColor = "rgba(13,148,136,0.3)";
  const nearestTag = isNearest
    ? `
      <span style="position:absolute;top:-18px;padding:2px 7px;border-radius:9999px;background:#0F766E;color:#ffffff;font-size:9px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;box-shadow:0 8px 14px -10px rgba(15,118,110,0.95);white-space:nowrap;">
        Nearest
      </span>
    `
    : "";
  const nearestOuterRing = isNearest
    ? `
      <span style="position:absolute;width:145%;height:145%;border-radius:9999px;border:3px solid ${nearestRingColor};box-shadow:0 0 0 5px ${nearestGlowColor};animation:markerPulse 2.1s ease-out infinite;"></span>
      <span style="position:absolute;width:170%;height:170%;border-radius:9999px;background:rgba(13,148,136,0.16);animation:markerPulse 2.6s ease-out infinite;"></span>
    `
    : "";

  return new DivIcon({
    className: "bg-transparent border-none",
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:44px;height:44px;">
        ${nearestTag}
        ${nearestOuterRing}
        <span style="position:absolute;width:100%;height:100%;border-radius:9999px;background:${pulseColor};animation:markerPulse 1.8s ease-out infinite;"></span>
        <span style="position:relative;width:${isSelected ? "22px" : isNearest ? "20px" : "17px"};height:${isSelected ? "22px" : isNearest ? "20px" : "17px"};border-radius:9999px;background:${dotColor};box-shadow:${isNearest ? "0 0 0 6px rgba(13,148,136,0.28)" : "0 10px 20px -12px rgba(67,26,124,0.9)"};border:${isSelected ? "4px" : "2px"} solid ${ringColor};transition:all 220ms ease;"></span>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

export default function Map({
  buildings,
  onBuildingSelect,
  selectedBuildingId,
  nearestBuildingId,
  userLocation,
  onUserLocationChange,
}: MapProps) {
  const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null);
  const geolocationWatchIdRef = useRef<number | null>(null);
  const lastAcceptedLocationRef = useRef<LatLng | null>(null);
  const lastAcceptedTimestampRef = useRef<number | null>(null);
  const hasCenteredOnUserRef = useRef(false);
  const hasShownGeolocationErrorRef = useRef(false);

  useEffect(() => {
    if (!mapInstance) {
      return;
    }

    const showGeolocationAlertOnce = (message: string) => {
      if (hasShownGeolocationErrorRef.current) {
        return;
      }

      hasShownGeolocationErrorRef.current = true;
      window.alert(message);
    };

    if (!navigator.geolocation) {
      showGeolocationAlertOnce("Geolocation is not supported by your browser.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation: LatLng = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const now = Date.now();
        const lastAcceptedLocation = lastAcceptedLocationRef.current;
        const lastAcceptedTimestamp = lastAcceptedTimestampRef.current;

        if (lastAcceptedLocation && lastAcceptedTimestamp !== null) {
          const elapsedSinceLastAccepted = now - lastAcceptedTimestamp;
          if (elapsedSinceLastAccepted < LOCATION_UPDATE_MIN_INTERVAL_MS) {
            return;
          }

          const distanceFromLastAccepted = haversineDistanceMeters(lastAcceptedLocation, newLocation);
          if (distanceFromLastAccepted < LOCATION_UPDATE_MIN_DISTANCE_METERS) {
            return;
          }
        }

        lastAcceptedLocationRef.current = newLocation;
        lastAcceptedTimestampRef.current = now;
        onUserLocationChange(newLocation);

        if (!hasCenteredOnUserRef.current) {
          hasCenteredOnUserRef.current = true;
          mapInstance.flyTo([newLocation.lat, newLocation.lng], MAP_MAX_ZOOM, { duration: 1.2 });
        }
      },
      (error) => {
        console.error("Geolocation error", error);
        showGeolocationAlertOnce(
          "Unable to retrieve your location. Please allow location access and try again."
        );
      },
      GEOLOCATION_OPTIONS
    );

    geolocationWatchIdRef.current = watchId;

    return () => {
      navigator.geolocation.clearWatch(watchId);

      if (geolocationWatchIdRef.current === watchId) {
        geolocationWatchIdRef.current = null;
      }
    };
  }, [mapInstance, onUserLocationChange]);

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
        <TileLayer url="/updated_tiles/{z}/{x}/{y}.png" maxZoom={MAP_MAX_ZOOM} />
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
            icon={createIcon(selectedBuildingId === building.id, nearestBuildingId === building.id)}
            eventHandlers={{
              click: () => onBuildingSelect(building),
            }}
          />
        ))}

        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={createCurrentLocationIcon()}
            interactive={false}
          />
        )}
      </MapContainer>
    </div>
  );
}
