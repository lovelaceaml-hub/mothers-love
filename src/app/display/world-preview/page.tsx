import type { Metadata } from "next";
import { WorldExperience } from "@/components/display/world/WorldExperience";

export const metadata: Metadata = {
  title: "A Heavenly World | Mother's Love",
  description:
    "A radiant journey through thirteen places of kindness, with readable recognitions and grand luminous arrivals.",
  robots: { index: false, follow: false },
};

export default async function WorldPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string | string[]; art?: string | string[]; entrance?: string; view?: string | string[] }>;
}) {
  const query = await searchParams;
  return (
    <WorldExperience
      initialSource={query.source === "sample" ? "sample" : "live"}
      designReview={query.art === "design" && query.source === "sample"}
      initialStudyArrival={query.entrance}
      tvPage={query.art === "design" && query.source === "sample" && query.view === "tv"}
    />
  );
}
