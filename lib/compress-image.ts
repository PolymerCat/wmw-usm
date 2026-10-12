const MAX_IMAGE_EDGE_PX = 1600;
const ENCODE_QUALITY = 0.82;

const OUTPUT_FORMATS = [
  { mimeType: "image/webp", extension: "webp" },
  // Some browsers (older Safari) cannot encode WebP and silently return PNG instead.
  { mimeType: "image/jpeg", extension: "jpg" },
] as const;

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, mimeType, ENCODE_QUALITY);
  });
}

function replaceExtension(fileName: string, extension: string) {
  const baseName = fileName.replace(/\.[^./\\]+$/, "") || "image";
  return `${baseName}.${extension}`;
}

/**
 * Downscales a photo to at most 1600px on its longest edge and re-encodes it as WebP
 * (JPEG where WebP encoding is unsupported). Returns the original file whenever
 * compression is unavailable, fails, or would not make the file smaller.
 */
export async function compressImageFile(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    return file;
  }

  let bitmap: ImageBitmap | null = null;

  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

    const scale = Math.min(1, MAX_IMAGE_EDGE_PX / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      return file;
    }

    context.drawImage(bitmap, 0, 0, width, height);

    for (const format of OUTPUT_FORMATS) {
      const blob = await canvasToBlob(canvas, format.mimeType);
      if (!blob || blob.type !== format.mimeType) {
        continue;
      }

      if (blob.size >= file.size) {
        return file;
      }

      return new File([blob], replaceExtension(file.name, format.extension), {
        type: format.mimeType,
        lastModified: file.lastModified,
      });
    }

    return file;
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
