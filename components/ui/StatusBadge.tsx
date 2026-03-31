import type { MaintenanceStatus, ColdWaterStatus } from '@/lib/types';
import { Wrench, Droplet, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';

interface MaintenanceBadgeProps {
  status: MaintenanceStatus;
}

export function MaintenanceBadge({ status }: MaintenanceBadgeProps) {
  switch (status) {
    case 'Operational':
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-full border border-emerald-200">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Operational</span>
        </div>
      );
    case 'Under Maintenance':
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-100 rounded-full border border-amber-200">
          <Wrench className="w-3.5 h-3.5" />
          <span>Under Maintenance</span>
        </div>
      );
    case 'Broken':
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-100 rounded-full border border-rose-200">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Broken</span>
        </div>
      );
  }
}

interface ColdWaterBadgeProps {
  status: ColdWaterStatus;
}

export function ColdWaterBadge({ status }: ColdWaterBadgeProps) {
  switch (status) {
    case 'Available':
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-cyan-700 bg-cyan-100 rounded-full border border-cyan-200">
          <Droplet className="w-3.5 h-3.5 fill-cyan-400" />
          <span>Cold Water</span>
        </div>
      );
    case 'Unavailable':
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-full border border-slate-200">
          <Droplet className="w-3.5 h-3.5" />
          <span>No Cold Water</span>
        </div>
      );
    case 'Unknown':
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-500 bg-slate-50 rounded-full border border-slate-200 shadow-sm">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Unknown</span>
        </div>
      );
  }
}
