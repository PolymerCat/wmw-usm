import type {
  ColdWaterStatus,
  CreateBuildingPayload,
  CreateDispenserPayload,
  DispenserMutationFields,
  MaintenanceStatus,
  UpdateBuildingPinPayload,
  UpdateDispenserPayload,
} from "@/lib/types";
import { COLD_WATER_STATUS_OPTIONS } from "@/lib/types";

export const MAINTENANCE_WRITE_OPTIONS: readonly Exclude<
  MaintenanceStatus,
  "Unknown"
>[] = ["Operational", "Under Maintenance", "Broken"];

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

export type ValidDispenserFields = {
  locationDescription: string;
  brand: string;
  coldWaterStatus: ColdWaterStatus;
  maintenanceStatus: Exclude<MaintenanceStatus, "Unknown">;
};

function isColdWaterStatus(value: string): value is ColdWaterStatus {
  return COLD_WATER_STATUS_OPTIONS.includes(value as ColdWaterStatus);
}

function isMaintenanceWriteStatus(
  value: string
): value is Exclude<MaintenanceStatus, "Unknown"> {
  return MAINTENANCE_WRITE_OPTIONS.includes(
    value as Exclude<MaintenanceStatus, "Unknown">
  );
}

function sanitizeText(value: string, label: string): ValidationResult<string> {
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, message: `${label} is required.` };
  }

  return { ok: true, value: trimmed };
}

function validateCoordinates(
  latitude: number,
  longitude: number
): ValidationResult<{ latitude: number; longitude: number }> {
  const nextLatitude = Number(latitude);
  const nextLongitude = Number(longitude);

  if (!Number.isFinite(nextLatitude) || nextLatitude < -90 || nextLatitude > 90) {
    return { ok: false, message: "Latitude must be between -90 and 90." };
  }

  if (!Number.isFinite(nextLongitude) || nextLongitude < -180 || nextLongitude > 180) {
    return { ok: false, message: "Longitude must be between -180 and 180." };
  }

  return {
    ok: true,
    value: {
      latitude: nextLatitude,
      longitude: nextLongitude,
    },
  };
}

export function validateDispenserFields(
  input: DispenserMutationFields
): ValidationResult<ValidDispenserFields> {
  const location = sanitizeText(input.locationDescription, "Location");
  if (!location.ok) {
    return location;
  }

  const brand = sanitizeText(input.brand, "Brand");
  if (!brand.ok) {
    return brand;
  }

  if (!isColdWaterStatus(input.coldWaterStatus)) {
    return { ok: false, message: "Invalid cold water status." };
  }

  if (!isMaintenanceWriteStatus(input.maintenanceStatus)) {
    return {
      ok: false,
      message: "Invalid maintenance status. Use Operational, Under Maintenance, or Broken.",
    };
  }

  return {
    ok: true,
    value: {
      locationDescription: location.value,
      brand: brand.value,
      coldWaterStatus: input.coldWaterStatus,
      maintenanceStatus: input.maintenanceStatus,
    },
  };
}

export function validateBuildingId(
  buildingId: string
): ValidationResult<string> {
  const normalized = buildingId.trim();
  if (!normalized) {
    return { ok: false, message: "Building is required." };
  }

  return { ok: true, value: normalized };
}

export function validateDispenserId(
  dispenserId: string
): ValidationResult<string> {
  const normalized = dispenserId.trim();
  if (!normalized) {
    return { ok: false, message: "Dispenser id is required." };
  }

  return { ok: true, value: normalized };
}

export function validatePinPayload(
  payload: UpdateBuildingPinPayload
): ValidationResult<UpdateBuildingPinPayload> {
  const buildingId = validateBuildingId(payload.buildingId);
  if (!buildingId.ok) {
    return buildingId;
  }

  const coordinates = validateCoordinates(payload.latitude, payload.longitude);
  if (!coordinates.ok) {
    return coordinates;
  }

  return {
    ok: true,
    value: {
      buildingId: buildingId.value,
      latitude: coordinates.value.latitude,
      longitude: coordinates.value.longitude,
    },
  };
}

export function buildCreateBuildingRow(
  payload: CreateBuildingPayload,
  idGenerator: () => string = () => crypto.randomUUID()
): ValidationResult<{
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}> {
  const name = sanitizeText(payload.name, "Building name");
  if (!name.ok) {
    return name;
  }

  const coordinates = validateCoordinates(payload.latitude, payload.longitude);
  if (!coordinates.ok) {
    return coordinates;
  }

  return {
    ok: true,
    value: {
      id: idGenerator(),
      name: name.value,
      latitude: coordinates.value.latitude,
      longitude: coordinates.value.longitude,
    },
  };
}

export function buildCreateDispenserRow(
  payload: CreateDispenserPayload,
  idGenerator: () => string = () => crypto.randomUUID()
): ValidationResult<{
  building_id: string;
  dispenser_id: string;
  location_description: string;
  brand: string;
  cold_water_status: ColdWaterStatus;
  maintenance_status: Exclude<MaintenanceStatus, "Unknown">;
}> {
  const buildingId = validateBuildingId(payload.buildingId);
  if (!buildingId.ok) {
    return buildingId;
  }

  const fields = validateDispenserFields(payload);
  if (!fields.ok) {
    return fields;
  }

  return {
    ok: true,
    value: {
      building_id: buildingId.value,
      dispenser_id: idGenerator(),
      location_description: fields.value.locationDescription,
      brand: fields.value.brand,
      cold_water_status: fields.value.coldWaterStatus,
      maintenance_status: fields.value.maintenanceStatus,
    },
  };
}

export function buildUpdateDispenserRow(
  payload: UpdateDispenserPayload
): ValidationResult<{
  buildingId: string;
  dispenserId: string;
  values: {
    location_description: string;
    brand: string;
    cold_water_status: ColdWaterStatus;
    maintenance_status: Exclude<MaintenanceStatus, "Unknown">;
  };
}> {
  const buildingId = validateBuildingId(payload.buildingId);
  if (!buildingId.ok) {
    return buildingId;
  }

  const dispenserId = validateDispenserId(payload.dispenserId);
  if (!dispenserId.ok) {
    return dispenserId;
  }

  const fields = validateDispenserFields(payload);
  if (!fields.ok) {
    return fields;
  }

  return {
    ok: true,
    value: {
      buildingId: buildingId.value,
      dispenserId: dispenserId.value,
      values: {
        location_description: fields.value.locationDescription,
        brand: fields.value.brand,
        cold_water_status: fields.value.coldWaterStatus,
        maintenance_status: fields.value.maintenanceStatus,
      },
    },
  };
}
