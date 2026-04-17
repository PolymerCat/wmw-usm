"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; // CRITICAL: Without this, the map is broken
import { BUILDINGS_DATA, Building } from '@/lib/types';
import { LatLngBoundsExpression, DivIcon } from 'leaflet';
import UserLocationMarker from './UserLocation';

interface NewMapProps {
    onBuildingSelect: (building: Building) => void;
    selectedBuildingId: string | null;
}

export default function NewMap({ onBuildingSelect, selectedBuildingId }: NewMapProps) {
    const [mounted, setMounted] = useState(false);
    //const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
    const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);

    // USM Coordinates
    const USM_CENTER: [number, number] = [5.356174000404129, 100.2989353671396];
    const USM_BOUNDS: LatLngBoundsExpression = [
        [5.351636862846997, 100.2865113240709], // Southwest
        [5.363583489536974, 100.31088833599742], // Northeast
    ];

    // 1. SSR FIX: Map only runs on the client (browser)
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const handleBuildingSelect = (building: Building) => {
        //setSelectedBuildingId(building.id);
        setSelectedBuilding(building);
    };


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
                map.flyTo(USM_CENTER, 17, { duration: 1.5 });
            }
        }, [selectedBuildingId, map]);

        return null;
    }

    // Use custom div icon for better styling with Tailwind
    const createIcon = (isSelected: boolean) => {
        return new DivIcon({
            className: 'bg-transparent border-none',
            html: `
        <div class="relative flex items-center justify-center w-8 h-8">
          <div class="absolute w-full h-full rounded-full opacity-30 animate-ping ${isSelected ? 'bg-red-500' : 'bg-red-400'}"></div>
          <div class="relative w-4 h-4 rounded-full shadow-lg ${isSelected ? 'bg-blue-600 scale-150 ring-4 ring-white' : 'bg-blue-500 ring-2 ring-white'} transition-all duration-300"></div>
        </div>
      `,
            iconSize: [32, 32],
            iconAnchor: [16, 16], // center
        });
    };
    
    //#region Map Container
    return (
        <div className="h-screen w-full"> {/* Container must have height */}
            <MapContainer
                center={USM_CENTER}
                zoom={17}
                className="h-full w-full"
                minZoom={17}
                maxZoom={19}
                maxBounds={USM_BOUNDS}
                maxBoundsViscosity={1.0}
            >
                {/* 2. THE BACKGROUND: Your local QGIS tiles */}
                <TileLayer url="new_tiles/{z}/{x}/{y}.png" />

                {/* 3. Map Controller for when a building is selected */}
                <MapController selectedBuildingId={selectedBuildingId} />
                <UserLocationMarker />
                {/* 4. THE DATA: Mapping through your buildings */}
                
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

        </div>
    );
    //#endregion
}