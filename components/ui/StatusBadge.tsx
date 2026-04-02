import type { ColdWaterStatus, MaintenanceStatus } from "@/lib/types";
import {
  AlertTriangle,
  CheckCircle,
  Droplet,
  HelpCircle,
  Wrench,
} from "lucide-react";

interface MaintenanceBadgeProps {
  status: MaintenanceStatus;
}

export function MaintenanceBadge({ status }: MaintenanceBadgeProps) {
  switch (status) {
    case "Operational":
      return (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#b8dcc8] bg-[#e8f7ef] px-2.5 py-1 text-xs font-semibold text-[#155938]">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Operational</span>
        </div>
      );
    case "Under Maintenance":
      return (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#f1ce9a] bg-[#fff2df] px-2.5 py-1 text-xs font-semibold text-[#8a4709]">
          <Wrench className="w-3.5 h-3.5" />
          <span>Under Maintenance</span>
        </div>
      );
    case "Broken":
      return (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#efb9c1] bg-[#ffedf0] px-2.5 py-1 text-xs font-semibold text-[#8a2530]">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Broken</span>
        </div>
      );
    case "Unknown":
      return (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#d6cde3] bg-white px-2.5 py-1 text-xs font-semibold text-[#4f4560]">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Unknown</span>
        </div>
      );
  }
}

interface ColdWaterBadgeProps {
  status: ColdWaterStatus;
}

export function ColdWaterBadge({ status }: ColdWaterBadgeProps) {
  switch (status) {
    case "Available":
      return (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#d8c8ef] bg-[#f5efff] px-2.5 py-1 text-xs font-semibold text-[#4f2887]">
          <Droplet className="h-3.5 w-3.5 fill-[#eb8423] text-[#4f2887]" />
          <span>Cold Water</span>
        </div>
      );
    case "Unavailable":
      return (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#d6cde3] bg-[#f4f0fa] px-2.5 py-1 text-xs font-semibold text-[#4f4560]">
          <Droplet className="h-3.5 w-3.5" />
          <span>No Cold Water</span>
        </div>
      );
    case "Unknown":
      return (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#d6cde3] bg-white px-2.5 py-1 text-xs font-semibold text-[#4f4560]">
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Unknown</span>
        </div>
      );
  }
}
