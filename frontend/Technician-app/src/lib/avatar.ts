import { fetchApi } from "@/lib/api-client";

/** Fired on window after a new avatar is saved, so the header can refresh. */
export const AVATAR_UPDATED_EVENT = "technician-avatar-updated";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SOURCE_BYTES = 8_000_000;
const OUTPUT_SIZE = 360;

/** Center-crops the photo to a square JPEG so uploads stay small. */
async function resizeAvatar(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const source = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new window.Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Không thể mở hình ảnh này."));
      image.src = url;
    });
    const side = Math.min(source.width, source.height);
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Trình duyệt không thể xử lý hình ảnh này.");
    context.drawImage(
      source,
      (source.width - side) / 2,
      (source.height - side) / 2,
      side,
      side,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE,
    );
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Không thể xử lý hình ảnh này."))),
        "image/jpeg",
        0.86,
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Validates, resizes and uploads a profile photo. Returns the updated technician profile. */
export async function uploadTechnicianAvatar<T extends { user?: { avatar_url?: string | null } | null }>(
  file: File,
): Promise<T> {
  if (!ACCEPTED_TYPES.includes(file.type) || file.size > MAX_SOURCE_BYTES) {
    throw new Error("Chọn ảnh PNG, JPG hoặc WebP dưới 8 MB.");
  }
  const body = new FormData();
  body.append("file", await resizeAvatar(file), "avatar.jpg");
  const updated = await fetchApi<T>("/technicians/me/avatar", { method: "POST", body });
  window.dispatchEvent(
    new CustomEvent(AVATAR_UPDATED_EVENT, { detail: updated.user?.avatar_url ?? "" }),
  );
  return updated;
}
