"use client";

import {
  type ChangeEvent,
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
  removeDispenserImage,
  signOutAdmin,
  uploadDispenserImage,
  updateBuildingPin,
  updateDispenser,
} from "@/app/admin/actions";
import {
  DISPENSER_IMAGE_ALLOWED_MIME_TYPES,
  DISPENSER_IMAGE_MAX_COUNT,
  DISPENSER_IMAGE_MAX_BYTES,
} from "@/lib/dispenser-images";
import DispenserImageSlider from "@/components/ui/DispenserImageSlider";
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
  hasImages: boolean;
  imageFiles: File[];
  removeImages: boolean;
};

type PinWorkflow = "edit-existing" | "add-new";

const DISCARD_CHANGES_MESSAGE =
  "Discard unsaved dispenser changes? Your draft edits will be lost.";
const DISCARD_NEW_BUILDING_DRAFT_MESSAGE =
  "Discard unsaved new building draft? Your building name and pinned coordinates will be lost.";
const DEFAULT_MUTATION_ERROR_MESSAGE =
  "Something went wrong while saving. Please try again.";
const IMAGE_INPUT_ACCEPT = DISPENSER_IMAGE_ALLOWED_MIME_TYPES.join(",");
const IMAGE_MAX_MB = Math.floor(DISPENSER_IMAGE_MAX_BYTES / (1024 * 1024));

function toSelectedFiles(input: FileList | null): File[] {
  return input ? Array.from(input) : [];
}

function validateImageFiles(files: File[]): string | null {
  for (const file of files) {
    if (
      !DISPENSER_IMAGE_ALLOWED_MIME_TYPES.includes(
        file.type as (typeof DISPENSER_IMAGE_ALLOWED_MIME_TYPES)[number]
      )
    ) {
      return "Unsupported image format. Use JPEG, PNG, or WEBP.";
    }

    if (file.size > DISPENSER_IMAGE_MAX_BYTES) {
      return `Image size must be ${IMAGE_MAX_MB} MB or less.`;
    }
  }

  return null;
}

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
  const newImageInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(
    buildings[0]?.id ?? null
  );
  const [newFields, setNewFields] = useState<DispenserMutationFields>(initialFields);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
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

    return (
      !areDispenserFieldsEqual(editDraft.fields, editDraft.original) ||
      editDraft.imageFiles.length > 0 ||
      editDraft.removeImages
    );
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
          const errorMessage =
            error instanceof Error
              ? error.message
              : typeof error === "object" &&
                  error !== null &&
                  "message" in error &&
                  typeof (error as { message?: unknown }).message === "string"
                ? (error as { message: string }).message
                : "Unknown error";

          console.error("[wmw-usm]", {
            area: "admin_dashboard",
            operation: "run_mutation",
            message: errorMessage,
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
    const buildingId = selectedBuildingId;

    const payload: CreateDispenserPayload = {
      buildingId,
      ...newFields,
      maintenanceStatus: normalizeMaintenanceStatus(newFields.maintenanceStatus),
    };

    const selectedImages = newImageFiles;
    if (selectedImages.length > 0) {
      const imageValidationMessage = validateImageFiles(selectedImages);
      if (imageValidationMessage) {
        setMessage("error", imageValidationMessage);
        return;
      }

      if (selectedImages.length > DISPENSER_IMAGE_MAX_COUNT) {
        setMessage(
          "error",
          `Maximum ${DISPENSER_IMAGE_MAX_COUNT} images are allowed per dispenser.`
        );
        return;
      }
    }

    runMutation(
      async () => {
        const createResult = await createDispenser(payload);
        if (!createResult.ok) {
          return createResult;
        }

        if (selectedImages.length === 0) {
          return createResult;
        }

        if (!createResult.dispenserId) {
          return {
            ok: false,
            message:
              "Dispenser was created, but image upload could not start. Please edit dispenser and upload image.",
          };
        }

        const imageFormData = new FormData();
        imageFormData.append("buildingId", buildingId);
        imageFormData.append("dispenserId", createResult.dispenserId);
        for (const imageFile of selectedImages) {
          imageFormData.append("images", imageFile);
        }

        const imageResult = await uploadDispenserImage(imageFormData);
        if (!imageResult.ok) {
          return imageResult;
        }

        return {
          ok: true,
          message: "Dispenser and images saved successfully.",
        };
      },
      () => {
        setNewFields(initialFields());
        setNewImageFiles([]);
        if (newImageInputRef.current) {
          newImageInputRef.current.value = "";
        }
      }
    );
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
      hasImages: dispenser.imagePaths.length > 0,
      imageFiles: [],
      removeImages: false,
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
    const buildingId = selectedBuildingId;
    const currentDispenser = selectedBuilding?.dispensers.find(
      (dispenser) => dispenser.id === dispenserId
    );
    if (!currentDispenser) {
      setMessage("error", "Pick a dispenser to update.");
      return;
    }

    const maintenanceStatus = normalizeMaintenanceStatus(
      editDraft.fields.maintenanceStatus
    );
    const imagesToUpload = editDraft.imageFiles;
    const shouldRemoveImages = editDraft.removeImages;

    if (imagesToUpload.length > 0) {
      const imageValidationMessage = validateImageFiles(imagesToUpload);
      if (imageValidationMessage) {
        setMessage("error", imageValidationMessage);
        return;
      }

      const existingImageCount = shouldRemoveImages
        ? 0
        : currentDispenser.imagePaths.length;
      if (existingImageCount + imagesToUpload.length > DISPENSER_IMAGE_MAX_COUNT) {
        setMessage(
          "error",
          `Maximum ${DISPENSER_IMAGE_MAX_COUNT} images are allowed per dispenser.`
        );
        return;
      }
    }

    runMutation(
      async () => {
        const updateResult = await updateDispenser({
          buildingId,
          dispenserId,
          ...editDraft.fields,
          maintenanceStatus,
        });

        if (!updateResult.ok) {
          return updateResult;
        }

        if (shouldRemoveImages) {
          const removeResult = await removeDispenserImage({
            buildingId,
            dispenserId,
          });

          if (!removeResult.ok) {
            return removeResult;
          }
        }

        if (imagesToUpload.length > 0) {
          const imageFormData = new FormData();
          imageFormData.append("buildingId", buildingId);
          imageFormData.append("dispenserId", dispenserId);
          for (const imageFile of imagesToUpload) {
            imageFormData.append("images", imageFile);
          }

          const uploadResult = await uploadDispenserImage(imageFormData);
          if (!uploadResult.ok) {
            return uploadResult;
          }
        }

        if (imagesToUpload.length > 0) {
          return { ok: true, message: "Dispenser updated and images added." };
        }

        if (shouldRemoveImages) {
          return { ok: true, message: "Dispenser updated and images removed." };
        }

        return updateResult;
      },
      () => {
        setEditDraft(null);
      }
    );
  };

  const handleCancelEdit = () => {
    setEditDraft(null);
  };

  const handleNewImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    setNewImageFiles(toSelectedFiles(event.target.files));
  };

  const handleEditImageChange = (
    event: ChangeEvent<HTMLInputElement>,
    dispenserId: string
  ) => {
    const files = toSelectedFiles(event.target.files);
    setEditDraft((current) =>
      current && current.dispenserId === dispenserId
        ? {
            ...current,
            imageFiles: files,
            removeImages: files.length > 0 ? false : current.removeImages,
          }
        : current
    );
  };

  const handleToggleEditImageRemoval = (dispenserId: string) => {
    setEditDraft((current) => {
      if (!current || current.dispenserId !== dispenserId) {
        return current;
      }

      if (current.imageFiles.length > 0) {
        return {
          ...current,
          imageFiles: [],
        };
      }

      if (!current.hasImages) {
        return current;
      }

      return {
        ...current,
        removeImages: !current.removeImages,
      };
    });
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
                  <div className="rounded-xl border border-dashed border-[#d4c6e8] bg-[#faf7ff] px-3 py-2.5">
                    <label
                      htmlFor="new-dispenser-image"
                      className="mb-1 block text-xs font-semibold tracking-wide text-[#4a2d76] uppercase"
                    >
                      Dispenser Image (Optional)
                    </label>
                    <input
                      id="new-dispenser-image"
                      ref={newImageInputRef}
                      type="file"
                      multiple
                      accept={IMAGE_INPUT_ACCEPT}
                      onChange={handleNewImageChange}
                      aria-label="Upload images for new dispenser"
                      className="w-full text-sm text-[#4a3a66] file:mr-3 file:rounded-lg file:border-0 file:bg-[#efe6fd] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#4a2d76] hover:file:bg-[#e2d4fb]"
                    />
                    <p className="mt-1 text-xs text-[#6c5f84]">
                      JPEG, PNG, or WEBP up to {IMAGE_MAX_MB} MB each. Maximum{" "}
                      {DISPENSER_IMAGE_MAX_COUNT} images.
                    </p>
                    {newImageFiles.length > 0 ? (
                      <p className="mt-1 text-xs font-medium text-[#2f5b45]">
                        Selected ({newImageFiles.length}):{" "}
                        {newImageFiles.map((file) => file.name).join(", ")}
                      </p>
                    ) : null}
                  </div>
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
                      const currentImageUrls = editDraft.removeImages
                        ? []
                        : dispenser.imageUrls;
                      const removeButtonLabel = editDraft.imageFiles.length > 0
                        ? "Clear Selected Images"
                        : editDraft.removeImages
                          ? "Undo Remove Images"
                          : "Remove All Images";
                      const canManageImage =
                        editDraft.hasImages ||
                        editDraft.imageFiles.length > 0 ||
                        editDraft.removeImages;

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
                            <div className="rounded-lg border border-dashed border-[#ccb7e8] bg-white px-3 py-2">
                              <DispenserImageSlider
                                imageUrls={currentImageUrls}
                                alt={`${dispenser.locationDescription} dispenser`}
                                emptyLabel="No image uploaded yet."
                                className="relative mb-2 h-24 w-full overflow-hidden rounded-md border border-[#d8cdea] bg-[#f6f0ff]"
                                imageClassName="h-full w-full object-cover"
                                emptyClassName="mb-2 flex h-24 w-full items-center justify-center rounded-md border border-dashed border-[#d8cdea] bg-[#f6f0ff] text-xs text-[#6c5f84]"
                              />
                              {editDraft.removeImages ? (
                                <p className="mb-2 text-xs font-medium text-[#912b35]">
                                  All images will be removed after save.
                                </p>
                              ) : null}
                              {editDraft.imageFiles.length > 0 ? (
                                <p className="mb-2 text-xs font-medium text-[#2f5b45]">
                                  New images ({editDraft.imageFiles.length}):{" "}
                                  {editDraft.imageFiles.map((file) => file.name).join(", ")}
                                </p>
                              ) : null}
                              <input
                                type="file"
                                multiple
                                accept={IMAGE_INPUT_ACCEPT}
                                onChange={(event) =>
                                  handleEditImageChange(event, dispenser.id)
                                }
                                aria-label={`Add images for ${dispenser.locationDescription}`}
                                className="w-full text-sm text-[#4a3a66] file:mr-3 file:rounded-lg file:border-0 file:bg-[#efe6fd] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#4a2d76] hover:file:bg-[#e2d4fb]"
                              />
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggleEditImageRemoval(dispenser.id)}
                                  disabled={!canManageImage || isPending}
                                  aria-label={`Toggle image removal for ${dispenser.locationDescription}`}
                                  className="rounded-lg border border-[#d4c6e8] bg-white px-3 py-1.5 text-xs font-semibold text-[#4a2d76] transition hover:border-[#b79adf] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {removeButtonLabel}
                                </button>
                              </div>
                            </div>

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
                        <DispenserImageSlider
                          imageUrls={dispenser.imageUrls}
                          alt={`${dispenser.locationDescription} dispenser`}
                          emptyLabel="No image uploaded"
                          className="relative mb-2 h-24 w-full overflow-hidden rounded-lg border border-[#d8cdea] bg-[#f6f0ff]"
                          imageClassName="h-full w-full object-cover"
                          emptyClassName="mb-2 flex h-24 w-full items-center justify-center rounded-lg border border-dashed border-[#d8cdea] bg-[#f6f0ff] text-xs font-medium text-[#6c5f84]"
                        />
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
