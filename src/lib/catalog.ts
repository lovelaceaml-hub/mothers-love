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
    example: "Start with a friendly hello to a neighbor, a classmate, or someone serving your community.",
  },
  {
    id: 2,
    phrase: "Thank you. It's all thanks to you. You've worked hard.",
    principle: "Express gratitude even for small efforts and acts of kindness",
    color: "#FFD86A",
    example: "Thank someone for an everyday kindness, such as preparing a meal or helping you travel safely.",
  },
  {
    id: 3,
    phrase: "I'm sorry. It must have been hard on you.",
    principle: "A phrase that melts the heart by understanding the other's feelings first",
    color: "#FFAF70",
    example: "Consider how your words affected the other person. Acknowledge your mistake and take the first step toward reconciliation.",
  },
  {
    id: 4,
    phrase: "It's okay. I understand.",
    principle: "A phrase of forgiveness that embraces faults",
    color: "#FF8E86",
    example: "Respond gently when someone makes a mistake, and help them move forward without embarrassment.",
  },
  {
    id: 5,
    phrase: "Please, after you.",
    principle: "When feeling impatient, take a breath and yield to others",
    color: "#EF747B",
    example: "Make room for someone else when a queue or busy journey tests your patience.",
  },
  {
    id: 6,
    phrase: "I'd love to hear more about your thoughts.",
    principle: "When opinions differ, listen carefully to others",
    color: "#CBB9F4",
    example: "Give a different opinion your full attention before replying. Listening helps people feel respected.",
  },
  {
    id: 7,
    phrase: "I'll pray (or root) for you. Everything will go well.",
    principle: "Offer sincere support and encouragement",
    color: "#CDEB76",
    example: "Encourage someone facing a difficult moment, and remind them that they have your support.",
  },
  {
    id: 8,
    phrase: "Can I give you a hand with anything?",
    principle: "Consideration begins with paying attention to those around you",
    color: "#9DD99F",
    example: "Notice who could use practical help, then offer a manageable act of kindness.",
  },
  {
    id: 9,
    phrase: "You're amazing. You're doing great!",
    principle: "Warm compliments bring happiness to both sides",
    color: "#A5C9FF",
    example: "Recognize someone's effort or progress with a thoughtful compliment that brightens their day.",
  },
];

export function expressionById(id: number): Expression | undefined {
  return EXPRESSIONS.find((expression) => expression.id === id);
}
