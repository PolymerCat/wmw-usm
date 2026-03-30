"use client";

import dynamic from 'next/dynamic';
import { Building } from '@/lib/data';

// Dynamically import the MapComponent with SSR disabled
const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-blue-50/50 backdrop-blur-sm shadow-inner rounded-xl">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-blue-800 animate-pulse">Loading Map...</p>
      </div>
    </div>
  ),
});

interface MapProps {
  onBuildingSelect: (building: Building) => void;
  selectedBuildingId: string | null;
}

export default function Map(props: MapProps) {
  return <MapComponent {...props} />;
}
