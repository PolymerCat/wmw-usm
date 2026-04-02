import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminDashboard from "@/components/admin/AdminDashboard";
import * as adminActions from "@/app/admin/actions";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

vi.mock("next/dynamic", () => ({
  default: () => {
    const MockedDynamic = (props: {
      pinEnabled: boolean;
      disableBuildingSelection?: boolean;
      onPinSelect: (pin: { latitude: number; longitude: number }) => void;
      onSelectBuilding: (buildingId: string) => void;
    }) => (
      <div data-testid="admin-map">
        <button
          type="button"
          aria-label="Mock pin map"
          disabled={!props.pinEnabled}
          onClick={() => props.onPinSelect({ latitude: 5.3577, longitude: 100.3012 })}
        >
          Mock pin
        </button>
        <button
          type="button"
          aria-label="Mock map select Building Two"
          disabled={props.disableBuildingSelection}
          onClick={() => props.onSelectBuilding("bld-2")}
        >
          Mock select building two
        </button>
      </div>
    );
    return MockedDynamic;
  },
}));

vi.mock("@/app/admin/actions", () => ({
  createBuilding: vi.fn().mockResolvedValue({
    ok: true,
    message: "building created",
    buildingId: "bld-new",
  }),
  createDispenser: vi.fn().mockResolvedValue({
    ok: true,
    message: "created",
  }),
  deleteDispenser: vi.fn().mockResolvedValue({
    ok: true,
    message: "deleted",
  }),
  signOutAdmin: vi.fn(),
  updateBuildingPin: vi.fn().mockResolvedValue({
    ok: true,
    message: "pin updated",
  }),
  updateDispenser: vi.fn().mockResolvedValue({
    ok: true,
    message: "updated",
  }),
}));

const BUILDINGS = [
  {
    id: "bld-1",
    name: "Building One",
    latitude: 5.3551,
    longitude: 100.3001,
    dispensers: [
      {
        id: "dsp-1",
        buildingId: "bld-1",
        locationDescription: "1st Floor Pantry",
        brand: "Coway",
        coldWaterStatus: "Available" as const,
        maintenanceStatus: "Operational" as const,
      },
      {
        id: "dsp-2",
        buildingId: "bld-1",
        locationDescription: "3rd Floor Pantry",
        brand: "Cuckoo",
        coldWaterStatus: "Unavailable" as const,
        maintenanceStatus: "Under Maintenance" as const,
      },
    ],
  },
  {
    id: "bld-2",
    name: "Building Two",
    latitude: 5.3561,
    longitude: 100.3011,
    dispensers: [
      {
        id: "dsp-3",
        buildingId: "bld-2",
        locationDescription: "Lobby",
        brand: "Coway",
        coldWaterStatus: "Available" as const,
        maintenanceStatus: "Operational" as const,
      },
    ],
  },
];

describe("AdminDashboard inline editing and pin workflows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
  });

  it("opens inline editable fields when clicking Edit", () => {
    render(<AdminDashboard buildings={BUILDINGS} adminEmail="admin@example.com" />);

    fireEvent.click(screen.getAllByLabelText("Edit dispenser 1st Floor Pantry")[0]);

    expect(
      screen.getAllByLabelText("Edit location for 1st Floor Pantry")[0]
    ).toBeInTheDocument();
    expect(
      screen.getAllByLabelText("Save updates for 1st Floor Pantry")[0]
    ).toBeInTheDocument();
  });

  it("saves inline changes and calls updateDispenser with card payload", async () => {
    const updateDispenserMock = vi.mocked(adminActions.updateDispenser);

    render(<AdminDashboard buildings={BUILDINGS} adminEmail="admin@example.com" />);

    fireEvent.click(screen.getAllByLabelText("Edit dispenser 1st Floor Pantry")[0]);
    fireEvent.change(screen.getAllByLabelText("Edit brand for 1st Floor Pantry")[0], {
      target: { value: "Cuckoo" },
    });
    fireEvent.click(screen.getAllByLabelText("Save updates for 1st Floor Pantry")[0]);

    await waitFor(() => {
      expect(updateDispenserMock).toHaveBeenCalledWith({
        buildingId: "bld-1",
        dispenserId: "dsp-1",
        locationDescription: "1st Floor Pantry",
        brand: "Cuckoo",
        coldWaterStatus: "Available",
        maintenanceStatus: "Operational",
      });
    });

    await waitFor(() => {
      expect(
        screen.queryAllByLabelText("Edit location for 1st Floor Pantry")
      ).toHaveLength(0);
    });
  });

  it("cancels inline edits without calling updateDispenser", () => {
    const updateDispenserMock = vi.mocked(adminActions.updateDispenser);

    render(<AdminDashboard buildings={BUILDINGS} adminEmail="admin@example.com" />);

    fireEvent.click(screen.getAllByLabelText("Edit dispenser 1st Floor Pantry")[0]);
    fireEvent.change(
      screen.getAllByLabelText("Edit location for 1st Floor Pantry")[0],
      {
        target: { value: "Changed location" },
      }
    );
    fireEvent.click(screen.getAllByLabelText("Cancel edits for 1st Floor Pantry")[0]);

    expect(updateDispenserMock).not.toHaveBeenCalled();
    expect(screen.queryAllByLabelText("Edit location for 1st Floor Pantry")).toHaveLength(
      0
    );
    expect(screen.getByText("1st Floor Pantry")).toBeInTheDocument();
  });

  it("warns before discarding dirty draft when switching building", () => {
    const confirmMock = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<AdminDashboard buildings={BUILDINGS} adminEmail="admin@example.com" />);

    fireEvent.click(screen.getAllByLabelText("Edit dispenser 1st Floor Pantry")[0]);
    fireEvent.change(screen.getAllByLabelText("Edit brand for 1st Floor Pantry")[0], {
      target: { value: "Changed" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: /Building Two/i })[0]);

    expect(confirmMock).toHaveBeenCalledWith(
      "Discard unsaved dispenser changes? Your draft edits will be lost."
    );
    expect(screen.getByText("Dispensers in Building One")).toBeInTheDocument();
  });

  it("deleting the active edited card exits edit mode cleanly", async () => {
    const deleteDispenserMock = vi.mocked(adminActions.deleteDispenser);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<AdminDashboard buildings={BUILDINGS} adminEmail="admin@example.com" />);

    fireEvent.click(screen.getAllByLabelText("Edit dispenser 1st Floor Pantry")[0]);
    fireEvent.click(screen.getAllByLabelText("Delete dispenser 1st Floor Pantry")[0]);

    await waitFor(() => {
      expect(deleteDispenserMock).toHaveBeenCalledWith({
        buildingId: "bld-1",
        dispenserId: "dsp-1",
      });
    });

    await waitFor(() => {
      expect(
        screen.queryAllByLabelText("Edit location for 1st Floor Pantry")
      ).toHaveLength(0);
    });
  });

  it("toggles between edit-existing and add-new pin workflows", () => {
    render(<AdminDashboard buildings={BUILDINGS} adminEmail="admin@example.com" />);

    fireEvent.click(screen.getByRole("button", { name: "Add New" }));
    expect(screen.getByLabelText("Building Name")).toBeInTheDocument();
    expect(
      screen.getByText("Add a new building by name and pin")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit Existing" }));
    expect(screen.queryByLabelText("Building Name")).not.toBeInTheDocument();
  });

  it("requires both name and pin before enabling create building", () => {
    render(<AdminDashboard buildings={BUILDINGS} adminEmail="admin@example.com" />);
    fireEvent.click(screen.getByRole("button", { name: "Add New" }));

    const createButton = screen.getByRole("button", { name: "Create Building" });
    expect(createButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Building Name"), {
      target: { value: "School of Computer Science" },
    });
    expect(createButton).toBeDisabled();

    fireEvent.click(screen.getByLabelText("Mock pin map"));
    expect(createButton).toBeEnabled();
  });

  it("creates a building from add-new draft and exits add mode", async () => {
    const createBuildingMock = vi.mocked(adminActions.createBuilding);

    render(<AdminDashboard buildings={BUILDINGS} adminEmail="admin@example.com" />);
    fireEvent.click(screen.getByRole("button", { name: "Add New" }));
    fireEvent.change(screen.getByLabelText("Building Name"), {
      target: { value: "School of Computer Science" },
    });
    fireEvent.click(screen.getByLabelText("Mock pin map"));
    fireEvent.click(screen.getByRole("button", { name: "Create Building" }));

    await waitFor(() => {
      expect(createBuildingMock).toHaveBeenCalledWith({
        name: "School of Computer Science",
        latitude: 5.3577,
        longitude: 100.3012,
      });
    });

    await waitFor(() => {
      expect(screen.queryByLabelText("Building Name")).not.toBeInTheDocument();
    });
  });

  it("warns before discarding add-new draft when switching pin mode", () => {
    const confirmMock = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<AdminDashboard buildings={BUILDINGS} adminEmail="admin@example.com" />);
    fireEvent.click(screen.getByRole("button", { name: "Add New" }));
    fireEvent.change(screen.getByLabelText("Building Name"), {
      target: { value: "New Building" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Edit Existing" }));

    expect(confirmMock).toHaveBeenCalledWith(
      "Discard unsaved new building draft? Your building name and pinned coordinates will be lost."
    );
    expect(screen.getByLabelText("Building Name")).toBeInTheDocument();
  });

  it("warns before discarding add-new draft when switching building", () => {
    const confirmMock = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<AdminDashboard buildings={BUILDINGS} adminEmail="admin@example.com" />);
    fireEvent.click(screen.getByRole("button", { name: "Add New" }));
    fireEvent.change(screen.getByLabelText("Building Name"), {
      target: { value: "New Building" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: /Building Two/i })[0]);

    expect(confirmMock).toHaveBeenCalledWith(
      "Discard unsaved new building draft? Your building name and pinned coordinates will be lost."
    );
    expect(screen.getByLabelText("Building Name")).toBeInTheDocument();
  });

  it("keeps existing edit-building pin save flow working", async () => {
    const updateBuildingPinMock = vi.mocked(adminActions.updateBuildingPin);

    render(<AdminDashboard buildings={BUILDINGS} adminEmail="admin@example.com" />);
    fireEvent.click(screen.getByLabelText("Mock pin map"));
    fireEvent.click(screen.getByRole("button", { name: "Save Pin" }));

    await waitFor(() => {
      expect(updateBuildingPinMock).toHaveBeenCalledWith({
        buildingId: "bld-1",
        latitude: 5.3577,
        longitude: 100.3012,
      });
    });
  });

  it("shows fallback error message when a mutation throws unexpectedly", async () => {
    const createDispenserMock = vi.mocked(adminActions.createDispenser);
    createDispenserMock.mockRejectedValueOnce(new Error("network down"));

    render(<AdminDashboard buildings={BUILDINGS} adminEmail="admin@example.com" />);
    fireEvent.click(screen.getByRole("button", { name: "Add Dispenser" }));

    await waitFor(() => {
      expect(
        screen.getByText("Something went wrong while saving. Please try again.")
      ).toBeInTheDocument();
    });
  });
});
