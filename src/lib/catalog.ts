import type { Expression } from "@/lib/contracts";

export const CAMPAIGN_TITLE = "THE WORDS OF MOTHER'S LOVE";
export const CAMPAIGN_TAGLINE = "Where a mother's love resides, peace abides.";

// Short aliases keep the title and tagline convenient for display code while the
// campaign-prefixed exports make their meaning explicit at call sites.
export const TITLE = CAMPAIGN_TITLE;
export const TAGLINE = CAMPAIGN_TAGLINE;

export const EXPRESSIONS: readonly Expression[] = [
  {
    id: 1,
    phrase: "How Are You?",
    principle: "The first phrase to peace",
    color: "#8ED6F5",
  },
  {
    id: 2,
    phrase: "Thank you. It's all thanks to you. You've worked hard.",
    principle: "Express gratitude even for small efforts and acts of kindness",
    color: "#FFD86A",
  },
  {
    id: 3,
    phrase: "I'm sorry. It must have been hard on you.",
    principle: "A phrase that melts the heart by understanding the other's feelings first",
    color: "#FFAF70",
  },
  {
    id: 4,
    phrase: "It's okay. I understand.",
    principle: "A phrase of forgiveness that embraces faults",
    color: "#FF8E86",
  },
  {
    id: 5,
    phrase: "Please, after you.",
    principle: "When feeling impatient, take a breath and yield to others",
    color: "#EF747B",
  },
  {
    id: 6,
    phrase: "I'd love to hear more about your thoughts.",
    principle: "When opinions differ, listen carefully to others",
    color: "#CBB9F4",
  },
  {
    id: 7,
    phrase: "I'll pray (or root) for you. Everything will go well.",
    principle: "Offer sincere support and encouragement",
    color: "#CDEB76",
  },
  {
    id: 8,
    phrase: "Can I give you a hand with anything?",
    principle: "Consideration begins with paying attention to those around you",
    color: "#9DD99F",
  },
  {
    id: 9,
    phrase: "You're amazing. You're doing great!",
    principle: "Warm compliments bring happiness to both sides",
    color: "#A5C9FF",
  },
];

export function expressionById(id: number): Expression | undefined {
  return EXPRESSIONS.find((expression) => expression.id === id);
}
