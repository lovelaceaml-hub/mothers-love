import type { Metadata } from "next";
import { WorldExperience } from "@/components/display/world/WorldExperience";

export const metadata: Metadata = {
  title: "Expression Cosmos prototype | Mother's Love",
  description: "A single fictional-data prototype inspired by the pearl-world reference.",
  robots: { index: false, follow: false },
};

/** Always fictional, including when the URL contains source=live. */
export default function CosmosPrototypePage() {
  return <WorldExperience initialSource="sample" designReview cosmosPrototype />;
}
