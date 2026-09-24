import * as T from "three";
import type { HeavenlyDistrictKit } from "./district-kit";

export function calendarDistrict({ island, mesh, pearl, rose, ring }: HeavenlyDistrictKit) {
  // Calendar: thirty-one architectural tiles following a real calendar rhythm.
  const calendar = island("calendar", 17);
  for (let i = 0; i < 31; i++) {
    const x = ((i % 7) - 3) * 3.3,
      z = (Math.floor(i / 7) - 2) * 3.3;
    mesh(
      new T.BoxGeometry(2.7, 0.35 + (i % 4) * 0.15, 2.7),
      i % 5 ? pearl : rose,
      calendar,
      [x, 1 + (i % 4) * 0.075, z],
    );
  }
  ring(calendar, 15.4, 0.7);
}
