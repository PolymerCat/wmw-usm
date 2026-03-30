import React from 'react';
import { Building } from '@/lib/data';
import { MapPin, X } from 'lucide-react';
import { MaintenanceBadge, ColdWaterBadge } from './StatusBadge';

interface SidebarProps {
  building: Building | null;
  onClose: () => void;
}

export default function Sidebar({ building, onClose }: SidebarProps) {
  // If no building is selected, don't show the sidebar (on mobile) or show empty state
  if (!building) {
    return (
      <div className="hidden md:flex flex-col w-96 h-full bg-slate-50/90 backdrop-blur-xl border-l border-slate-200/50 shadow-2xl p-6 items-center justify-center text-center">
        <MapPin className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Select a Building</h2>
        <p className="text-sm text-slate-500 mt-2">
          Click on a map marker to view available water dispensers.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full md:w-96 h-[50vh] md:h-full bg-white/95 backdrop-blur-2xl border-t md:border-l md:border-t-0 border-slate-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] md:shadow-2xl transition-all duration-300 z-50 rounded-t-3xl md:rounded-t-none overflow-hidden relative">
      
      {/* Header */}
      <div className="flex items-start justify-between p-6 bg-gradient-to-b from-slate-50 to-white/0 border-b border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none bg-clip-text">
            {building.name}
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-2 flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {building.dispensers.length} Dispenser{building.dispensers.length !== 1 && 's'} Found
          </p>
        </div>
        <button 
          onClick={onClose}
          className="p-2 -mr-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          aria-label="Close details"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto w-full scroll-smooth">
        <div className="p-4 space-y-4">
          {building.dispensers.map((dispenser) => (
            <div 
              key={dispenser.id} 
              className="bg-white border border-slate-200/70 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 group"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">
                  {dispenser.locationDescription}
                </h3>
              </div>
              
              <div className="grid grid-cols-2 gap-y-2 mb-4 text-sm text-slate-600">
                <div className="font-medium text-slate-400">Brand</div>
                <div className="font-semibold text-slate-700 text-right">{dispenser.brand}</div>
                
                <div className="font-medium text-slate-400">Model</div>
                <div className="font-semibold text-slate-700 text-right">{dispenser.modelName}</div>
              </div>

              <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                <MaintenanceBadge status={dispenser.maintenanceStatus} />
                <ColdWaterBadge status={dispenser.coldWaterStatus} />
              </div>
            </div>
          ))}

          {building.dispensers.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-slate-500 font-medium">No dispensers listed yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
