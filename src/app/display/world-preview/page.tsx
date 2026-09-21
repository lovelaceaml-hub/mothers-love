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
  searchParams: Promise<{ source?: string }>;
}) {
  const query = await searchParams;
  return (
    <WorldExperience
      initialSource={query.source === "sample" ? "sample" : "live"}
    />
  );
}
