import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RouteError from "@/app/error";

describe("RouteError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a safe fallback and retries through reset()", () => {
    const reset = vi.fn();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<RouteError error={new Error("sensitive internals")} reset={reset} />);

    expect(screen.getByText("We hit a temporary issue")).toBeInTheDocument();
    expect(
      screen.getByText("We could not load the water refill map right now. Please try again.")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalled();
  });
});
