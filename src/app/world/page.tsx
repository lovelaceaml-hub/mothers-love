import type { Metadata } from "next";
import { WorldExperience } from "@/components/display/world/WorldExperience";
import {
  worldArt,
  worldDesignReview,
  worldSampleSource,
  worldView,
} from "@/components/display/world/prototype/design-mode";

export const metadata: Metadata = {
  title: "A Heavenly World | Mother's Love",
  description:
    "A radiant journey through thirteen places of kindness, with readable recognitions and grand luminous arrivals.",
  robots: { index: false, follow: false },
};

/**
 * The 3D world's own address (Plan 28 Section 5), beside the TV view at `/display`, never
 * replacing it. `/display/world-preview` redirects here with its query (next.config.ts).
 * The query is rebuilt in its original order and read by the same pure rules the browser
 * modules use, so the server's first render and the world agree on the look and the view.
 */
export default async function WorldPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query))
    for (const item of [value ?? []].flat()) search.append(key, item);
  const text = search.toString();
  const entrance = search.get("entrance") ?? undefined;
  return (
    <WorldExperience
      initialSource={worldSampleSource(text) ? "sample" : "live"}
      design={worldArt(text) === "design"}
      designReview={worldDesignReview(text)}
      initialStudyArrival={entrance}
      tvPage={worldView(text) === "tv"}
    />
  );
}
