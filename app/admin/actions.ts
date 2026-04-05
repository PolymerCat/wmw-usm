"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  CreateBuildingPayload,
  CreateBuildingResult,
  CreateDispenserPayload,
  CreateDispenserResult,
  DeleteDispenserPayload,
  MutationResult,
  UpdateBuildingPinPayload,
  UpdateDispenserPayload,
} from "@/lib/types";
import { requireAdminUser } from "@/lib/admin/auth";
import {
  buildCreateBuildingRow,
  buildCreateDispenserRow,
  buildUpdateDispenserRow,
  validateBuildingId,
  validateDispenserId,
  validatePinPayload,
} from "@/lib/admin/payload";
import {
  DISPENSER_IMAGE_BUCKET,
  DISPENSER_IMAGE_MAX_BYTES,
  DISPENSER_IMAGE_MAX_COUNT,
  buildDispenserImagePath,
  getDispenserImageExtension,
} from "@/lib/dispenser-images";
import { toAdminSupabaseClient } from "@/lib/admin/supabase-adapter";
import { createSupabaseServerActionClient } from "@/lib/supabase/auth-server";

const AUTH_REQUIRED_MESSAGE = "You must be an admin to perform this action.";
const DISPENSER_NOT_FOUND_MESSAGE = "Dispenser could not be found.";
const BUILDING_NOT_FOUND_MESSAGE = "Building could not be found.";
const IMAGE_REQUIRED_MESSAGE = "Please choose an image file.";
const IMAGE_TYPE_MESSAGE =
  "Unsupported image format. Use JPEG, PNG, or WEBP.";
const IMAGE_SIZE_MESSAGE = "Image size must be 5 MB or less.";
const IMAGE_COUNT_MESSAGE = `Maximum ${DISPENSER_IMAGE_MAX_COUNT} images are allowed per dispenser.`;

function success(message: string): MutationResult {
  return { ok: true, message };
}

function failure(message: string): MutationResult {
  return { ok: false, message };
}

function successCreateDispenser(
  message: string,
  dispenserId: string
): CreateDispenserResult {
  return { ok: true, message, dispenserId };
}

async function ensureAdmin() {
  const supabase = await createSupabaseServerActionClient();
  const guard = await requireAdminUser(toAdminSupabaseClient(supabase));
  return { supabase, guard };
}

function revalidateMapViews() {
  revalidatePath("/");
  revalidatePath("/admin");
}

async function fetchDispenserImagePath(
  supabase: Awaited<ReturnType<typeof createSupabaseServerActionClient>>,
  buildingId: string,
  dispenserId: string
): Promise<{ ok: true; imagePaths: string[] } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from("dispensers")
    .select("image_paths,image_path")
    .eq("building_id", buildingId)
    .eq("dispenser_id", dispenserId)
    .maybeSingle();

  if (error) {
    console.error("[wmw-usm]", {
      area: "admin",
      operation: "fetch_dispenser_image_path",
      message: error.message,
      buildingId,
      dispenserId,
    });
    return { ok: false, message: "Unable to load dispenser image details right now." };
  }

  if (!data || typeof data !== "object") {
    return { ok: false, message: DISPENSER_NOT_FOUND_MESSAGE };
  }

  const row = data as { image_paths?: unknown; image_path?: unknown };
  const imagePaths = Array.isArray(row.image_paths)
    ? row.image_paths.filter(
        (value): value is string => typeof value === "string" && value.length > 0
      )
    : typeof row.image_path === "string" && row.image_path.length > 0
      ? [row.image_path]
      : [];

  return {
    ok: true,
    imagePaths,
  };
}

export async function createDispenser(
  payload: CreateDispenserPayload
): Promise<CreateDispenserResult> {
  const built = buildCreateDispenserRow(payload);
  if (!built.ok) {
    return failure(built.message);
  }

  const { supabase, guard } = await ensureAdmin();
  if (!guard.ok) {
    return failure(AUTH_REQUIRED_MESSAGE);
  }

  const { error } = await supabase.from("dispensers").insert(built.value);
  if (error) {
    console.error("[wmw-usm]", {
      area: "admin",
      operation: "create_dispenser",
      message: error.message,
      buildingId: built.value.building_id,
    });
    return failure("Unable to create dispenser right now.");
  }

  revalidateMapViews();
  return successCreateDispenser(
    "Dispenser added successfully.",
    built.value.dispenser_id
  );
}

export async function createBuilding(
  payload: CreateBuildingPayload
): Promise<CreateBuildingResult> {
  const built = buildCreateBuildingRow(payload);
  if (!built.ok) {
    return failure(built.message);
  }

  const { supabase, guard } = await ensureAdmin();
  if (!guard.ok) {
    return failure(AUTH_REQUIRED_MESSAGE);
  }

  const { error } = await supabase.from("buildings").insert(built.value);
  if (error) {
    console.error("[wmw-usm]", {
      area: "admin",
      operation: "create_building",
      message: error.message,
      buildingId: built.value.id,
    });
    return failure("Unable to create building right now.");
  }

  revalidateMapViews();
  return {
    ok: true,
    message: "Building created successfully.",
    buildingId: built.value.id,
  };
}

export async function updateDispenser(
  payload: UpdateDispenserPayload
): Promise<MutationResult> {
  const built = buildUpdateDispenserRow(payload);
  if (!built.ok) {
    return failure(built.message);
  }

  const { supabase, guard } = await ensureAdmin();
  if (!guard.ok) {
    return failure(AUTH_REQUIRED_MESSAGE);
  }

  const { data, error } = await supabase
    .from("dispensers")
    .update(built.value.values)
    .eq("building_id", built.value.buildingId)
    .eq("dispenser_id", built.value.dispenserId)
    .select("dispenser_id");

  if (error) {
    console.error("[wmw-usm]", {
      area: "admin",
      operation: "update_dispenser",
      message: error.message,
      buildingId: built.value.buildingId,
      dispenserId: built.value.dispenserId,
    });
    return failure("Unable to update dispenser right now.");
  }

  if (!data?.length) {
    return failure(DISPENSER_NOT_FOUND_MESSAGE);
  }

  revalidateMapViews();
  return success("Dispenser updated successfully.");
}

export async function deleteDispenser(
  payload: DeleteDispenserPayload
): Promise<MutationResult> {
  const buildingId = validateBuildingId(payload.buildingId);
  if (!buildingId.ok) {
    return failure(buildingId.message);
  }

  const dispenserId = validateDispenserId(payload.dispenserId);
  if (!dispenserId.ok) {
    return failure(dispenserId.message);
  }

  const { supabase, guard } = await ensureAdmin();
  if (!guard.ok) {
    return failure(AUTH_REQUIRED_MESSAGE);
  }

  const { data, error } = await supabase
    .from("dispensers")
    .delete()
    .eq("building_id", buildingId.value)
    .eq("dispenser_id", dispenserId.value)
    .select("dispenser_id,image_paths,image_path");

  if (error) {
    console.error("[wmw-usm]", {
      area: "admin",
      operation: "delete_dispenser",
      message: error.message,
      buildingId: buildingId.value,
      dispenserId: dispenserId.value,
    });
    return failure("Unable to remove dispenser right now.");
  }

  if (!data?.length) {
    return failure(DISPENSER_NOT_FOUND_MESSAGE);
  }

  const imagePaths = data
    .map((row) => {
      if (!row || typeof row !== "object") {
        return [] as string[];
      }

      const typedRow = row as {
        image_paths?: unknown;
        image_path?: unknown;
      };
      if (Array.isArray(typedRow.image_paths)) {
        return typedRow.image_paths.filter(
          (value): value is string => typeof value === "string" && value.length > 0
        );
      }

      return typeof typedRow.image_path === "string" && typedRow.image_path.length > 0
        ? [typedRow.image_path]
        : [];
    })
    .flat();
  const uniqueImagePaths = [...new Set(imagePaths)];

  if (uniqueImagePaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(DISPENSER_IMAGE_BUCKET)
      .remove(uniqueImagePaths);

    if (storageError) {
      console.error("[wmw-usm]", {
        area: "admin",
        operation: "delete_dispenser_image_cleanup",
        message: storageError.message,
        buildingId: buildingId.value,
        dispenserId: dispenserId.value,
      });
    }
  }

  revalidateMapViews();
  return success("Dispenser removed successfully.");
}

export async function uploadDispenserImage(
  formData: FormData
): Promise<MutationResult> {
  const buildingId = validateBuildingId(String(formData.get("buildingId") ?? ""));
  if (!buildingId.ok) {
    return failure(buildingId.message);
  }

  const dispenserId = validateDispenserId(String(formData.get("dispenserId") ?? ""));
  if (!dispenserId.ok) {
    return failure(dispenserId.message);
  }

  const imageFiles = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File);
  const legacyImage = formData.get("image");
  const filesToUpload =
    imageFiles.length > 0
      ? imageFiles
      : legacyImage instanceof File
        ? [legacyImage]
        : [];

  if (filesToUpload.length === 0) {
    return failure(IMAGE_REQUIRED_MESSAGE);
  }

  const validatedImages: Array<{ file: File; extension: string }> = [];
  for (const imageFile of filesToUpload) {
    if (imageFile.size > DISPENSER_IMAGE_MAX_BYTES) {
      return failure(IMAGE_SIZE_MESSAGE);
    }

    const extension = getDispenserImageExtension(imageFile.type);
    if (!extension) {
      return failure(IMAGE_TYPE_MESSAGE);
    }

    validatedImages.push({ file: imageFile, extension });
  }

  const { supabase, guard } = await ensureAdmin();
  if (!guard.ok) {
    return failure(AUTH_REQUIRED_MESSAGE);
  }

  const currentImage = await fetchDispenserImagePath(
    supabase,
    buildingId.value,
    dispenserId.value
  );
  if (!currentImage.ok) {
    return currentImage;
  }

  if (currentImage.imagePaths.length + validatedImages.length > DISPENSER_IMAGE_MAX_COUNT) {
    return failure(IMAGE_COUNT_MESSAGE);
  }

  const uploadedPaths: string[] = [];
  for (const image of validatedImages) {
    const imagePath = buildDispenserImagePath(
      buildingId.value,
      dispenserId.value,
      image.extension
    );
    const { error: uploadError } = await supabase.storage
      .from(DISPENSER_IMAGE_BUCKET)
      .upload(imagePath, image.file, {
        contentType: image.file.type,
        upsert: false,
      });

    if (uploadError) {
      if (uploadedPaths.length > 0) {
        const { error: cleanupError } = await supabase.storage
          .from(DISPENSER_IMAGE_BUCKET)
          .remove(uploadedPaths);

        if (cleanupError) {
          console.error("[wmw-usm]", {
            area: "admin",
            operation: "upload_dispenser_image_rollback",
            message: cleanupError.message,
            buildingId: buildingId.value,
            dispenserId: dispenserId.value,
          });
        }
      }
      console.error("[wmw-usm]", {
        area: "admin",
        operation: "upload_dispenser_image_file",
        message: uploadError.message,
        buildingId: buildingId.value,
        dispenserId: dispenserId.value,
      });
      return failure("Unable to upload dispenser image right now.");
    }

    uploadedPaths.push(imagePath);
  }

  const nextImagePaths = [...currentImage.imagePaths, ...uploadedPaths];
  const { data: updatedRows, error: updateError } = await supabase
    .from("dispensers")
    .update({
      image_paths: nextImagePaths,
      image_path: nextImagePaths[0] ?? null,
    })
    .eq("building_id", buildingId.value)
    .eq("dispenser_id", dispenserId.value)
    .select("dispenser_id");

  if (updateError || !updatedRows?.length) {
    const { error: cleanupError } = await supabase.storage
      .from(DISPENSER_IMAGE_BUCKET)
      .remove(uploadedPaths);

    if (cleanupError) {
      console.error("[wmw-usm]", {
        area: "admin",
        operation: "upload_dispenser_image_rollback",
        message: cleanupError.message,
        buildingId: buildingId.value,
        dispenserId: dispenserId.value,
      });
    }

    if (updateError) {
      console.error("[wmw-usm]", {
        area: "admin",
        operation: "upload_dispenser_image_update_row",
        message: updateError.message,
        buildingId: buildingId.value,
        dispenserId: dispenserId.value,
      });
      return failure("Unable to save dispenser image right now.");
    }

    return failure(DISPENSER_NOT_FOUND_MESSAGE);
  }

  revalidateMapViews();
  return success(
    validatedImages.length === 1
      ? "Dispenser image uploaded successfully."
      : "Dispenser images uploaded successfully."
  );
}

export async function removeDispenserImage(
  payload: DeleteDispenserPayload
): Promise<MutationResult> {
  const buildingId = validateBuildingId(payload.buildingId);
  if (!buildingId.ok) {
    return failure(buildingId.message);
  }

  const dispenserId = validateDispenserId(payload.dispenserId);
  if (!dispenserId.ok) {
    return failure(dispenserId.message);
  }

  const { supabase, guard } = await ensureAdmin();
  if (!guard.ok) {
    return failure(AUTH_REQUIRED_MESSAGE);
  }

  const currentImage = await fetchDispenserImagePath(
    supabase,
    buildingId.value,
    dispenserId.value
  );
  if (!currentImage.ok) {
    return currentImage;
  }

  if (currentImage.imagePaths.length === 0) {
    return success("Dispenser image removed successfully.");
  }

  const { error: storageError } = await supabase.storage
    .from(DISPENSER_IMAGE_BUCKET)
    .remove(currentImage.imagePaths);

  if (storageError) {
    console.error("[wmw-usm]", {
      area: "admin",
      operation: "remove_dispenser_image_file",
      message: storageError.message,
      buildingId: buildingId.value,
      dispenserId: dispenserId.value,
    });
    return failure("Unable to remove dispenser image right now.");
  }

  const { data, error } = await supabase
    .from("dispensers")
    .update({
      image_paths: [],
      image_path: null,
    })
    .eq("building_id", buildingId.value)
    .eq("dispenser_id", dispenserId.value)
    .select("dispenser_id");

  if (error) {
    console.error("[wmw-usm]", {
      area: "admin",
      operation: "remove_dispenser_image_update_row",
      message: error.message,
      buildingId: buildingId.value,
      dispenserId: dispenserId.value,
    });
    return failure("Unable to remove dispenser image right now.");
  }

  if (!data?.length) {
    return failure(DISPENSER_NOT_FOUND_MESSAGE);
  }

  revalidateMapViews();
  return success("Dispenser image removed successfully.");
}

export async function updateBuildingPin(
  payload: UpdateBuildingPinPayload
): Promise<MutationResult> {
  const validated = validatePinPayload(payload);
  if (!validated.ok) {
    return failure(validated.message);
  }

  const { supabase, guard } = await ensureAdmin();
  if (!guard.ok) {
    return failure(AUTH_REQUIRED_MESSAGE);
  }

  const { data, error } = await supabase
    .from("buildings")
    .update({
      latitude: validated.value.latitude,
      longitude: validated.value.longitude,
    })
    .eq("id", validated.value.buildingId)
    .select("id");

  if (error) {
    console.error("[wmw-usm]", {
      area: "admin",
      operation: "update_building_pin",
      message: error.message,
      buildingId: validated.value.buildingId,
      latitude: validated.value.latitude,
      longitude: validated.value.longitude,
    });
    return failure("Unable to update building pin right now.");
  }

  if (!data?.length) {
    return failure(BUILDING_NOT_FOUND_MESSAGE);
  }

  revalidateMapViews();
  return success("Building pin updated successfully.");
}

export async function signOutAdmin() {
  const supabase = await createSupabaseServerActionClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
