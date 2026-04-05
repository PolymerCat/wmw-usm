import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createBuilding,
  createDispenser,
  deleteDispenser,
  removeDispenserImage,
  updateBuildingPin,
  updateDispenser,
  uploadDispenserImage,
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
  updateImageError?: { message: string } | null;
  updateImageData?: Array<{ dispenser_id: string }> | null;
  deleteError?: { message: string } | null;
  deleteData?: Array<{
    dispenser_id: string;
    image_paths?: string[] | null;
    image_path?: string | null;
  }> | null;
  updateBuildingError?: { message: string } | null;
  updateBuildingData?: Array<{ id: string }> | null;
  dispenserLookupError?: { message: string } | null;
  dispenserLookupData?: { image_paths?: string[] | null; image_path?: string | null } | null;
  storageUploadError?: { message: string } | null;
  storageRemoveError?: { message: string } | null;
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

  const updateImageSelect = vi.fn().mockResolvedValue({
    data: options.updateImageData ?? [{ dispenser_id: "dsp-1" }],
    error: options.updateImageError ?? null,
  });
  const updateImageEqSecond = vi.fn().mockReturnValue({ select: updateImageSelect });
  const updateImageEqFirst = vi.fn().mockReturnValue({ eq: updateImageEqSecond });
  const updateImageCall = vi.fn().mockReturnValue({ eq: updateImageEqFirst });

  const updateDispenserTable = vi.fn((values: Record<string, unknown>) => {
    if (
      Object.prototype.hasOwnProperty.call(values, "image_path") ||
      Object.prototype.hasOwnProperty.call(values, "image_paths")
    ) {
      return updateImageCall(values);
    }

    return updateDispenserCall(values);
  });

  const deleteSelect = vi.fn().mockResolvedValue({
    data:
      options.deleteData ??
      [{ dispenser_id: "dsp-1", image_paths: [], image_path: null }],
    error: options.deleteError ?? null,
  });
  const deleteEqSecond = vi.fn().mockReturnValue({ select: deleteSelect });
  const deleteEqFirst = vi.fn().mockReturnValue({ eq: deleteEqSecond });
  const deleteCall = vi.fn().mockReturnValue({ eq: deleteEqFirst });

  const dispenserLookupMaybeSingle = vi.fn().mockResolvedValue({
    data: options.dispenserLookupData ?? { image_paths: [], image_path: null },
    error: options.dispenserLookupError ?? null,
  });
  const dispenserLookupEqSecond = vi
    .fn()
    .mockReturnValue({ maybeSingle: dispenserLookupMaybeSingle });
  const dispenserLookupEqFirst = vi.fn().mockReturnValue({ eq: dispenserLookupEqSecond });
  const dispenserLookupSelect = vi.fn().mockReturnValue({ eq: dispenserLookupEqFirst });

  const updateBuildingSelect = vi.fn().mockResolvedValue({
    data: options.updateBuildingData ?? [{ id: "bld-1" }],
    error: options.updateBuildingError ?? null,
  });
  const updateBuildingEq = vi.fn().mockReturnValue({ select: updateBuildingSelect });
  const updateBuildingCall = vi.fn().mockReturnValue({ eq: updateBuildingEq });

  const storageUpload = vi
    .fn()
    .mockResolvedValue({ error: options.storageUploadError ?? null });
  const storageRemove = vi
    .fn()
    .mockResolvedValue({ error: options.storageRemoveError ?? null });
  const storageFrom = vi.fn().mockReturnValue({
    upload: storageUpload,
    remove: storageRemove,
  });

  return {
    from: vi.fn((table: string) => {
      if (table === "dispensers") {
        return {
          insert: insertDispenser,
          update: updateDispenserTable,
          delete: deleteCall,
          select: dispenserLookupSelect,
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
    storage: {
      from: storageFrom,
    },
    auth: {
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    calls: {
      insertDispenser,
      insertBuilding,
      updateDispenserCall,
      updateImageCall,
      deleteCall,
      updateBuildingCall,
      dispenserLookupSelect,
      storageUpload,
      storageRemove,
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

    expect(result.ok).toBe(true);
    expect(result.message).toBe("Dispenser added successfully.");
    expect(result.dispenserId).toBeTypeOf("string");
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

  it("keeps dispenser deletion successful when image cleanup fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const supabase = makeSupabaseMock({
      deleteData: [
        {
          dispenser_id: "dsp-1",
          image_paths: ["bld-1/dsp-1/pic.jpg", "bld-1/dsp-1/pic-2.jpg"],
        },
      ],
      storageRemoveError: { message: "storage unavailable" },
    });
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
    expect(supabase.calls.storageRemove).toHaveBeenCalledWith([
      "bld-1/dsp-1/pic.jpg",
      "bld-1/dsp-1/pic-2.jpg",
    ]);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("uploads dispenser images and updates image_paths", async () => {
    const supabase = makeSupabaseMock();
    createClientMock.mockResolvedValue(supabase as never);
    requireAdminMock.mockResolvedValue({ ok: true, email: "admin@example.com" });

    const formData = new FormData();
    formData.append("buildingId", "bld-1");
    formData.append("dispenserId", "dsp-1");
    formData.append(
      "images",
      new File([new Uint8Array([1, 2, 3])], "demo.png", { type: "image/png" })
    );

    const result = await uploadDispenserImage(formData);

    expect(result).toEqual({
      ok: true,
      message: "Dispenser image uploaded successfully.",
    });
    expect(supabase.calls.storageUpload).toHaveBeenCalledTimes(1);
    expect(supabase.calls.updateImageCall).toHaveBeenCalledTimes(1);
  });

  it("accepts legacy single-image form payloads", async () => {
    const supabase = makeSupabaseMock();
    createClientMock.mockResolvedValue(supabase as never);
    requireAdminMock.mockResolvedValue({ ok: true, email: "admin@example.com" });

    const formData = new FormData();
    formData.append("buildingId", "bld-1");
    formData.append("dispenserId", "dsp-1");
    formData.append("image", new File(["legacy"], "legacy.jpg", { type: "image/jpeg" }));

    const result = await uploadDispenserImage(formData);

    expect(result).toEqual({
      ok: true,
      message: "Dispenser image uploaded successfully.",
    });
    expect(supabase.calls.storageUpload).toHaveBeenCalledTimes(1);
  });

  it("appends dispenser images without deleting existing files", async () => {
    const supabase = makeSupabaseMock({
      dispenserLookupData: {
        image_paths: ["bld-1/dsp-1/old.jpg"],
        image_path: "bld-1/dsp-1/old.jpg",
      },
    });
    createClientMock.mockResolvedValue(supabase as never);
    requireAdminMock.mockResolvedValue({ ok: true, email: "admin@example.com" });

    const formData = new FormData();
    formData.append("buildingId", "bld-1");
    formData.append("dispenserId", "dsp-1");
    formData.append("images", new File(["next"], "next.webp", { type: "image/webp" }));

    const result = await uploadDispenserImage(formData);

    expect(result).toEqual({
      ok: true,
      message: "Dispenser image uploaded successfully.",
    });
    expect(supabase.calls.storageRemove).not.toHaveBeenCalled();
    expect(supabase.calls.updateImageCall.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        image_paths: expect.arrayContaining(["bld-1/dsp-1/old.jpg"]),
      })
    );
  });

  it("removes dispenser image when admin user is authorized", async () => {
    const supabase = makeSupabaseMock({
      dispenserLookupData: {
        image_paths: ["bld-1/dsp-1/existing.jpg", "bld-1/dsp-1/existing-2.jpg"],
        image_path: "bld-1/dsp-1/existing.jpg",
      },
    });
    createClientMock.mockResolvedValue(supabase as never);
    requireAdminMock.mockResolvedValue({ ok: true, email: "admin@example.com" });

    const result = await removeDispenserImage({
      buildingId: "bld-1",
      dispenserId: "dsp-1",
    });

    expect(result).toEqual({
      ok: true,
      message: "Dispenser image removed successfully.",
    });
    expect(supabase.calls.storageRemove).toHaveBeenCalledWith([
      "bld-1/dsp-1/existing.jpg",
      "bld-1/dsp-1/existing-2.jpg",
    ]);
    expect(supabase.calls.updateImageCall).toHaveBeenCalledTimes(1);
    expect(supabase.calls.updateImageCall.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        image_paths: [],
        image_path: null,
      })
    );
  });

  it("rejects invalid image type for uploads", async () => {
    const formData = new FormData();
    formData.append("buildingId", "bld-1");
    formData.append("dispenserId", "dsp-1");
    formData.append(
      "images",
      new File(["gif"], "bad.gif", {
        type: "image/gif",
      })
    );

    const result = await uploadDispenserImage(formData);

    expect(result).toEqual({
      ok: false,
      message: "Unsupported image format. Use JPEG, PNG, or WEBP.",
    });
  });

  it("rejects oversized image uploads", async () => {
    const formData = new FormData();
    formData.append("buildingId", "bld-1");
    formData.append("dispenserId", "dsp-1");
    formData.append(
      "images",
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "huge.png", {
        type: "image/png",
      })
    );

    const result = await uploadDispenserImage(formData);

    expect(result).toEqual({
      ok: false,
      message: "Image size must be 5 MB or less.",
    });
  });

  it("rejects uploads that exceed maximum image count", async () => {
    const supabase = makeSupabaseMock({
      dispenserLookupData: {
        image_paths: [
          "bld-1/dsp-1/1.jpg",
          "bld-1/dsp-1/2.jpg",
          "bld-1/dsp-1/3.jpg",
          "bld-1/dsp-1/4.jpg",
          "bld-1/dsp-1/5.jpg",
          "bld-1/dsp-1/6.jpg",
          "bld-1/dsp-1/7.jpg",
          "bld-1/dsp-1/8.jpg",
        ],
      },
    });
    createClientMock.mockResolvedValue(supabase as never);
    requireAdminMock.mockResolvedValue({ ok: true, email: "admin@example.com" });

    const formData = new FormData();
    formData.append("buildingId", "bld-1");
    formData.append("dispenserId", "dsp-1");
    formData.append("images", new File(["png"], "img.png", { type: "image/png" }));

    const result = await uploadDispenserImage(formData);

    expect(result).toEqual({
      ok: false,
      message: "Maximum 8 images are allowed per dispenser.",
    });
    expect(supabase.calls.storageUpload).not.toHaveBeenCalled();
  });

  it("rejects upload when user is not an admin", async () => {
    const supabase = makeSupabaseMock();
    createClientMock.mockResolvedValue(supabase as never);
    requireAdminMock.mockResolvedValue({
      ok: false,
      reason: "forbidden",
      message: "forbidden",
    });

    const formData = new FormData();
    formData.append("buildingId", "bld-1");
    formData.append("dispenserId", "dsp-1");
    formData.append("images", new File(["png"], "img.png", { type: "image/png" }));

    const result = await uploadDispenserImage(formData);

    expect(result).toEqual({
      ok: false,
      message: "You must be an admin to perform this action.",
    });
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
