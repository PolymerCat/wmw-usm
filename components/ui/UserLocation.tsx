"use client";
import { useEffect, useState } from 'react';
import { Marker, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';

export default function UserLocationMarker() {
    const [position, setPosition] = useState<L.LatLng | null>(null);
    const [accuracy, setAccuracy] = useState<number>(0);
    const map = useMap();
    const iconEmoji = '🤓';
    useEffect(() => {
        // 1. Start locating the device
        map.locate({
            watch: true,           // Continuously update if the user moves
            enableHighAccuracy: true
        });

        // 2. Event listener for when location is found
        map.on('locationfound', (e) => {
            setPosition(e.latlng);
            setAccuracy(e.accuracy);

            // Optional: Center the map on the user the first time they are found
            map.flyTo(e.latlng, map.getZoom());
        });

        // 3. Event listener for errors (e.g., user denied permission)
        map.on('locationerror', (e) => {
            console.error("Location access denied:", e.message);
        });

        return () => {
            map.stopLocate();
            map.off('locationfound');
            map.off('locationerror');
            position;
        };
    }, [map]);

    if (!position) return null;

    // Custom "Blue Dot" Icon using Tailwind
    const locationIcon = new L.DivIcon({
        className: 'bg-transparent',
        html: `
      <div class="relative flex items-center justify-center w-6 h-6">
        <div class="absolute w-full h-full bg-blue-500 rounded-full opacity-40 animate-ping"></div>
        <div class="relative w-3 h-3 bg-blue-600 border-2 border-white rounded-full shadow-lg"></div>
      </div>
    `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
    });

    const createEmojiIcon = (emoji: string) => {
        return new L.DivIcon({
            className: 'bg-transparent border-none',
            html: `
            <div class="flex flex-col items-center">
                <div class="relative flex items-center justify-center w-10 h-10">
                    <div class="absolute w-full h-full rounded-full bg-blue-400 opacity-20 animate-ping"></div>
                    
                    <div class="relative w-9 h-9 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-blue-100 text-xl z-10">
                        ${emoji}
                    </div>
                </div>

                <div class="mt-1 whitespace-nowrap">
                    <label class="text-[10px] font-bold text-red-600 bg-white/80 px-1 rounded-sm shadow-sm">
                        YOU ARE HERE
                    </label>
                </div>
            </div>
            `,
            iconSize: [60, 60], // Increase height to accommodate the label
            iconAnchor: [30, 20], // Keep the emoji centered, label hangs below
        });
    };

    return (
        <>
            <Marker position={position} icon={createEmojiIcon(iconEmoji)} />
            {/* Visual representation of GPS accuracy/margin of error */}
            <Circle
                center={position}
                radius={accuracy}
                pathOptions={{ fillColor: 'blue', fillOpacity: 0.1, stroke: false }}
            />
        </>
    );
}