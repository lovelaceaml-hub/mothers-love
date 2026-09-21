import { WORLD_EXPRESSIONS, ZONES, type ZoneId } from "./world-data";

export function neighborMotion(time: number, index: number) {
  const phase = (time * 0.12 + Math.PI / 2 + index * 0.21) % (Math.PI * 2);
  const approaching = Math.max(0, Math.cos(phase));
  return { distance: 1.25 + approaching * 1.3, walking: approaching > 0.08 };
}

export function neighborWords(index: number) {
  return {
    greeting: WORLD_EXPRESSIONS[index % WORLD_EXPRESSIONS.length].phrase,
    response:
      index % 2
        ? "Thank you for being here."
        : "Your kindness makes a difference.",
  };
}

/** The same clock and words drive the 3D speech and its accessible description. */
export function neighborDialogue(
  time: number,
  zone: ZoneId,
  celebrating = false,
) {
  const index = ZONES.findIndex((item) => item.id === zone);
  if (celebrating || neighborMotion(time, index).walking) return null;
  const words = neighborWords(index);
  return Math.sin(time * 0.4) >= 0 ? words.greeting : words.response;
}
