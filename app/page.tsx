"use client";

import { useState } from 'react';
import { Building } from '@/lib/data';
import Map from '@/components/ui/Map';
import Sidebar from '@/components/ui/Sidebar';
import { Droplet } from 'lucide-react';

export default function Home() {
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);

  // Layout structure:
  // - Top Left: Abs Logo & Title
  // - Background: Full viewport Map
  // - Overlay Details: Absolute on mobile bottom, fixed right on desktop

  return (
    <div className="relative min-h-screen w-full flex flex-col md:flex-row overflow-hidden bg-slate-50">

      {/* Absolute Header Overlay */}
      <div className="absolute top-4 left-4 md:top-6 md:left-6 z-[1000] flex items-center gap-3 bg-white/90 backdrop-blur-xl px-4 py-3 rounded-2xl shadow-lg border border-white/20">
        <div className="bg-blue-500 rounded-xl shadow-inner relative flex items-center justify-center w-10 h-10">
          <Droplet className="w-5 h-5 text-white absolute animate-ping opacity-30" />
          <Droplet className="w-5 h-5 text-white relative z-10" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-cyan-500 text-xl leading-none tracking-tight">
            Where's My Water?
          </h1>
          <p className="text-[10px] font-bold text-slate-400 mt-1 tracking-widest uppercase">USM MAIN CAMPUS</p>
        </div>
      </div>

      {/* Map Area */}
      <div className="absolute inset-0 z-0">
        <Map 
          onBuildingSelect={setSelectedBuilding} 
          selectedBuildingId={selectedBuilding?.id || null} 
        />
      </div>

      {/* Sidebar Overlay (Mobile Bottom Sheet / Desktop Sidebar) */}
      <div className={`
        absolute md:relative z-[1000] bottom-0 left-0 w-full md:w-auto h-auto md:h-full 
        transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
        ${selectedBuilding ? 'translate-y-0 translate-x-0' : 'translate-y-full md:translate-y-0 md:translate-x-full md:hidden'}
      `}>
        <Sidebar
          building={selectedBuilding}
          onClose={() => setSelectedBuilding(null)}
        />
      </div>

    </div>
  );
}
