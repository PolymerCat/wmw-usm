import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Sidebar from "@/components/ui/Sidebar";
import type { Building } from "@/lib/types";

const BUILDING: Building = {
  id: "bld-1",
  name: "School of Computer Sciences",
  latitude: 5.3545,
  longitude: 100.3013,
  dispensers: [],
};

afterEach(() => {
  cleanup();
});

describe("Sidebar", () => {
  it("renders mobile close button and calls onClose when clicked", () => {
    const onClose = vi.fn();
    render(<Sidebar building={BUILDING} onClose={onClose} userLocation={null} />);

    const closeButton = screen.getByRole("button", {
      name: "Close building details sheet",
    });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders dispenser image when imageUrls exist", () => {
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
              imagePaths: ["bld-1/dsp-1/pantry.jpg"],
              imageUrls: ["https://cdn.test/pantry.jpg"],
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
              imagePaths: [],
              imageUrls: [],
            },
          ],
        }}
        onClose={vi.fn()}
        userLocation={null}
      />
    );

    expect(screen.getAllByText("No Image").length).toBeGreaterThan(0);
  });

  it("slides through multiple dispenser images", () => {
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
              imagePaths: ["bld-1/dsp-1/1.jpg", "bld-1/dsp-1/2.jpg"],
              imageUrls: ["https://cdn.test/1.jpg", "https://cdn.test/2.jpg"],
            },
          ],
        }}
        onClose={vi.fn()}
        userLocation={null}
      />
    );

    const image = screen.getAllByAltText("Pantry dispenser")[0];
    expect(image).toHaveAttribute("src", "https://cdn.test/1.jpg");

    fireEvent.click(screen.getAllByLabelText("Next dispenser image")[0]);
    expect(screen.getAllByAltText("Pantry dispenser")[0]).toHaveAttribute(
      "src",
      "https://cdn.test/2.jpg"
    );
  });
});
