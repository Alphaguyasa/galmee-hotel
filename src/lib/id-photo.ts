/**
 * Guest ID photos: taken at check-in, shrunk on the phone to a small JPEG, stored in the
 * hotel's private folder. The storage bucket refuses anything over 300 KB or not JPEG.
 */

export const ID_PHOTO_BUCKET = "ht-guest-ids";
export const ID_PHOTO_MAX_BYTES = 300 * 1024;

/** Longest side tried first, then smaller, until the JPEG fits. */
const SIDES = [1600, 1280, 1024, 800, 640] as const;
const QUALITIES = [0.8, 0.65, 0.5] as const;

const SUFFIX_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

/** Scales width x height down so the longest side is at most `max` (never scales up). */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max) return { width: Math.round(width), height: Math.round(height) };
  const scale = max / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** A random 12-character suffix, so a retake is a new file and paths cannot be guessed. */
export function randomSuffix(random: (bytes: Uint8Array) => Uint8Array = (b) => crypto.getRandomValues(b)): string {
  const bytes = random(new Uint8Array(12));
  return Array.from(bytes, (b) => SUFFIX_CHARS[b % SUFFIX_CHARS.length]).join("");
}

/** `<tenant>/<stay>-<suffix>.jpg`: the only shape the bucket policy and `ht_set_guest_id` accept. */
export function idPhotoPath(tenant: string, stay: string, suffix: string): string {
  return `${tenant}/${stay}-${suffix}.jpg`;
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PATH = new RegExp(`^(${UUID})/(${UUID})-[a-z0-9]{1,16}\\.jpg$`);

/** True when `path` is a photo path for this stay (the tenant is checked again by the database). */
export function isIdPhotoPathFor(path: string, stay: string): boolean {
  const m = PATH.exec(path);
  return m !== null && m[2] === stay;
}

/**
 * Tries sizes and qualities from best to smallest and returns the first JPEG that fits.
 * `encode` draws the image with the given longest side and quality and returns the blob.
 */
export async function smallestFittingJpeg(
  encode: (maxSide: number, quality: number) => Promise<Blob | null>,
  maxBytes = ID_PHOTO_MAX_BYTES,
): Promise<Blob | null> {
  for (const side of SIDES) {
    for (const quality of QUALITIES) {
      const blob = await encode(side, quality);
      if (blob && blob.size <= maxBytes) return blob;
    }
  }
  return null;
}

/** Browser only: turns a camera photo into a JPEG of at most 300 KB, upright. */
export async function compressIdPhoto(file: Blob): Promise<Blob | null> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    return await smallestFittingJpeg(async (maxSide, quality) => {
      const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide);
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(bitmap, 0, 0, width, height);
      return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    });
  } finally {
    bitmap.close();
  }
}
