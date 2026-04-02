export type ColdWaterStatus = "Available" | "Unavailable" | "Unknown";
export type MaintenanceStatus =
  | "Operational"
  | "Under Maintenance"
  | "Broken"
  | "Unknown";

export interface Dispenser {
  id: string;
  buildingId: string;
  locationDescription: string;
  brand: string;
  coldWaterStatus: ColdWaterStatus;
  maintenanceStatus: MaintenanceStatus;
}

export interface Building {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  dispensers: Dispenser[];
}
