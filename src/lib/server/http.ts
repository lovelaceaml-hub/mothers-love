import type { NextRequest } from "next/server";
import { isConfigured } from "./env";
import { errorResult } from "./response";

export async function readJson(request: NextRequest): Promise<{ value: unknown; error: ReturnType<typeof errorResult> | null }> {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 16 * 1024) return { value: null, error: errorResult(400, "PAYLOAD_TOO_LARGE") };
  try {
    if (!request.body) return { value: null, error: errorResult(400, "INVALID_JSON") };
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      total += part.value.byteLength;
      if (total > 16 * 1024) {
        await reader.cancel();
        return { value: null, error: errorResult(400, "PAYLOAD_TOO_LARGE") };
      }
      chunks.push(part.value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { value: JSON.parse(new TextDecoder().decode(bytes)), error: null };
  } catch {
    return { value: null, error: errorResult(400, "INVALID_JSON") };
  }
}

export function requireConfigured() {
  return isConfigured() ? null : errorResult(503, "UNAVAILABLE");
}

export function queryValue(request: NextRequest, key: string): string | null {
  return request.nextUrl.searchParams.get(key);
}
