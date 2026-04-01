"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { Building } from "@/lib/types";
import Sidebar from "@/components/ui/Sidebar";

const Map = dynamic(() => import("@/components/ui/Map"), {
  ssr: false,
});

interface MapShellProps {
  buildings: Building[];
}

export default function MapShell({ buildings }: MapShellProps) {
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);

  return (
    <>
      <Sidebar
        key={selectedBuilding?.id ?? "sidebar-empty"}
        building={selectedBuilding}
        onClose={() => setSelectedBuilding(null)}
      />
      <div className="absolute inset-0 z-0">
        <Map
          buildings={buildings}
          selectedBuildingId={selectedBuilding?.id ?? null}
          onBuildingSelect={setSelectedBuilding}
        />
      </div>
    </>
  );
}
