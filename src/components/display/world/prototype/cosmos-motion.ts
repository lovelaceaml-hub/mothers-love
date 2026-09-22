/** Bounded world-space drift keeps the pearl, message and ornament moving together. */
export function cosmosPearlPosition(time: number, index: number, portrait: boolean): [number, number, number] {
  if (index === 0) {
    return [
      Math.sin(time * .105) * (portrait ? 1.15 : 4.1),
      9.9 + Math.sin(time * .14) * .72 - (1 - Math.cos(time * .08)) * .28,
      3 - (1 - Math.cos(time * .095)) * 1.1,
    ];
  }
  const phase = time * .085 + index * 2.1;
  const anchor = index === 1 ? [-14, 12.8, -8] : [17, 18, -22];
  return [
    anchor[0] + Math.sin(phase) * 2.8,
    anchor[1] + Math.sin(phase * 1.3) * 1.1,
    anchor[2] + Math.cos(phase * .8) * 2.6,
  ];
}
