import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MapShell from "@/components/ui/MapShell";
import type { Building } from "@/lib/types";

vi.mock("next/dynamic", () => ({
  default: () => {
    const MockedDynamicMap = (props: {
      buildings: Building[];
      nearestBuildingId: string | null;
      onBuildingSelect: (building: Building) => void;
      onUserLocationChange: (location: { lat: number; lng: number } | null) => void;
    }) => (
      <div data-testid="mock-map" data-nearest-building-id={props.nearestBuildingId ?? ""}>
        <button
          type="button"
          onClick={() => props.onUserLocationChange({ lat: 5.35619, lng: 100.29925 })}
        >
          Set user location
        </button>
        <button type="button" onClick={() => props.onBuildingSelect(props.buildings[1])}>
          Select building two
        </button>
      </div>
    );

    return MockedDynamicMap;
  },
}));

const BUILDINGS: Building[] = [
  {
    id: "bld-empty",
    name: "Empty Building",
    latitude: 5.356191,
    longitude: 100.299251,
    dispensers: [],
  },
  {
    id: "bld-1",
    name: "Computer School",
    latitude: 5.3562,
    longitude: 100.2993,
    dispensers: [
      {
        id: "dsp-1",
        buildingId: "bld-1",
        locationDescription: "Pantry",
        brand: "Coway",
        coldWaterStatus: "Available",
        maintenanceStatus: "Operational",
      },
    ],
  },
  {
    id: "bld-2",
    name: "Library",
    latitude: 5.3578,
    longitude: 100.3018,
    dispensers: [
      {
        id: "dsp-2",
        buildingId: "bld-2",
        locationDescription: "Ground Floor",
        brand: "Cuckoo",
        coldWaterStatus: "Available",
        maintenanceStatus: "Operational",
      },
    ],
  },
];

describe("MapShell nearest chip and nearest marker wiring", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a small info button", () => {
    render(<MapShell buildings={BUILDINGS} />);

    expect(screen.getByRole("button", { name: "Open site information" })).toBeInTheDocument();
  });

  it("opens info popover and renders feedback link details", () => {
    render(<MapShell buildings={BUILDINGS} />);

    fireEvent.click(screen.getByRole("button", { name: "Open site information" }));

    expect(screen.getByRole("dialog", { name: "About this site" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Send feedback" })).toHaveAttribute(
      "href",
      "https://forms.gle/A1aCaxL8UdDp7yod8"
    );
    expect(screen.getByRole("link", { name: "Send feedback" })).toHaveAttribute(
      "target",
      "_blank"
    );
    expect(screen.getByRole("link", { name: "Send feedback" })).toHaveAttribute(
      "rel",
      "noopener noreferrer"
    );
  });

  it("closes the info popover with Escape key", () => {
    render(<MapShell buildings={BUILDINGS} />);

    fireEvent.click(screen.getByRole("button", { name: "Open site information" }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "About this site" })).not.toBeInTheDocument();
  });

  it("closes the info popover when clicking outside", () => {
    render(<MapShell buildings={BUILDINGS} />);

    fireEvent.click(screen.getByRole("button", { name: "Open site information" }));
    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole("dialog", { name: "About this site" })).not.toBeInTheDocument();
  });

  it("keeps nearest chip hidden before user location is available", () => {
    render(<MapShell buildings={BUILDINGS} />);

    expect(screen.queryByText(/Nearest dispenser:/i)).not.toBeInTheDocument();
  });

  it("shows nearest chip and passes nearest building id after location update", () => {
    render(<MapShell buildings={BUILDINGS} />);

    fireEvent.click(screen.getByRole("button", { name: "Set user location" }));

    expect(screen.getByText(/Nearest dispenser:\s*Computer School/i)).toBeInTheDocument();
    expect(screen.getByTestId("mock-map")).toHaveAttribute("data-nearest-building-id", "bld-1");
  });

  it("does not auto-open sidebar when nearest result is calculated", () => {
    render(<MapShell buildings={BUILDINGS} />);

    fireEvent.click(screen.getByRole("button", { name: "Set user location" }));

    expect(screen.queryByText(/Selected Building/i)).not.toBeInTheDocument();
  });
});
