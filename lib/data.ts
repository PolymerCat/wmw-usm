import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";
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

export const BUILDINGS_LOAD_ERROR_MESSAGE =
  "Unable to load water refill data right now.";

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
    value === "Broken" ||
    value === "Unknown"
  ) {
    return value;
  }

  return "Unknown";
}

export async function getBuildings(): Promise<Building[]> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("buildings")
    .select(
      "id,name,latitude,longitude,dispensers(building_id,dispenser_id,location_description,brand,cold_water_status,maintenance_status)"
    )
    .order("name");

  if (error) {
    const typedError = error as PostgrestError | null;
    console.error("[wmw-usm]", {
      area: "data",
      operation: "get_buildings_query",
      message: typedError?.message ?? "Unknown Supabase error",
      code: typedError?.code ?? null,
      hint: typedError?.hint ?? null,
      details: typedError?.details ?? null,
    });
    throw new Error(BUILDINGS_LOAD_ERROR_MESSAGE);
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
}
