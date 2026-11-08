import { describe, expect, it } from "vitest";
import { hotelErrorKey } from "./hotel-errors";

describe("hotelErrorKey", () => {
  it("finds known codes inside a message", () => expect(hotelErrorKey("ERROR: room_taken")).toBe("room_taken"));
  it("hides unknown database errors", () => expect(hotelErrorKey("duplicate key value")).toBe("generic"));
  it("handles a missing message", () => expect(hotelErrorKey(undefined)).toBe("generic"));
});
