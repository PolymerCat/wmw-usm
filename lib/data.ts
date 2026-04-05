import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";
import { DISPENSER_IMAGE_BUCKET } from "@/lib/dispenser-images";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Building, ColdWaterStatus, MaintenanceStatus } from "@/lib/types";

type DispenserRow = {
  building_id: string;
  dispenser_id: string;
  location_description: string;
  brand: string;
  cold_water_status: string;
  maintenance_status: string;
  image_paths?: string[] | null;
  image_path: string | null;
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
const BUILDINGS_SELECT_WITH_GALLERY =
  "id,name,latitude,longitude,dispensers(building_id,dispenser_id,location_description,brand,cold_water_status,maintenance_status,image_paths,image_path)";
const BUILDINGS_SELECT_LEGACY =
  "id,name,latitude,longitude,dispensers(building_id,dispenser_id,location_description,brand,cold_water_status,maintenance_status,image_path)";

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

function toImagePaths(dispenser: DispenserRow): string[] {
  if (Array.isArray(dispenser.image_paths)) {
    return dispenser.image_paths.filter(
      (value): value is string => typeof value === "string" && value.length > 0
    );
  }

  if (typeof dispenser.image_path === "string" && dispenser.image_path.length > 0) {
    return [dispenser.image_path];
  }

  return [];
}

function isMissingImagePathsColumn(error: PostgrestError | null) {
  return error?.code === "42703" && error.message.includes("image_paths");
}

export async function getBuildings(): Promise<Building[]> {
  const supabase = createSupabaseServerClient();

  const queryWithGallery = await supabase
    .from("buildings")
    .select(BUILDINGS_SELECT_WITH_GALLERY)
    .order("name");
  const queryResult = isMissingImagePathsColumn(queryWithGallery.error as PostgrestError | null)
    ? await supabase.from("buildings").select(BUILDINGS_SELECT_LEGACY).order("name")
    : queryWithGallery;
  const { data, error } = queryResult;

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
    dispensers: (building.dispensers ?? []).map((dispenser) => {
      const imagePaths = toImagePaths(dispenser);
      const imageUrls = imagePaths.map(
        (path) =>
          supabase.storage.from(DISPENSER_IMAGE_BUCKET).getPublicUrl(path).data
            .publicUrl
      );

      return {
        id: dispenser.dispenser_id,
        buildingId: dispenser.building_id,
        locationDescription: dispenser.location_description,
        brand: dispenser.brand,
        coldWaterStatus: toColdWaterStatus(dispenser.cold_water_status),
        maintenanceStatus: toMaintenanceStatus(dispenser.maintenance_status),
        imagePaths,
        imageUrls,
      };
    }),
  }));
}
