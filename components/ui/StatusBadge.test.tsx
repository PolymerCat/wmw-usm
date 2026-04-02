import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MaintenanceBadge } from "@/components/ui/StatusBadge";

describe("MaintenanceBadge", () => {
  it("renders Unknown status with neutral copy", () => {
    render(<MaintenanceBadge status="Unknown" />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });
});
