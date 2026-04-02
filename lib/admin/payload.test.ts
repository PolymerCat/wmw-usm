import { describe, expect, it } from "vitest";
import {
  buildCreateBuildingRow,
  buildCreateDispenserRow,
  buildUpdateDispenserRow,
  validatePinPayload,
} from "@/lib/admin/payload";

describe("admin payload helpers", () => {
  it("generates dispenser ids with provided id generator", () => {
    const result = buildCreateDispenserRow(
      {
        buildingId: "cs-building",
        locationDescription: "Level 2 Pantry",
        brand: "Cuckoo",
        coldWaterStatus: "Available",
        maintenanceStatus: "Operational",
      },
      () => "generated-id-123"
    );

    expect(result).toEqual({
      ok: true,
      value: {
        building_id: "cs-building",
        dispenser_id: "generated-id-123",
        location_description: "Level 2 Pantry",
        brand: "Cuckoo",
        cold_water_status: "Available",
        maintenance_status: "Operational",
      },
    });
  });

  it("rejects invalid maintenance statuses for mutations", () => {
    const result = buildUpdateDispenserRow({
      buildingId: "cs-building",
      dispenserId: "dsp-1",
      locationDescription: "Level 2 Pantry",
      brand: "Coway",
      coldWaterStatus: "Available",
      maintenanceStatus: "Unknown",
    });

    expect(result).toEqual({
      ok: false,
      message:
        "Invalid maintenance status. Use Operational, Under Maintenance, or Broken.",
    });
  });

  it("validates building pin latitude and longitude range", () => {
    const result = validatePinPayload({
      buildingId: "cs-building",
      latitude: 123,
      longitude: 100.31,
    });

    expect(result).toEqual({
      ok: false,
      message: "Latitude must be between -90 and 90.",
    });
  });

  it("builds a create building row with generated uuid", () => {
    const result = buildCreateBuildingRow(
      {
        name: "New Building",
        latitude: 5.35511,
        longitude: 100.30022,
      },
      () => "generated-building-id"
    );

    expect(result).toEqual({
      ok: true,
      value: {
        id: "generated-building-id",
        name: "New Building",
        latitude: 5.35511,
        longitude: 100.30022,
      },
    });
  });

  it("rejects empty building name for create building flow", () => {
    const result = buildCreateBuildingRow({
      name: "   ",
      latitude: 5.35511,
      longitude: 100.30022,
    });

    expect(result).toEqual({
      ok: false,
      message: "Building name is required.",
    });
  });
});
