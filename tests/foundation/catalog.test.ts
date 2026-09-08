import { describe, expect, it } from "vitest";
import { CAMPAIGN_TAGLINE, CAMPAIGN_TITLE, EXPRESSIONS } from "@/lib/catalog";

describe("campaign catalog", () => {
  it("exports the approved identity", () => {
    expect(CAMPAIGN_TITLE).toBe("THE WORDS OF MOTHER'S LOVE");
    expect(CAMPAIGN_TAGLINE).toBe("Where a mother's love resides, peace abides.");
  });

  it("keeps nine expressions in canonical order with complete words", () => {
    expect(EXPRESSIONS).toHaveLength(9);
    expect(EXPRESSIONS.map(({ id }) => id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(EXPRESSIONS.every(({ phrase, principle, color }) => phrase && principle && color)).toBe(true);
    expect(EXPRESSIONS[6]?.phrase).toBe("I'll pray (or root) for you. Everything will go well.");
  });
});
