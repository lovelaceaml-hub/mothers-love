import { describe, expect, it } from "vitest";

import { SmoothModeIndicator } from "@/components/display/performance/SmoothModeIndicator";

describe("Smooth mode indicator", () => {
  it("stays optional at full quality", () => {
    expect(SmoothModeIndicator({ quality: "full" })).toBeNull();
  });

  it("returns a small accessible status when adaptive quality reduces decoration", () => {
    const indicator = SmoothModeIndicator({ quality: "smooth" });
    expect(indicator).not.toBeNull();
    expect(indicator?.props["data-testid"]).toBe("smooth-mode-indicator");
    expect(indicator?.props["data-quality"]).toBe("smooth");
    expect(indicator?.props.role).toBe("status");
    expect(indicator?.props.children).toBe("Smooth mode");
  });
});
