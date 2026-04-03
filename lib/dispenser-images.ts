export const DISPENSER_IMAGE_BUCKET = "dispenser-images";
export const DISPENSER_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const DISPENSER_IMAGE_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const MIME_EXTENSION_MAP: Record<
  (typeof DISPENSER_IMAGE_ALLOWED_MIME_TYPES)[number],
  string
> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function isAllowedDispenserImageMimeType(
  mimeType: string
): mimeType is (typeof DISPENSER_IMAGE_ALLOWED_MIME_TYPES)[number] {
  return DISPENSER_IMAGE_ALLOWED_MIME_TYPES.includes(
    mimeType as (typeof DISPENSER_IMAGE_ALLOWED_MIME_TYPES)[number]
  );
}

export function getDispenserImageExtension(
  mimeType: string
): string | null {
  if (!isAllowedDispenserImageMimeType(mimeType)) {
    return null;
  }

  return MIME_EXTENSION_MAP[mimeType];
}

export function buildDispenserImagePath(
  buildingId: string,
  dispenserId: string,
  extension: string,
  idGenerator: () => string = () => crypto.randomUUID()
) {
  const fileName = `${idGenerator()}.${extension}`;
  return `${buildingId}/${dispenserId}/${fileName}`;
}
