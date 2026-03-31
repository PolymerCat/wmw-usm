import "server-only";

import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Building, ColdWaterStatus, MaintenanceStatus } from "@/lib/types";

type DispenserRow = {
  building_id: string;
  dispenser_id: string;
  location_description: string;
  brand: string;
  cold_water_status: string;
  maintenance_status: string;
};

type BuildingRow = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  dispensers: DispenserRow[] | null;
};

function toColdWaterStatus(value: string): ColdWaterStatus {
  if (value === "Available" || value === "Unavailable" || value === "Unknown") {
    return value;
  }

  return "Unknown";
}

function toMaintenanceStatus(value: string): MaintenanceStatus {
  if (
    value === "Operational" ||
    value === "Under Maintenance" ||
    value === "Broken"
  ) {
    return value;
  }

  return "Broken";
}

export const getBuildings = cache(async (): Promise<Building[]> => {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("buildings")
    .select(
      "id,name,latitude,longitude,dispensers(building_id,dispenser_id,location_description,brand,cold_water_status,maintenance_status)"
    )
    .order("name");

  if (error) {
    throw new Error(`Failed to load buildings from Supabase: ${error.message}`);
  }

  const rows = (data ?? []) as BuildingRow[];

  return rows.map((building) => ({
    id: building.id,
    name: building.name,
    latitude: building.latitude,
    longitude: building.longitude,
    dispensers: (building.dispensers ?? []).map((dispenser) => ({
      id: dispenser.dispenser_id,
      buildingId: dispenser.building_id,
      locationDescription: dispenser.location_description,
      brand: dispenser.brand,
      coldWaterStatus: toColdWaterStatus(dispenser.cold_water_status),
      maintenanceStatus: toMaintenanceStatus(dispenser.maintenance_status),
    })),
  }));
});
