import { describe, expect, it } from "vitest";
import { fitWithin, idPhotoPath, isIdPhotoPathFor, randomSuffix, smallestFittingJpeg } from "./id-photo";

const TENANT = "11111111-2222-4333-8444-555555555555";
const STAY = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

describe("fitWithin", () => {
  it("scales the longest side down and keeps the shape", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000, 800)).toEqual({ width: 600, height: 800 });
  });
  it("never scales a small photo up", () => {
    expect(fitWithin(640, 480, 1600)).toEqual({ width: 640, height: 480 });
  });
});

describe("photo paths", () => {
  it("builds the path the bucket policy expects", () => {
    expect(idPhotoPath(TENANT, STAY, "abc123")).toBe(`${TENANT}/${STAY}-abc123.jpg`);
  });
  it("accepts only this stay's photos", () => {
    expect(isIdPhotoPathFor(idPhotoPath(TENANT, STAY, "x9"), STAY)).toBe(true);
    expect(isIdPhotoPathFor(idPhotoPath(TENANT, TENANT, "x9"), STAY)).toBe(false);
    expect(isIdPhotoPathFor(`${TENANT}/${STAY}-x9.png`, STAY)).toBe(false);
    expect(isIdPhotoPathFor(`../${TENANT}/${STAY}-x9.jpg`, STAY)).toBe(false);
    expect(isIdPhotoPathFor(`${TENANT}/${STAY}-ABC.jpg`, STAY)).toBe(false);
  });
  it("makes 12-character lowercase suffixes", () => {
    const s = randomSuffix((b) => b.map((_, i) => i * 7));
    expect(s).toMatch(/^[a-z0-9]{12}$/);
    expect(isIdPhotoPathFor(idPhotoPath(TENANT, STAY, s), STAY)).toBe(true);
  });
});

describe("smallestFittingJpeg", () => {
  const blob = (size: number) => new Blob([new Uint8Array(size)], { type: "image/jpeg" });

  it("returns the first size and quality that fits", async () => {
    const tried: string[] = [];
    const out = await smallestFittingJpeg(async (side, q) => {
      tried.push(`${side}@${q}`);
      return blob(side === 1280 && q === 0.65 ? 200_000 : 400_000);
    });
    expect(out?.size).toBe(200_000);
    expect(tried).toEqual(["1600@0.8", "1600@0.65", "1600@0.5", "1280@0.8", "1280@0.65"]);
  });

  it("gives up when even the smallest is too big", async () => {
    expect(await smallestFittingJpeg(async () => blob(400_000))).toBeNull();
  });
});
