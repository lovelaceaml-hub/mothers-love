import { describe, expect, it } from "vitest";
import type { Recognition } from "@/lib/contracts";
import { RECOGNITION_ZONES, type ZoneId } from "../../src/components/display/world/world-data";
import { studyHeroPlacement, studyResidents } from "../../src/components/display/world/world-recognitions";

/**
 * Plan 26 K1 visual review: where the design study's hero pearl stands in three zones, and
 * which records the resident pearls show. Records here are bare ids; no wording is involved.
 */
const records = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: `sample-${i}` }) as unknown as Recognition);

type Plan = Parameters<typeof studyResidents>[0][number];
function plansFor(pool: readonly Recognition[], current?: Map<ZoneId, [Recognition | undefined, Recognition | undefined]>): Plan[] {
  return RECOGNITION_ZONES.map((place, i) => ({
    place,
    pool,
    main: pool[i % Math.max(1, pool.length)],
    current: [current?.get(place)?.[0]?.id, current?.get(place)?.[1]?.id] as const,
  }));
}

describe("design study hero placement", () => {
  it("stands the Pearl Pavilion hero in front of the arch ring, clear of every column", () => {
    const { side, outward } = studyHeroPlacement("featured", false);
    expect(side).toBe(3);
    // The five arches stand on a ring of radius 7 round the zone target, columns .32 thick,
    // and the hero disc is 4.4 across; at outward 8 its face is in front of the ring.
    expect(outward).toBe(8);
    expect(outward).toBeGreaterThan(7 + .32);
  });
  it("sets the heart and the globe beside their pearls, never through them", () => {
    // The heart is about 4.5 half wide and the globe 4; the hero is 4.4 with its medallions
    // at about 1.36 radii, so a side of 10.5 or more keeps the two apart.
    expect(studyHeroPlacement("heart", false).side).toBeGreaterThanOrEqual(10.5);
    expect(studyHeroPlacement("peacemakers", false).side).toBeGreaterThanOrEqual(10.5);
  });
  it("keeps every other zone where classic and cinematic put it, and phones centred", () => {
    for (const zone of RECOGNITION_ZONES) {
      if (zone !== "heart" && zone !== "peacemakers") expect(studyHeroPlacement(zone, false).side).toBe(3);
      if (zone !== "featured") expect(studyHeroPlacement(zone, false).outward).toBe(5);
      expect(studyHeroPlacement(zone, true).side).toBe(0);
    }
  });
});

describe("design study resident pearls", () => {
  it("never shows the same record twice in one zone", () => {
    for (const count of [1, 2, 3, 5, 9, 14]) {
      const pool = records(count);
      const result = studyResidents(plansFor(pool));
      for (const plan of plansFor(pool)) {
        const shown = [plan.main?.id, ...(result.get(plan.place) ?? []).map((record) => record?.id)].filter(Boolean);
        expect(new Set(shown).size, `${count} records, ${plan.place}`).toBe(shown.length);
      }
    }
  });
  it("leaves a slot empty rather than repeat a record when the pool is too small", () => {
    const result = studyResidents(plansFor(records(2)));
    for (const [first, second] of result.values()) {
      expect(first).toBeDefined();
      expect(second).toBeUndefined();
    }
    for (const pair of studyResidents(plansFor(records(1))).values()) expect(pair).toEqual([undefined, undefined]);
  });
  it("spreads the records evenly over the resident slots, heroes last at equal use", () => {
    const pool = records(9);
    const plans = plansFor(pool);
    const result = studyResidents(plans);
    // The three records that are no zone's hero are each shown at least as often as any hero.
    const heroes = new Set(plans.map((plan) => plan.main!.id));
    const uses = new Map(pool.map((record) => [record.id, 0]));
    for (const pair of result.values()) for (const record of pair) if (record) uses.set(record.id, uses.get(record.id)! + 1);
    const counts = [...uses.values()];
    expect(counts.reduce((sum, n) => sum + n, 0)).toBe(RECOGNITION_ZONES.length * 2);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    const free = pool.filter((record) => !heroes.has(record.id)).map((record) => uses.get(record.id)!);
    const hero = pool.filter((record) => heroes.has(record.id)).map((record) => uses.get(record.id)!);
    expect(Math.min(...free)).toBeGreaterThanOrEqual(Math.max(...hero));
  });
  it("prefers records that are no zone's hero while enough are free", () => {
    // Six zones, six heroes, twelve resident slots: eighteen records leave twelve free.
    const pool = records(18);
    const plans = plansFor(pool);
    const heroes = new Set(plans.map((plan) => plan.main!.id));
    const result = studyResidents(plans);
    for (const pair of result.values()) for (const record of pair) expect(heroes.has(record!.id)).toBe(false);
  });
  it("keeps what a resident already shows while it is still allowed, so nothing repaints", () => {
    const pool = records(9);
    const first = studyResidents(plansFor(pool));
    const second = studyResidents(plansFor(pool, first));
    expect([...second.entries()]).toEqual([...first.entries()]);
    // Deterministic for the same input.
    expect([...studyResidents(plansFor(pool)).entries()]).toEqual([...first.entries()]);
  });
});
