import { describe, expect, it } from "vitest";

import {
  createAdaptiveQualityState,
  effectsForQuality,
  observeFrame,
  setAdaptiveQuality,
} from "@/lib/display-performance/adaptive-quality";

describe("adaptive display quality", () => {
  it("removes decoration in order while keeping content and core transitions enabled", () => {
    const options = { frameBudgetMs: 16, degradeAfterFrames: 2, recoverAfterFrames: 2 };
    let state = createAdaptiveQualityState(options);

    state = observeFrame(state, 40, 1);
    expect(state.level).toBe("full");
    state = observeFrame(state, 40, 2);
    expect(state.level).toBe("smooth");
    expect(state.effects).toEqual(effectsForQuality("smooth"));
    expect(state.effects.background).toBe(false);
    expect(state.effects.sparkles).toBe(false);
    expect(state.contentEnabled).toBe(true);
    expect(state.coreTransitionsEnabled).toBe(true);

    state = observeFrame(state, 40, 3);
    state = observeFrame(state, 40, 4);
    expect(state.level).toBe("minimal");
    expect(state.effects).toEqual(effectsForQuality("minimal"));
    expect(state.contentEnabled).toBe(true);
  });

  it("recovers one quality level at a time after a good streak", () => {
    let state = setAdaptiveQuality(createAdaptiveQualityState({ recoverAfterFrames: 3 }), "minimal");
    state = observeFrame(state, 8, 1);
    state = observeFrame(state, 8, 2);
    expect(state.level).toBe("minimal");
    state = observeFrame(state, 8, 3);
    expect(state.level).toBe("smooth");
    state = observeFrame(state, 8, 4);
    state = observeFrame(state, 8, 5);
    state = observeFrame(state, 8, 6);
    expect(state.level).toBe("full");
  });

  it("marks manual Smooth mode without disabling content", () => {
    const state = setAdaptiveQuality(createAdaptiveQualityState(), "smooth");

    expect(state.smoothMode).toBe(true);
    expect(state.contentEnabled).toBe(true);
    expect(state.effects.trails).toBe(false);
  });
});
