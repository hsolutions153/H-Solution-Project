const STORED_IMAGE_PATTERN = /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=\s]+$/i;
const MAX_IMAGES = 4;
const MAX_IMAGE_LENGTH = 3_000_000;

export function sanitizeRepairImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (image): image is string =>
        typeof image === "string" &&
        image.length <= MAX_IMAGE_LENGTH &&
        STORED_IMAGE_PATTERN.test(image),
    )
    .slice(0, MAX_IMAGES);
}
