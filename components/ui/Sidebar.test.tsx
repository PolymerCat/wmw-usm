import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Sidebar from "@/components/ui/Sidebar";
import type { Building } from "@/lib/types";

const BUILDING: Building = {
  id: "bld-1",
  name: "School of Computer Sciences",
  latitude: 5.3545,
  longitude: 100.3013,
  dispensers: [],
};

describe("Sidebar", () => {
  it("renders mobile close button and calls onClose when clicked", () => {
    const onClose = vi.fn();
    render(<Sidebar building={BUILDING} onClose={onClose} />);

    const closeButton = screen.getByRole("button", {
      name: "Close building details sheet",
    });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders dispenser image when imageUrl exists", () => {
    render(
      <Sidebar
        building={{
          ...BUILDING,
          dispensers: [
            {
              id: "dsp-1",
              buildingId: "bld-1",
              locationDescription: "Pantry",
              brand: "Coway",
              coldWaterStatus: "Available",
              maintenanceStatus: "Operational",
              imageUrl: "https://cdn.test/pantry.jpg",
            },
          ],
        }}
        onClose={vi.fn()}
        userLocation={null}
      />
    );

    expect(screen.getAllByAltText("Pantry dispenser").length).toBeGreaterThan(0);
  });

  it("renders image placeholder when dispenser image is missing", () => {
    render(
      <Sidebar
        building={{
          ...BUILDING,
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
        }}
        onClose={vi.fn()}
        userLocation={null}
      />
    );

    expect(screen.getAllByText("No Image").length).toBeGreaterThan(0);
  });
});
