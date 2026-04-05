import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BUILDINGS_LOAD_ERROR_MESSAGE, getBuildings } from "@/lib/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

type QueryError = {
  message: string;
  code?: string | null;
  hint?: string | null;
  details?: string | null;
};

type QueryResult = {
  data: unknown;
  error: QueryError | null;
};

function makeClient(result: QueryResult | QueryResult[]) {
  const results = Array.isArray(result) ? result : [result];
  let index = 0;
  const order = vi.fn().mockImplementation(async () => {
    const selected = results[Math.min(index, results.length - 1)];
    index += 1;
    return selected;
  });
  const select = vi.fn().mockReturnValue({ order });
  const from = vi.fn().mockReturnValue({ select });
  const getPublicUrl = vi.fn((path: string) => ({
    data: { publicUrl: `https://cdn.test/${path}` },
  }));
  const storageFrom = vi.fn().mockReturnValue({ getPublicUrl });
  return {
    from,
    storage: {
      from: storageFrom,
    },
  };
}

describe("getBuildings", () => {
  const createClientMock = vi.mocked(createSupabaseServerClient);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps nested Supabase rows into Building[]", async () => {
    const client = makeClient({
      data: [
        {
          id: "bld-1",
          name: "School of Computer Sciences",
          latitude: 5.35,
          longitude: 100.3,
          dispensers: [
            {
              building_id: "bld-1",
              dispenser_id: "dsp-1",
              location_description: "Pantry CS",
              brand: "Cuckoo",
              cold_water_status: "Available",
              maintenance_status: "Operational",
              image_paths: ["bld-1/dsp-1/sample.jpg"],
              image_path: "bld-1/dsp-1/sample.jpg",
            },
          ],
        },
      ],
      error: null,
    });
    createClientMock.mockReturnValue(client as never);

    const buildings = await getBuildings();

    expect(buildings).toEqual([
      {
        id: "bld-1",
        name: "School of Computer Sciences",
        latitude: 5.35,
        longitude: 100.3,
        dispensers: [
          {
            id: "dsp-1",
            buildingId: "bld-1",
            locationDescription: "Pantry CS",
            brand: "Cuckoo",
            coldWaterStatus: "Available",
            maintenanceStatus: "Operational",
            imagePaths: ["bld-1/dsp-1/sample.jpg"],
            imageUrls: ["https://cdn.test/bld-1/dsp-1/sample.jpg"],
          },
        ],
      },
    ]);
    expect(client.from).toHaveBeenCalledWith("buildings");
  });

  it("maps unexpected maintenance status values to Unknown", async () => {
    const client = makeClient({
      data: [
        {
          id: "bld-2",
          name: "Library",
          latitude: 5.36,
          longitude: 100.31,
          dispensers: [
            {
              building_id: "bld-2",
              dispenser_id: "dsp-2",
              location_description: "Ground Floor",
              brand: "Coway",
              cold_water_status: "Available",
              maintenance_status: "Out of service",
              image_paths: [],
              image_path: null,
            },
          ],
        },
      ],
      error: null,
    });
    createClientMock.mockReturnValue(client as never);

    const buildings = await getBuildings();

    expect(buildings[0]?.dispensers[0]?.maintenanceStatus).toBe("Unknown");
  });

  it("falls back to legacy image_path query when image_paths column is unavailable", async () => {
    const client = makeClient([
      {
        data: null,
        error: {
          message: "column dispensers.image_paths does not exist",
          code: "42703",
        },
      },
      {
        data: [
          {
            id: "bld-1",
            name: "School of Computer Sciences",
            latitude: 5.35,
            longitude: 100.3,
            dispensers: [
              {
                building_id: "bld-1",
                dispenser_id: "dsp-1",
                location_description: "Pantry CS",
                brand: "Cuckoo",
                cold_water_status: "Available",
                maintenance_status: "Operational",
                image_path: "bld-1/dsp-1/sample.jpg",
              },
            ],
          },
        ],
        error: null,
      },
    ]);
    createClientMock.mockReturnValue(client as never);

    const buildings = await getBuildings();

    expect(buildings[0]?.dispensers[0]?.imagePaths).toEqual([
      "bld-1/dsp-1/sample.jpg",
    ]);
  });

  it("logs structured details and throws a user-safe error when query fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = makeClient({
      data: null,
      error: {
        message: "database unavailable",
        code: "XX001",
        hint: "retry later",
        details: "connection dropped",
      },
    });
    createClientMock.mockReturnValue(client as never);

    await expect(getBuildings()).rejects.toThrow(BUILDINGS_LOAD_ERROR_MESSAGE);
    expect(errorSpy).toHaveBeenCalledWith(
      "[wmw-usm]",
      expect.objectContaining({
        area: "data",
        operation: "get_buildings_query",
        message: "database unavailable",
        code: "XX001",
      })
    );
  });
});
