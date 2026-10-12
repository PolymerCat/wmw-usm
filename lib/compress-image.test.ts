import { afterEach, describe, expect, it, vi } from "vitest";
import { compressImageFile } from "@/lib/compress-image";

describe("compressImageFile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the original file when createImageBitmap is unavailable", async () => {
    vi.stubGlobal("createImageBitmap", undefined);
    const file = new File(["image"], "photo.jpg", { type: "image/jpeg" });

    await expect(compressImageFile(file)).resolves.toBe(file);
  });

  it("returns the original file when decoding fails", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockRejectedValue(new Error("decode failed")));
    const file = new File(["not-an-image"], "photo.png", { type: "image/png" });

    await expect(compressImageFile(file)).resolves.toBe(file);
  });
});
