import { describe, expect, it } from "vitest";

import { boundedGardenCount, planGardenRender } from "@/lib/display-performance/render-budget";

describe("display render budget", () => {
  it("caps all-active content without turning the requested amount into DOM nodes", () => {
    const plan = planGardenRender({ availableCount: 250, gardenAmount: "all-active" });

    expect(plan.availableCount).toBe(250);
    expect(plan.requestedCount).toBe("all-active");
    expect(plan.renderedCount).toBe(12);
    expect(plan.bounded).toBe(true);
  });

  it("uses the smaller of available, requested and budgeted content", () => {
    expect(boundedGardenCount(3, 20)).toBe(3);
    expect(boundedGardenCount(20, 7)).toBe(7);
    expect(boundedGardenCount(20, "all-active", { maxGardenNodes: 5 })).toBe(5);
    expect(boundedGardenCount(20, 0)).toBe(0);
  });

  it("limits decorative relationships from the actual rendered set", () => {
    const plan = planGardenRender({
      availableCount: 10,
      gardenAmount: "all-active",
      budget: { maxGardenNodes: 6, maxConnections: 100, maxDecorationNodes: 9 },
    });

    expect(plan.renderedCount).toBe(6);
    expect(plan.maxConnections).toBe(15);
    expect(plan.maxDecorationNodes).toBe(9);
  });
});
