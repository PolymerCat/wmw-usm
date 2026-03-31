"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { Building } from "@/lib/types";
import NewSidebar from "@/components/ui/NewSidebar";

const NewMap = dynamic(() => import("@/components/ui/NewMap"), {
  ssr: false,
});

interface MapShellProps {
  buildings: Building[];
}

export default function MapShell({ buildings }: MapShellProps) {
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);

  return (
    <>
      <NewSidebar
        building={selectedBuilding}
        onClose={() => setSelectedBuilding(null)}
      />
      <div className="absolute inset-0 z-0">
        <NewMap
          buildings={buildings}
          selectedBuildingId={selectedBuilding?.id ?? null}
          onBuildingSelect={setSelectedBuilding}
        />
      </div>
    </>
  );
}
