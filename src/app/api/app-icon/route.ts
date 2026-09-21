import part1 from "../../icon-data/part1";
import part2 from "../../icon-data/part2";
import part3 from "../../icon-data/part3";
import part4 from "../../icon-data/part4";
import part5 from "../../icon-data/part5";
import part6 from "../../icon-data/part6";

export const runtime = "nodejs";
export const dynamic = "force-static";

const png = Buffer.from(part1 + part2 + part3 + part4 + part5 + part6, "base64");

export async function GET() {
  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
