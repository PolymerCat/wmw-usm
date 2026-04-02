import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createBuilding,
  createDispenser,
  deleteDispenser,
  updateBuildingPin,
  updateDispenser,
} from "@/app/admin/actions";
import { requireAdminUser } from "@/lib/admin/auth";
import { createSupabaseServerActionClient } from "@/lib/supabase/auth-server";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/supabase/auth-server", () => ({
  createSupabaseServerActionClient: vi.fn(),
}));

vi.mock("@/lib/admin/auth", () => ({
  requireAdminUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

type SupabaseMockOptions = {
  insertDispenserError?: { message: string } | null;
  insertBuildingError?: { message: string } | null;
  updateDispenserError?: { message: string } | null;
  updateDispenserData?: Array<{ dispenser_id: string }> | null;
  deleteError?: { message: string } | null;
  deleteData?: Array<{ dispenser_id: string }> | null;
  updateBuildingError?: { message: string } | null;
  updateBuildingData?: Array<{ id: string }> | null;
};

function makeSupabaseMock(options: SupabaseMockOptions = {}) {
  const insertDispenser = vi
    .fn()
    .mockResolvedValue({ error: options.insertDispenserError ?? null });
  const insertBuilding = vi
    .fn()
    .mockResolvedValue({ error: options.insertBuildingError ?? null });

  const updateDispenserSelect = vi.fn().mockResolvedValue({
    data: options.updateDispenserData ?? [{ dispenser_id: "dsp-1" }],
    error: options.updateDispenserError ?? null,
  });
  const updateDispenserEqSecond = vi
    .fn()
    .mockReturnValue({ select: updateDispenserSelect });
  const updateDispenserEqFirst = vi
    .fn()
    .mockReturnValue({ eq: updateDispenserEqSecond });
  const updateDispenserCall = vi
    .fn()
    .mockReturnValue({ eq: updateDispenserEqFirst });

  const deleteSelect = vi.fn().mockResolvedValue({
    data: options.deleteData ?? [{ dispenser_id: "dsp-1" }],
    error: options.deleteError ?? null,
  });
  const deleteEqSecond = vi.fn().mockReturnValue({ select: deleteSelect });
  const deleteEqFirst = vi.fn().mockReturnValue({ eq: deleteEqSecond });
  const deleteCall = vi.fn().mockReturnValue({ eq: deleteEqFirst });

  const updateBuildingSelect = vi.fn().mockResolvedValue({
    data: options.updateBuildingData ?? [{ id: "bld-1" }],
    error: options.updateBuildingError ?? null,
  });
  const updateBuildingEq = vi.fn().mockReturnValue({ select: updateBuildingSelect });
  const updateBuildingCall = vi.fn().mockReturnValue({ eq: updateBuildingEq });

  return {
    from: vi.fn((table: string) => {
      if (table === "dispensers") {
        return {
          insert: insertDispenser,
          update: updateDispenserCall,
          delete: deleteCall,
        };
      }

      if (table === "buildings") {
        return {
          insert: insertBuilding,
          update: updateBuildingCall,
        };
      }

      return {};
    }),
    auth: {
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    calls: {
      insertDispenser,
      insertBuilding,
      updateDispenserCall,
      deleteCall,
      updateBuildingCall,
    },
  };
}

describe("admin server actions", () => {
  const createClientMock = vi.mocked(createSupabaseServerActionClient);
  const requireAdminMock = vi.mocked(requireAdminUser);
  const revalidatePathMock = vi.mocked(revalidatePath);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a dispenser when admin user is authorized", async () => {
    const supabase = makeSupabaseMock();
    createClientMock.mockResolvedValue(supabase as never);
    requireAdminMock.mockResolvedValue({ ok: true, email: "admin@example.com" });

    const result = await createDispenser({
      buildingId: "bld-1",
      locationDescription: "Pantry",
      brand: "Cuckoo",
      coldWaterStatus: "Available",
      maintenanceStatus: "Operational",
    });

    expect(result).toEqual({
      ok: true,
      message: "Dispenser added successfully.",
    });
    expect(supabase.calls.insertDispenser).toHaveBeenCalledTimes(1);
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin");
  });

  it("creates a building from pinned coordinates for admin users", async () => {
    const supabase = makeSupabaseMock();
    createClientMock.mockResolvedValue(supabase as never);
    requireAdminMock.mockResolvedValue({ ok: true, email: "admin@example.com" });

    const result = await createBuilding({
      name: "New Building",
      latitude: 5.3552,
      longitude: 100.3009,
    });

    expect(result.ok).toBe(true);
    expect(result.message).toBe("Building created successfully.");
    expect(result.buildingId).toBeTypeOf("string");
    expect(supabase.calls.insertBuilding).toHaveBeenCalledTimes(1);
    expect(supabase.calls.insertBuilding.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        name: "New Building",
        latitude: 5.3552,
        longitude: 100.3009,
      })
    );
  });

  it("updates a dispenser when admin user is authorized", async () => {
    const supabase = makeSupabaseMock();
    createClientMock.mockResolvedValue(supabase as never);
    requireAdminMock.mockResolvedValue({ ok: true, email: "admin@example.com" });

    const result = await updateDispenser({
      buildingId: "bld-1",
      dispenserId: "dsp-1",
      locationDescription: "Level 1 Lobby",
      brand: "Coway",
      coldWaterStatus: "Unavailable",
      maintenanceStatus: "Under Maintenance",
    });

    expect(result).toEqual({
      ok: true,
      message: "Dispenser updated successfully.",
    });
    expect(supabase.calls.updateDispenserCall).toHaveBeenCalledTimes(1);
  });

  it("deletes a dispenser when admin user is authorized", async () => {
    const supabase = makeSupabaseMock();
    createClientMock.mockResolvedValue(supabase as never);
    requireAdminMock.mockResolvedValue({ ok: true, email: "admin@example.com" });

    const result = await deleteDispenser({
      buildingId: "bld-1",
      dispenserId: "dsp-1",
    });

    expect(result).toEqual({
      ok: true,
      message: "Dispenser removed successfully.",
    });
    expect(supabase.calls.deleteCall).toHaveBeenCalledTimes(1);
  });

  it("updates building pin when admin user is authorized", async () => {
    const supabase = makeSupabaseMock();
    createClientMock.mockResolvedValue(supabase as never);
    requireAdminMock.mockResolvedValue({ ok: true, email: "admin@example.com" });

    const result = await updateBuildingPin({
      buildingId: "bld-1",
      latitude: 5.3555,
      longitude: 100.3001,
    });

    expect(result).toEqual({
      ok: true,
      message: "Building pin updated successfully.",
    });
    expect(supabase.calls.updateBuildingCall).toHaveBeenCalledTimes(1);
  });

  it("returns not found when updateDispenser affects no rows", async () => {
    const supabase = makeSupabaseMock({ updateDispenserData: [] });
    createClientMock.mockResolvedValue(supabase as never);
    requireAdminMock.mockResolvedValue({ ok: true, email: "admin@example.com" });

    const result = await updateDispenser({
      buildingId: "bld-1",
      dispenserId: "dsp-missing",
      locationDescription: "Level 1 Lobby",
      brand: "Coway",
      coldWaterStatus: "Unavailable",
      maintenanceStatus: "Under Maintenance",
    });

    expect(result).toEqual({
      ok: false,
      message: "Dispenser could not be found.",
    });
  });

  it("returns not found when deleteDispenser affects no rows", async () => {
    const supabase = makeSupabaseMock({ deleteData: [] });
    createClientMock.mockResolvedValue(supabase as never);
    requireAdminMock.mockResolvedValue({ ok: true, email: "admin@example.com" });

    const result = await deleteDispenser({
      buildingId: "bld-1",
      dispenserId: "dsp-missing",
    });

    expect(result).toEqual({
      ok: false,
      message: "Dispenser could not be found.",
    });
  });

  it("returns not found when updateBuildingPin affects no rows", async () => {
    const supabase = makeSupabaseMock({ updateBuildingData: [] });
    createClientMock.mockResolvedValue(supabase as never);
    requireAdminMock.mockResolvedValue({ ok: true, email: "admin@example.com" });

    const result = await updateBuildingPin({
      buildingId: "bld-missing",
      latitude: 5.3555,
      longitude: 100.3001,
    });

    expect(result).toEqual({
      ok: false,
      message: "Building could not be found.",
    });
  });

  it("rejects mutation when user is not an admin", async () => {
    const supabase = makeSupabaseMock();
    createClientMock.mockResolvedValue(supabase as never);
    requireAdminMock.mockResolvedValue({
      ok: false,
      reason: "forbidden",
      message: "forbidden",
    });

    const result = await createDispenser({
      buildingId: "bld-1",
      locationDescription: "Pantry",
      brand: "Cuckoo",
      coldWaterStatus: "Available",
      maintenanceStatus: "Operational",
    });

    expect(result).toEqual({
      ok: false,
      message: "You must be an admin to perform this action.",
    });
  });

  it("rejects createBuilding when user is not an admin", async () => {
    const supabase = makeSupabaseMock();
    createClientMock.mockResolvedValue(supabase as never);
    requireAdminMock.mockResolvedValue({
      ok: false,
      reason: "forbidden",
      message: "forbidden",
    });

    const result = await createBuilding({
      name: "Another Building",
      latitude: 5.3552,
      longitude: 100.3009,
    });

    expect(result).toEqual({
      ok: false,
      message: "You must be an admin to perform this action.",
    });
  });

  it("rejects invalid create payload before running database mutation", async () => {
    const result = await createDispenser({
      buildingId: "bld-1",
      locationDescription: "   ",
      brand: "Cuckoo",
      coldWaterStatus: "Available",
      maintenanceStatus: "Operational",
    });

    expect(result).toEqual({
      ok: false,
      message: "Location is required.",
    });
    expect(createClientMock).not.toHaveBeenCalled();
    expect(requireAdminMock).not.toHaveBeenCalled();
  });

  it("rejects invalid createBuilding payload before database mutation", async () => {
    const result = await createBuilding({
      name: "  ",
      latitude: 5.3552,
      longitude: 100.3009,
    });

    expect(result).toEqual({
      ok: false,
      message: "Building name is required.",
    });
    expect(createClientMock).not.toHaveBeenCalled();
    expect(requireAdminMock).not.toHaveBeenCalled();
  });
});
