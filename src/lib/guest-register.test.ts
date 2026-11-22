import { describe, expect, it } from "vitest";
import { recentDistinct } from "./guest-register";

describe("recentDistinct", () => {
  it("keeps the most recent spelling once, skips blanks, per field", () => {
    const rows = [
      { coming_from: "Hawassa", going_to: "Addis Ababa", purpose: "Business" },
      { coming_from: " hawassa ", going_to: null, purpose: "" },
      { coming_from: "Arsi Negele", going_to: "Addis Ababa", purpose: "Family visit" },
    ];
    expect(recentDistinct(rows)).toEqual({
      comingFrom: ["Hawassa", "Arsi Negele"],
      goingTo: ["Addis Ababa"],
      purpose: ["Business", "Family visit"],
    });
  });

  it("stops at the limit", () => {
    const rows = ["A", "B", "C", "D"].map((v) => ({ coming_from: v, going_to: null, purpose: null }));
    expect(recentDistinct(rows, 2).comingFrom).toEqual(["A", "B"]);
  });
});
