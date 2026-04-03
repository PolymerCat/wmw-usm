export type ColdWaterStatus = "Available" | "Unavailable" | "Unknown";
export type MaintenanceStatus =
  | "Operational"
  | "Under Maintenance"
  | "Broken"
  | "Unknown";

export const COLD_WATER_STATUS_OPTIONS: readonly ColdWaterStatus[] = [
  "Available",
  "Unavailable",
  "Unknown",
];

export const MAINTENANCE_STATUS_OPTIONS: readonly MaintenanceStatus[] = [
  "Operational",
  "Under Maintenance",
  "Broken",
  "Unknown",
];

export interface Dispenser {
  id: string;
  buildingId: string;
  locationDescription: string;
  brand: string;
  coldWaterStatus: ColdWaterStatus;
  maintenanceStatus: MaintenanceStatus;
  imagePath?: string;
  imageUrl?: string;
}

export interface Building {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  dispensers: Dispenser[];
}

export interface DispenserMutationFields {
  locationDescription: string;
  brand: string;
  coldWaterStatus: ColdWaterStatus;
  maintenanceStatus: MaintenanceStatus;
}

export interface CreateDispenserPayload extends DispenserMutationFields {
  buildingId: string;
}

export interface CreateBuildingPayload {
  name: string;
  latitude: number;
  longitude: number;
}

export interface UpdateDispenserPayload extends DispenserMutationFields {
  buildingId: string;
  dispenserId: string;
}

export interface DeleteDispenserPayload {
  buildingId: string;
  dispenserId: string;
}

export interface UpdateBuildingPinPayload {
  buildingId: string;
  latitude: number;
  longitude: number;
}

export interface MutationResult {
  ok: boolean;
  message: string;
}

export interface CreateDispenserResult extends MutationResult {
  dispenserId?: string;
}

export interface CreateBuildingResult extends MutationResult {
  buildingId?: string;
}
