"use client";

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapPin, X, Navigation } from 'lucide-react';
import { Building } from '@/lib/data';
import { MaintenanceBadge, ColdWaterBadge } from './StatusBadge';
import { Droplet } from "lucide-react";
import position from './UserLocation';

interface SidebarProps {
    building: Building | null;
    onClose: () => void;
}

export default function NewSidebar({ building, onClose }: SidebarProps) {
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Stop map interference when interacting with the sidebar
    useEffect(() => {
        const container = sidebarRef.current;
        if (container) {
            L.DomEvent.disableScrollPropagation(container);
            L.DomEvent.disableClickPropagation(container);
        }
    }, [building]);

    // Desktop Empty State
    if (!building) {
        return (
            <div className="hidden md:flex flex-col w-96 h-full bg-slate-50/90 backdrop-blur-xl border-l border-slate-200/50 shadow-2xl p-6 items-center justify-center text-center">
                <MapPin className="w-16 h-16 text-slate-300 mb-4 animate-bounce" />
                <h2 className="text-xl font-bold text-slate-700 tracking-tight">Select a Building</h2>
                <p className="text-sm text-slate-500 mt-2 max-w-[200px]">
                    Tap a marker on the map to see water refill stations.
                </p>
            </div>
        );
    }

    return (
        <div
            ref={sidebarRef}
            className={`
                fixed z-[2000] bottom-0 left-0 
                w-full md:w-96 
                h-[65vh] md:h-full 
                bg-white/95 backdrop-blur-2xl 
                border-t md:border-l md:border-t-0 border-slate-200 
                shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.2)] md:shadow-2xl 
                transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                rounded-t-[32px] md:rounded-t-none
                ${building ? 'translate-y-0' : 'translate-y-full md:translate-x-full md:translate-y-0'}
            `}
        >
            {/* Mobile Drag Handle Cue */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2 md:hidden" />

            {/* WHERES MY WATER? USM */}
            <div className="flex flex-col h-full">
                <div className=" top-4 mt-4 left-4 md:top-6 md:left-6 z-[1000] flex items-center gap-3  px-4 py-3 rounded-2xl  ">
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

                {/* Header: Consistent with your style */}
                <div className="flex items-start justify-between p-6 bg-gradient-to-b from-slate-50 to-white/0 border-b border-slate-100">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none uppercase">
                            {building.name}
                        </h2>
                        <p className="text-sm font-medium text-slate-500 mt-3 flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-blue-500" />
                            {building.dispensers.length} Station{building.dispensers.length !== 1 && 's'} Available
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all active:scale-90"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Scrollable Content: Using your card design */}
                <div className="flex-1 overflow-y-auto w-full scroll-smooth overscroll-contain">
                    <div className="p-4 space-y-4 pb-24"> {/* Extra bottom padding for the button */}
                        {building.dispensers.map((dispenser) => (
                            <div
                                key={dispenser.id}
                                className="bg-white border border-slate-200/70 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 group active:bg-slate-50"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-blue-600 transition-colors">
                                        {dispenser.locationDescription}
                                    </h3>
                                </div>

                                <div className="grid grid-cols-2 gap-y-1.5 mb-4 text-sm">
                                    <div className="font-medium text-slate-400">Brand</div>
                                    <div className="font-semibold text-slate-700 text-right">{dispenser.brand}</div>

                                    <div className="font-medium text-slate-400">Model</div>
                                    <div className="font-semibold text-slate-600 text-right text-xs truncate ml-4">{dispenser.modelName}</div>
                                </div>

                                <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                                    <MaintenanceBadge status={dispenser.maintenanceStatus} />
                                    <ColdWaterBadge status={dispenser.coldWaterStatus} />
                                </div>
                            </div>
                        ))}

                        {/* Your Empty State Logic */}
                        {building.dispensers.length === 0 && (
                            <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                <p className="text-slate-400 font-bold">No data for this building yet.</p>
                                <button className="mt-2 text-blue-600 text-sm font-black underline">Report a Dispenser</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Footer: Navigation Shortcut */}
                <div className="absolute bottom-0 left-0 w-full p-4 bg-white/80 backdrop-blur-md border-t border-slate-100 md:relative">
                    <button
                        onClick={() => {
                            const destination = `${building.latitude},${building.longitude}`;
                            const url = `https://www.google.com/maps?saddr=Current+Location&daddr=${destination}&directionsmode=walking`;
                            window.open(url, '_blank');
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-95"
                    >
                        <Navigation className="w-5 h-5 fill-current" />
                        GET DIRECTIONS
                    </button>
                </div>
            </div>
        </div>
    );
}