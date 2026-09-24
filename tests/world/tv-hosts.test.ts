import { describe, expect, it } from "vitest";
import { KIT_BUDGETS, budgetProblem } from "@/components/display/world/kit/kit-manifest";
import { HOSTS_READY, hostClipFor } from "@/components/display/world/prototype/tv-hosts";

describe("Peace and Joy on the TV page", () => {
  it("builds against the placeholder until the lamb files are in 3D Studio main", () => {
    expect(HOSTS_READY).toBe(false);
  });
  it("follows the lamb contract's clips through the tour and an arrival", () => {
    expect(hostClipFor("idle", false)).toBe("fly_idle");
    expect(hostClipFor("idle", true)).toBe("fly_forward");
    expect(hostClipFor("approach", false)).toBe("carry_bubble");
    expect(hostClipFor("reveal", false)).toBe("carry_bubble");
    expect(hostClipFor("reading", false)).toBe("present_bubble");
    expect(hostClipFor("settle", false)).toBe("carry_bubble");
    expect(hostClipFor("return", true)).toBe("fly_forward");
  });
  it("has a host budget class of 20,000 vertices and 400 KB", () => {
    expect(KIT_BUDGETS.host).toEqual({ verts: 20_000, bytes: 400_000 });
    // The lambs as Section 3 measured them fit it.
    expect(budgetProblem({ id: "neighbor.peace", budget: "host", verts: 10_248, bytes: 264_916 })).toBeNull();
    expect(budgetProblem({ id: "neighbor.joy", budget: "host", verts: 10_118, bytes: 264_144 })).toBeNull();
    expect(budgetProblem({ id: "neighbor.big", budget: "host", verts: 20_001, bytes: 1 })).toMatch(/over the host budget/);
  });
});
