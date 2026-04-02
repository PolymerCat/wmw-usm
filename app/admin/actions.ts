"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  CreateBuildingPayload,
  CreateBuildingResult,
  CreateDispenserPayload,
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
import { toAdminSupabaseClient } from "@/lib/admin/supabase-adapter";
import { createSupabaseServerActionClient } from "@/lib/supabase/auth-server";

const AUTH_REQUIRED_MESSAGE = "You must be an admin to perform this action.";
const DISPENSER_NOT_FOUND_MESSAGE = "Dispenser could not be found.";
const BUILDING_NOT_FOUND_MESSAGE = "Building could not be found.";

function success(message: string): MutationResult {
  return { ok: true, message };
}

function failure(message: string): MutationResult {
  return { ok: false, message };
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

export async function createDispenser(
  payload: CreateDispenserPayload
): Promise<MutationResult> {
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
  return success("Dispenser added successfully.");
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
    .select("dispenser_id");

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

  revalidateMapViews();
  return success("Dispenser removed successfully.");
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
