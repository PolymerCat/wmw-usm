"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  createBuilding,
  createDispenser,
  deleteDispenser,
  signOutAdmin,
  updateBuildingPin,
  updateDispenser,
} from "@/app/admin/actions";
import { MAINTENANCE_WRITE_OPTIONS } from "@/lib/admin/payload";
import {
  COLD_WATER_STATUS_OPTIONS,
  type Building,
  type CreateDispenserPayload,
  type Dispenser,
  type DispenserMutationFields,
  type MaintenanceStatus,
} from "@/lib/types";

const AdminMap = dynamic(() => import("@/components/admin/AdminMap"), {
  ssr: false,
});

type FlashMessage = {
  kind: "success" | "error";
  text: string;
};

type EditDraft = {
  dispenserId: string;
  fields: DispenserMutationFields;
  original: DispenserMutationFields;
};

type PinWorkflow = "edit-existing" | "add-new";

const DISCARD_CHANGES_MESSAGE =
  "Discard unsaved dispenser changes? Your draft edits will be lost.";
const DISCARD_NEW_BUILDING_DRAFT_MESSAGE =
  "Discard unsaved new building draft? Your building name and pinned coordinates will be lost.";
const DEFAULT_MUTATION_ERROR_MESSAGE =
  "Something went wrong while saving. Please try again.";

function initialFields(): DispenserMutationFields {
  return {
    locationDescription: "",
    brand: "",
    coldWaterStatus: "Available",
    maintenanceStatus: "Operational",
  };
}

function toEditableDispenser(dispenser: Dispenser): DispenserMutationFields {
  return {
    locationDescription: dispenser.locationDescription,
    brand: dispenser.brand,
    coldWaterStatus: dispenser.coldWaterStatus,
    maintenanceStatus:
      dispenser.maintenanceStatus === "Unknown"
        ? "Operational"
        : dispenser.maintenanceStatus,
  };
}

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

function areDispenserFieldsEqual(
  left: DispenserMutationFields,
  right: DispenserMutationFields
) {
  return (
    left.locationDescription === right.locationDescription &&
    left.brand === right.brand &&
    left.coldWaterStatus === right.coldWaterStatus &&
    left.maintenanceStatus === right.maintenanceStatus
  );
}

function normalizeMaintenanceStatus(status: MaintenanceStatus): MaintenanceStatus {
  return status === "Unknown" ? "Operational" : status;
}

interface AdminDashboardProps {
  buildings: Building[];
  adminEmail: string;
}

export default function AdminDashboard({
  buildings,
  adminEmail,
}: AdminDashboardProps) {
  const router = useRouter();
  const editLocationInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(
    buildings[0]?.id ?? null
  );
  const [newFields, setNewFields] = useState<DispenserMutationFields>(initialFields);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [pinWorkflow, setPinWorkflow] = useState<PinWorkflow>("edit-existing");
  const [newBuildingName, setNewBuildingName] = useState("");
  const [pendingPin, setPendingPin] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [flashMessage, setFlashMessage] = useState<FlashMessage | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedBuilding = useMemo(
    () => buildings.find((building) => building.id === selectedBuildingId) ?? null,
    [buildings, selectedBuildingId]
  );

  const isEditDirty = useMemo(() => {
    if (!editDraft) {
      return false;
    }

    return !areDispenserFieldsEqual(editDraft.fields, editDraft.original);
  }, [editDraft]);

  const isAddBuildingDraftDirty =
    pinWorkflow === "add-new" &&
    (newBuildingName.trim().length > 0 || pendingPin !== null);
  const canPinOnMap =
    pinWorkflow === "add-new" ||
    (pinWorkflow === "edit-existing" && Boolean(selectedBuilding));

  useEffect(() => {
    if (!editDraft?.dispenserId) {
      return;
    }

    editLocationInputRef.current?.focus();
  }, [editDraft?.dispenserId]);

  const clearPinDraft = () => {
    setPendingPin(null);
  };

  const clearNewBuildingDraft = () => {
    setNewBuildingName("");
    setPendingPin(null);
  };

  const setMessage = (kind: FlashMessage["kind"], text: string) => {
    setFlashMessage({ kind, text });
  };

  const runMutation = (
    operation: () => Promise<{ ok: boolean; message: string }>,
    onSuccess?: () => void
  ) => {
    startTransition(() => {
      void (async () => {
        try {
          const result = await operation();

          if (!result.ok) {
            setMessage("error", result.message);
            return;
          }

          setMessage("success", result.message);
          onSuccess?.();
          router.refresh();
        } catch (error) {
          console.error("[wmw-usm]", {
            area: "admin_dashboard",
            operation: "run_mutation",
            message: error instanceof Error ? error.message : "Unknown error",
          });
          setMessage("error", DEFAULT_MUTATION_ERROR_MESSAGE);
        }
      })();
    });
  };

  const discardDraftIfConfirmed = () => {
    if (!editDraft || !isEditDirty) {
      return true;
    }

    const shouldDiscard = window.confirm(DISCARD_CHANGES_MESSAGE);
    if (!shouldDiscard) {
      return false;
    }

    setEditDraft(null);
    return true;
  };

  const discardNewBuildingDraftIfConfirmed = () => {
    if (!isAddBuildingDraftDirty) {
      return true;
    }

    const shouldDiscard = window.confirm(DISCARD_NEW_BUILDING_DRAFT_MESSAGE);
    if (!shouldDiscard) {
      return false;
    }

    clearNewBuildingDraft();
    return true;
  };

  const discardUnsavedChangesIfConfirmed = () => {
    if (!discardDraftIfConfirmed()) {
      return false;
    }

    if (!discardNewBuildingDraftIfConfirmed()) {
      return false;
    }

    return true;
  };

  const handleSelectBuilding = (buildingId: string) => {
    if (!discardUnsavedChangesIfConfirmed()) {
      return;
    }

    setSelectedBuildingId(buildingId);
    setEditDraft(null);
    clearPinDraft();
  };

  const handleCreateDispenser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedBuildingId) {
      setMessage("error", "Select a building before adding a dispenser.");
      return;
    }

    const payload: CreateDispenserPayload = {
      buildingId: selectedBuildingId,
      ...newFields,
      maintenanceStatus: normalizeMaintenanceStatus(newFields.maintenanceStatus),
    };

    runMutation(() => createDispenser(payload), () => {
      setNewFields(initialFields());
    });
  };

  const handleStartEdit = (dispenser: Dispenser) => {
    if (editDraft?.dispenserId === dispenser.id) {
      return;
    }

    if (!discardDraftIfConfirmed()) {
      return;
    }

    const nextFields = toEditableDispenser(dispenser);
    setEditDraft({
      dispenserId: dispenser.id,
      fields: nextFields,
      original: nextFields,
    });
  };

  const handleSaveEditedDispenser = (
    event: FormEvent<HTMLFormElement>,
    dispenserId: string
  ) => {
    event.preventDefault();

    if (!selectedBuildingId || !editDraft || editDraft.dispenserId !== dispenserId) {
      setMessage("error", "Pick a dispenser to update.");
      return;
    }

    const maintenanceStatus = normalizeMaintenanceStatus(
      editDraft.fields.maintenanceStatus
    );

    runMutation(
      () =>
        updateDispenser({
          buildingId: selectedBuildingId,
          dispenserId,
          ...editDraft.fields,
          maintenanceStatus,
        }),
      () => {
        setEditDraft(null);
      }
    );
  };

  const handleCancelEdit = () => {
    setEditDraft(null);
  };

  const handleEditKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Escape") {
      return;
    }

    event.preventDefault();
    handleCancelEdit();
  };

  const handleDeleteDispenser = (dispenserId: string) => {
    if (!selectedBuildingId) {
      setMessage("error", "Select a building first.");
      return;
    }

    const shouldDelete = window.confirm(
      "Delete this dispenser permanently? This action cannot be undone."
    );
    if (!shouldDelete) {
      return;
    }

    runMutation(
      () =>
        deleteDispenser({
          buildingId: selectedBuildingId,
          dispenserId,
        }),
      () => {
        if (editDraft?.dispenserId === dispenserId) {
          setEditDraft(null);
        }
      }
    );
  };

  const handleSwitchPinWorkflow = (nextWorkflow: PinWorkflow) => {
    if (nextWorkflow === pinWorkflow) {
      return;
    }

    if (pinWorkflow === "add-new" && !discardNewBuildingDraftIfConfirmed()) {
      return;
    }

    setPinWorkflow(nextWorkflow);
    setPendingPin(null);
  };

  const handleSavePin = () => {
    if (pinWorkflow !== "edit-existing") {
      setMessage("error", "Switch to Edit Existing mode to update a building pin.");
      return;
    }

    if (!selectedBuilding || !pendingPin) {
      setMessage("error", "Pick a pin on the map first.");
      return;
    }

    runMutation(
      () =>
        updateBuildingPin({
          buildingId: selectedBuilding.id,
          latitude: pendingPin.latitude,
          longitude: pendingPin.longitude,
        }),
      clearPinDraft
    );
  };

  const handleCreateBuildingFromPin = () => {
    if (pinWorkflow !== "add-new") {
      setMessage("error", "Switch to Add New mode to create a building.");
      return;
    }

    const name = newBuildingName.trim();
    if (!name) {
      setMessage("error", "Building name is required.");
      return;
    }

    if (!pendingPin) {
      setMessage("error", "Pick a pin on the map for the new building.");
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          const result = await createBuilding({
            name,
            latitude: pendingPin.latitude,
            longitude: pendingPin.longitude,
          });

          if (!result.ok) {
            setMessage("error", result.message);
            return;
          }

          setMessage("success", result.message);
          if (result.buildingId) {
            setSelectedBuildingId(result.buildingId);
          }
          clearNewBuildingDraft();
          setPinWorkflow("edit-existing");
          router.refresh();
        } catch (error) {
          console.error("[wmw-usm]", {
            area: "admin_dashboard",
            operation: "create_building_from_pin",
            message: error instanceof Error ? error.message : "Unknown error",
          });
          setMessage("error", DEFAULT_MUTATION_ERROR_MESSAGE);
        }
      })();
    });
  };

  return (
    <main className="min-h-screen bg-background px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex w-full max-w-[1300px] flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d4c6e8] bg-white px-4 py-3 shadow-sm md:px-5">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#301a55]">
              Admin Console
            </h1>
            <p className="text-sm text-[#5a4973]">
              Signed in as <span className="font-semibold">{adminEmail}</span>
            </p>
          </div>
          <form action={signOutAdmin}>
            <button
              type="submit"
              className="rounded-xl border border-[#d4c6e8] bg-white px-4 py-2 text-sm font-semibold text-[#482e74] transition hover:border-[#9f82c9] hover:text-[#5f33a0]"
            >
              Sign Out
            </button>
          </form>
        </header>

        {flashMessage ? (
          <p
            className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
              flashMessage.kind === "success"
                ? "border-[#bde3ce] bg-[#e8f7ef] text-[#1d613d]"
                : "border-[#f4c6cc] bg-[#ffeef1] text-[#8f2e37]"
            }`}
          >
            {flashMessage.text}
          </p>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="space-y-3 rounded-2xl border border-[#d4c6e8] bg-white p-4 shadow-sm">
            <h2 className="font-display text-xl font-bold text-[#301a55]">
              Buildings
            </h2>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {buildings.map((building) => (
                <button
                  key={building.id}
                  type="button"
                  onClick={() => handleSelectBuilding(building.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                    selectedBuildingId === building.id
                      ? "border-[#8b65c6] bg-[#f4effc] text-[#381f5f]"
                      : "border-[#e0d5f0] bg-white text-[#4a3a66] hover:border-[#c4afe4]"
                  }`}
                >
                  <p className="font-semibold">{building.name}</p>
                  <p className="text-xs text-[#6b5d84]">
                    {building.dispensers.length} dispenser
                    {building.dispensers.length === 1 ? "" : "s"}
                  </p>
                </button>
              ))}
            </div>
          </aside>

          <div className="flex flex-col gap-6">
            <section className="order-2 rounded-2xl border border-[#d4c6e8] bg-white p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#301a55]">
                    Building Pin
                  </h2>
                  <p className="text-sm text-[#5a4973]">
                    {pinWorkflow === "edit-existing"
                      ? selectedBuilding
                        ? selectedBuilding.name
                        : "Select a building"
                      : "Add a new building by name and pin"}
                  </p>
                </div>
                <div className="inline-flex rounded-xl border border-[#d4c6e8] bg-white p-1">
                  <button
                    type="button"
                    onClick={() => handleSwitchPinWorkflow("edit-existing")}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                      pinWorkflow === "edit-existing"
                        ? "bg-[var(--brand-600)] text-white"
                        : "text-[#4a2d76] hover:bg-[#f4effc]"
                    }`}
                  >
                    Edit Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchPinWorkflow("add-new")}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                      pinWorkflow === "add-new"
                        ? "bg-[#1f7f4b] text-white"
                        : "text-[#4a2d76] hover:bg-[#f0f8f3]"
                    }`}
                  >
                    Add New
                  </button>
                </div>
              </div>

              {pinWorkflow === "edit-existing" ? (
                <div className="mb-3 rounded-xl bg-[#f7f3ff] px-3 py-2 text-sm text-[#463562]">
                  {selectedBuilding ? (
                    <p>
                      Current: {formatCoordinate(selectedBuilding.latitude)},{" "}
                      {formatCoordinate(selectedBuilding.longitude)}
                    </p>
                  ) : (
                    <p>Select a building from the left to edit its pin location.</p>
                  )}
                  {pendingPin ? (
                    <p className="font-semibold text-[#1f7f4b]">
                      Draft: {formatCoordinate(pendingPin.latitude)},{" "}
                      {formatCoordinate(pendingPin.longitude)}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-[#6c5f84]">
                    Click the map to draft a new pin position for the selected
                    building.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleSavePin}
                      disabled={!selectedBuilding || !pendingPin || isPending}
                      className="rounded-xl bg-[#1e7d4a] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#175f38] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Save Pin
                    </button>
                    <button
                      type="button"
                      onClick={clearPinDraft}
                      disabled={!pendingPin || isPending}
                      className="rounded-xl border border-[#d4c6e8] bg-white px-3 py-2 text-sm font-semibold text-[#482e74] transition hover:border-[#9f82c9] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel Draft
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-3 rounded-xl bg-[#f0f8f3] px-3 py-3 text-sm text-[#2f5b45]">
                  <div className="space-y-2">
                    <label
                      htmlFor="new-building-name"
                      className="text-xs font-semibold uppercase tracking-wide text-[#3c7158]"
                    >
                      Building Name
                    </label>
                    <input
                      id="new-building-name"
                      type="text"
                      value={newBuildingName}
                      onChange={(event) => setNewBuildingName(event.target.value)}
                      placeholder="e.g., School of Computer Science"
                      className="w-full rounded-xl border border-[#b8dec8] bg-white px-3 py-2.5 text-sm text-[#254232] outline-none focus:border-[#2f8c5e] focus:ring-2 focus:ring-[#2f8c5e]/20"
                    />
                    <p className="text-xs text-[#486a57]">
                      {pendingPin
                        ? `Pinned: ${formatCoordinate(pendingPin.latitude)}, ${formatCoordinate(pendingPin.longitude)}`
                        : "Click the map to place a pin for the new building."}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleCreateBuildingFromPin}
                      disabled={!newBuildingName.trim() || !pendingPin || isPending}
                      className="rounded-xl bg-[#1f7f4b] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#18653b] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPending ? "Creating..." : "Create Building"}
                    </button>
                    <button
                      type="button"
                      onClick={clearNewBuildingDraft}
                      disabled={!newBuildingName.trim() && !pendingPin}
                      className="rounded-xl border border-[#b8dec8] bg-white px-3 py-2 text-sm font-semibold text-[#2f5b45] transition hover:border-[#8fc5a7] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Clear Draft
                    </button>
                  </div>
                </div>
              )}

              <div className="h-[26rem]">
                <AdminMap
                  buildings={buildings}
                  selectedBuildingId={selectedBuildingId}
                  pinEnabled={canPinOnMap}
                  disableBuildingSelection={pinWorkflow === "add-new"}
                  pendingPin={pendingPin}
                  onSelectBuilding={handleSelectBuilding}
                  onPinSelect={setPendingPin}
                />
              </div>
            </section>

            <section className="order-3">
              <article className="rounded-2xl border border-[#d4c6e8] bg-white p-4 shadow-sm">
                <h2 className="font-display text-xl font-bold text-[#301a55]">
                  Add Dispenser
                </h2>
                <p className="mb-4 text-sm text-[#5a4973]">
                  {selectedBuilding
                    ? `Adding to ${selectedBuilding.name}`
                    : "Select a building first"}
                </p>
                <form onSubmit={handleCreateDispenser} className="space-y-3">
                  <input
                    type="text"
                    value={newFields.locationDescription}
                    onChange={(event) =>
                      setNewFields((prev) => ({
                        ...prev,
                        locationDescription: event.target.value,
                      }))
                    }
                    placeholder="Location description"
                    className="w-full rounded-xl border border-[#d4c6e8] px-3 py-2.5 text-sm outline-none focus:border-[#8b65c6] focus:ring-2 focus:ring-[#8b65c6]/20"
                  />
                  <input
                    type="text"
                    value={newFields.brand}
                    onChange={(event) =>
                      setNewFields((prev) => ({ ...prev, brand: event.target.value }))
                    }
                    placeholder="Brand"
                    className="w-full rounded-xl border border-[#d4c6e8] px-3 py-2.5 text-sm outline-none focus:border-[#8b65c6] focus:ring-2 focus:ring-[#8b65c6]/20"
                  />
                  <select
                    value={newFields.coldWaterStatus}
                    onChange={(event) =>
                      setNewFields((prev) => ({
                        ...prev,
                        coldWaterStatus: event.target.value as
                          | (typeof COLD_WATER_STATUS_OPTIONS)[number]
                          | "Unknown",
                      }))
                    }
                    className="w-full rounded-xl border border-[#d4c6e8] px-3 py-2.5 text-sm outline-none focus:border-[#8b65c6] focus:ring-2 focus:ring-[#8b65c6]/20"
                  >
                    {COLD_WATER_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        Cold Water: {status}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newFields.maintenanceStatus}
                    onChange={(event) =>
                      setNewFields((prev) => ({
                        ...prev,
                        maintenanceStatus: event.target.value as MaintenanceStatus,
                      }))
                    }
                    className="w-full rounded-xl border border-[#d4c6e8] px-3 py-2.5 text-sm outline-none focus:border-[#8b65c6] focus:ring-2 focus:ring-[#8b65c6]/20"
                  >
                    {MAINTENANCE_WRITE_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        Maintenance: {status}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={!selectedBuilding || isPending}
                    className="w-full rounded-xl bg-[var(--brand-600)] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--brand-700)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPending ? "Saving..." : "Add Dispenser"}
                  </button>
                </form>
              </article>
            </section>

            <section className="order-1 rounded-2xl border border-[#d4c6e8] bg-white p-4 shadow-sm">
              <h2 className="mb-1 font-display text-xl font-bold text-[#301a55]">
                Dispensers in {selectedBuilding?.name ?? "Selected Building"}
              </h2>
              <p className="mb-3 text-sm text-[#5a4973]">
                Edit directly in each card. Press Escape to cancel editing.
              </p>

              {!selectedBuilding ? (
                <p className="text-sm text-[#5a4973]">Choose a building to manage dispensers.</p>
              ) : selectedBuilding.dispensers.length === 0 ? (
                <p className="text-sm text-[#5a4973]">No dispensers found for this building.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {selectedBuilding.dispensers.map((dispenser) => {
                    const isEditing = editDraft?.dispenserId === dispenser.id;

                    if (isEditing && editDraft) {
                      return (
                        <article
                          key={`${selectedBuilding.id}:${dispenser.id}`}
                          className="rounded-xl border border-[#ba9adf] bg-[#f8f2ff] p-3"
                        >
                          <form
                            onSubmit={(event) =>
                              handleSaveEditedDispenser(event, dispenser.id)
                            }
                            onKeyDown={handleEditKeyDown}
                            className="space-y-2"
                          >
                            <input
                              ref={editLocationInputRef}
                              type="text"
                              value={editDraft.fields.locationDescription}
                              onChange={(event) =>
                                setEditDraft((current) =>
                                  current && current.dispenserId === dispenser.id
                                    ? {
                                        ...current,
                                        fields: {
                                          ...current.fields,
                                          locationDescription: event.target.value,
                                        },
                                      }
                                    : current
                                )
                              }
                              aria-label={`Edit location for ${dispenser.locationDescription}`}
                              className="w-full rounded-lg border border-[#d4c6e8] bg-white px-3 py-2 text-sm outline-none focus:border-[#8b65c6] focus:ring-2 focus:ring-[#8b65c6]/20"
                            />
                            <input
                              type="text"
                              value={editDraft.fields.brand}
                              onChange={(event) =>
                                setEditDraft((current) =>
                                  current && current.dispenserId === dispenser.id
                                    ? {
                                        ...current,
                                        fields: {
                                          ...current.fields,
                                          brand: event.target.value,
                                        },
                                      }
                                    : current
                                )
                              }
                              aria-label={`Edit brand for ${dispenser.locationDescription}`}
                              className="w-full rounded-lg border border-[#d4c6e8] bg-white px-3 py-2 text-sm outline-none focus:border-[#8b65c6] focus:ring-2 focus:ring-[#8b65c6]/20"
                            />
                            <select
                              value={editDraft.fields.coldWaterStatus}
                              onChange={(event) =>
                                setEditDraft((current) =>
                                  current && current.dispenserId === dispenser.id
                                    ? {
                                        ...current,
                                        fields: {
                                          ...current.fields,
                                          coldWaterStatus: event.target.value as
                                            | (typeof COLD_WATER_STATUS_OPTIONS)[number]
                                            | "Unknown",
                                        },
                                      }
                                    : current
                                )
                              }
                              aria-label={`Edit cold water status for ${dispenser.locationDescription}`}
                              className="w-full rounded-lg border border-[#d4c6e8] bg-white px-3 py-2 text-sm outline-none focus:border-[#8b65c6] focus:ring-2 focus:ring-[#8b65c6]/20"
                            >
                              {COLD_WATER_STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  Cold Water: {status}
                                </option>
                              ))}
                            </select>
                            <select
                              value={editDraft.fields.maintenanceStatus}
                              onChange={(event) =>
                                setEditDraft((current) =>
                                  current && current.dispenserId === dispenser.id
                                    ? {
                                        ...current,
                                        fields: {
                                          ...current.fields,
                                          maintenanceStatus:
                                            event.target.value as MaintenanceStatus,
                                        },
                                      }
                                    : current
                                )
                              }
                              aria-label={`Edit maintenance status for ${dispenser.locationDescription}`}
                              className="w-full rounded-lg border border-[#d4c6e8] bg-white px-3 py-2 text-sm outline-none focus:border-[#8b65c6] focus:ring-2 focus:ring-[#8b65c6]/20"
                            >
                              {MAINTENANCE_WRITE_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  Maintenance: {status}
                                </option>
                              ))}
                            </select>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="submit"
                                aria-label={`Save updates for ${dispenser.locationDescription}`}
                                disabled={isPending}
                                className="rounded-lg bg-[var(--brand-600)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--brand-700)] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isPending ? "Saving..." : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                aria-label={`Cancel edits for ${dispenser.locationDescription}`}
                                disabled={isPending}
                                className="rounded-lg border border-[#d4c6e8] bg-white px-3 py-1.5 text-xs font-semibold text-[#4a2d76] transition hover:border-[#b79adf] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDispenser(dispenser.id)}
                                aria-label={`Delete dispenser ${dispenser.locationDescription}`}
                                disabled={isPending}
                                className="rounded-lg bg-[#ffecef] px-3 py-1.5 text-xs font-semibold text-[#912b35] transition hover:bg-[#ffdbe1] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Delete
                              </button>
                            </div>
                          </form>
                        </article>
                      );
                    }

                    return (
                      <article
                        key={`${selectedBuilding.id}:${dispenser.id}`}
                        className="rounded-xl border border-[#dfd3ef] bg-[#fcfbff] p-3"
                      >
                        <h3 className="font-semibold text-[#2f2050]">
                          {dispenser.locationDescription}
                        </h3>
                        <p className="text-sm text-[#5f5178]">Brand: {dispenser.brand}</p>
                        <p className="text-sm text-[#5f5178]">
                          Cold: {dispenser.coldWaterStatus}
                        </p>
                        <p className="text-sm text-[#5f5178]">
                          Maintenance: {dispenser.maintenanceStatus}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(dispenser)}
                            aria-label={`Edit dispenser ${dispenser.locationDescription}`}
                            className="rounded-lg bg-[#efe6fd] px-3 py-1.5 text-xs font-semibold text-[#4a2d76] transition hover:bg-[#e2d4fb]"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDispenser(dispenser.id)}
                            aria-label={`Delete dispenser ${dispenser.locationDescription}`}
                            className="rounded-lg bg-[#ffecef] px-3 py-1.5 text-xs font-semibold text-[#912b35] transition hover:bg-[#ffdbe1]"
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
