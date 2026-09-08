export type FilterResult = { disposition: "publish" | "hold"; categories: string[] };

const RULES: Array<[string, RegExp]> = [
  ["profanity", /\b(?:fuck|fucking|shit|bitch|asshole|cunt|motherfucker)\b/i],
  ["private_contact", /(?:https?:\/\/|www\.)\S+|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/i],
  ["health_detail", /\b(?:diagnos(?:ed|is)|cancer|hiv|aids|hospital(?:ized)?|medication|chemotherapy|suicide|self[- ]harm|pregnan(?:t|cy)|dementia|addiction|overdose)\b/i],
  ["private_disagreement", /\b(?:divorce|argument|fighting|fight with|don't tell|do not tell|between us|secret|private matter|confidential)\b/i],
];

export function screenRecognition(submittedName: string, recipient: string, message: string): FilterResult {
  try {
    const text = `${submittedName}\n${recipient}\n${message}`;
    const categories = RULES.filter(([, pattern]) => pattern.test(text)).map(([category]) => category);
    return categories.length ? { disposition: "hold", categories } : { disposition: "publish", categories: [] };
  } catch {
    return { disposition: "hold", categories: ["filter_error"] };
  }
}
