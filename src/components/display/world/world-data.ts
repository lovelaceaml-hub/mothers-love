import { EXPRESSIONS } from "@/lib/catalog";
import type { ColorPolishScene } from "@/lib/color-polish/contracts";

export type ZoneId =
  | "garden"
  | "heart"
  | "expressions"
  | "welcome"
  | "featured"
  | "calendar"
  | "peacemakers"
  | "status"
  | "orbit"
  | "milestone"
  | "live-feed"
  | "practice"
  | "promise";
export type Quality = "auto" | "high" | "low";
export type WorldZone = {
  id: ZoneId;
  scene: ColorPolishScene;
  name: string;
  short: string;
  caption: string;
  center: readonly [number, number, number];
  eye: readonly [number, number, number];
  target: readonly [number, number, number];
  color: string;
};
export const ZONES: readonly WorldZone[] = [
  {
    id: "garden",
    scene: "garden",
    name: "Garden of Kindness",
    short: "Garden",
    caption: "Small kindnesses. A world in bloom.",
    center: [26, 0, 16],
    eye: [41, 11, 40],
    target: [26, 3, 16],
    color: "#da879b",
  },
  {
    id: "heart",
    scene: "peace-in-practice",
    name: "Heart Sanctuary",
    short: "Sanctuary",
    caption: "May Mother's love bring peace to the world!",
    center: [-27, 0, -9],
    eye: [-13, 12, 19],
    target: [-27, 7, -9],
    color: "#df739d",
  },
  {
    id: "expressions",
    scene: "expressions",
    name: "Nine Expressions Grove",
    short: "Expressions",
    caption: "Nine ways to bring peace into every day.",
    center: [14, 0, -45],
    eye: [31, 12, -17],
    target: [14, 4, -45],
    color: "#a68bce",
  },
  {
    id: "welcome",
    scene: "welcome",
    name: "Butterfly Gate",
    short: "Welcome",
    caption: "Where a mother's love resides, peace abides.",
    center: [0, 0, 62],
    eye: [15, 10, 89],
    target: [0, 5, 62],
    color: "#dcac62",
  },
  {
    id: "featured",
    scene: "featured",
    name: "Pearl Pavilion",
    short: "Featured",
    caption: "One act of love. A lasting light.",
    center: [-66, 0, 26],
    eye: [-46, 10, 52],
    target: [-66, 4, 26],
    color: "#db9584",
  },
  {
    id: "calendar",
    scene: "calendar",
    name: "Garden of Days",
    short: "Calendar",
    caption: "A little more love, day by day.",
    center: [70, 0, -19],
    eye: [88, 15, 11],
    target: [70, 2, -19],
    color: "#90b9c5",
  },
  {
    id: "peacemakers",
    scene: "peacemakers",
    name: "Peace Globe",
    short: "Peacemakers",
    caption: "We are peacemakers.",
    center: [-67, 0, -62],
    eye: [-47, 12, -31],
    target: [-67, 7, -62],
    color: "#83b9b8",
  },
  {
    id: "status",
    scene: "status",
    name: "Love Observatory",
    short: "Our impact",
    caption: "Mother's Love, recognized.",
    center: [72, 0, -79],
    eye: [94, 14, -53],
    target: [72, 4, -79],
    color: "#d9a969",
  },
  {
    id: "orbit",
    scene: "orbit",
    name: "Expression Cosmos",
    short: "Orbit",
    caption: "A shared expression. Many kind words.",
    center: [8, 26, -112],
    eye: [29, 38, -81],
    target: [8, 32, -112],
    color: "#a99bd8",
  },
  {
    id: "milestone",
    scene: "milestone",
    name: "Fountain of Kindness",
    short: "Weekly goal",
    caption: "Every kind word helps love rise.",
    center: [-46, 25, -112],
    eye: [-23, 40, -81],
    target: [-46, 35, -112],
    color: "#e2b360",
  },
  {
    id: "live-feed",
    scene: "live-feed",
    name: "River of Recognitions",
    short: "Recognitions",
    caption: "A flowing story of kindness.",
    center: [70, 0, 48],
    eye: [91, 12, 77],
    target: [70, 4, 48],
    color: "#87bbaa",
  },
  {
    id: "practice",
    scene: "expressions",
    name: "Daily Practice Terrace",
    short: "Daily practice",
    caption: "Love expressed through words and actions.",
    center: [-80, 0, -17],
    eye: [-61, 11, 10],
    target: [-80, 3, -17],
    color: "#c3ae73",
  },
  {
    id: "promise",
    scene: "peacemakers",
    name: "Peace Promise",
    short: "Our promise",
    caption: "Let peace begin with a kind word.",
    center: [-37, 0, 69],
    eye: [-17, 10, 95],
    target: [-37, 4, 69],
    color: "#c995b5",
  },
];
export const TOUR_ORDER: ZoneId[] = [
  "welcome",
  "garden",
  "featured",
  "heart",
  "expressions",
  "peacemakers",
  "practice",
  "calendar",
  "status",
  "orbit",
  "milestone",
  "live-feed",
  "promise",
];
export const ARRIVAL_VIEW = {
  eye: [15, 17, 43] as const,
  target: [0, 10, 10] as const,
};
export const WORLD_EXPRESSIONS = EXPRESSIONS;
export const SAMPLE_RECOGNITIONS = [
  {
    name: "Alex",
    message:
      "Thank you for noticing I needed a hand and staying to help. Your kindness made the whole day brighter.",
    expressionId: 8,
  },
  {
    name: "Jordan",
    message:
      "You listened with patience and made me feel understood. Thank you for making room for my thoughts.",
    expressionId: 6,
  },
  {
    name: "Taylor",
    message:
      "Your quiet encouragement gave me the courage to try again. The little things you do make a difference.",
    expressionId: 7,
  },
  {
    name: "Morgan",
    message:
      "You welcomed everyone with a warm hello. Thank you for making a new place feel like home.",
    expressionId: 1,
  },
  {
    name: "Casey",
    message:
      "You chose patience when the day was busy. Your thoughtful words helped us find peace together.",
    expressionId: 5,
  },
  {
    name: "Jamie",
    message:
      "You celebrated every small step forward. Thank you for reminding me that my effort matters.",
    expressionId: 9,
  },
  {
    name: "Riley",
    message:
      "Thank you for preparing everything with such care. We felt your kindness in every detail.",
    expressionId: 2,
  },
  {
    name: "Skyler",
    message:
      "You understood how I felt and reached out first. Your words made it easier for us to begin again.",
    expressionId: 3,
  },
  {
    name: "Drew",
    message:
      "You responded gently when I made a mistake. Thank you for giving me room to learn with confidence.",
    expressionId: 4,
  },
] as const;
export function zoneIndex(id: ZoneId) {
  return Math.max(
    0,
    ZONES.findIndex((zone) => zone.id === id),
  );
}
export function smoothstep(t: number) {
  const n = Math.max(0, Math.min(1, t));
  return n * n * (3 - 2 * n);
}
export function seededRandom(seed = 17) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export const RECOGNITION_ZONES: readonly ZoneId[] = [
  "garden",
  "heart",
  "featured",
  "peacemakers",
  "orbit",
  "live-feed",
];
