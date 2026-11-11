import type { ApiClientOptions, ApiError } from "@/lib/contracts";

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
  }
}

function errorFromBody(body: unknown, status: number): ApiClientError {
  if (typeof body === "object" && body !== null && "error" in body && "code" in body) {
    const candidate = body as Partial<ApiError>;
    if (typeof candidate.error === "string" && typeof candidate.code === "string") {
      return new ApiClientError(candidate.error, candidate.code, status);
    }
  }

  return new ApiClientError("The request could not be completed.", "request_failed", status);
}

// The sign-in library is large and only admin requests need it, so it is loaded on
// first use. The public form and the TV pass `auth: false` and never download it.
async function currentAccessToken(): Promise<string | null> {
  let authClient: typeof import("@/lib/auth-client");
  try {
    authClient = await import("@/lib/auth-client");
  } catch {
    throw new ApiClientError("The service is temporarily unavailable.", "network_error", 0);
  }
  return authClient.getCurrentAccessToken();
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function api<T>(path: string, options: ApiClientOptions = {}): Promise<T> {
  const { auth = true, token, bearerToken, headers, onResponseHeaders, ...requestInit } = options;
  const explicitToken = bearerToken ?? token ?? null;
  const accessToken = explicitToken ?? (auth ? await currentAccessToken() : null);
  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");

  if (requestInit.body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (accessToken) {
    requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...requestInit,
      credentials: "include",
      headers: requestHeaders,
    });
  } catch {
    throw new ApiClientError("The service is temporarily unavailable.", "network_error", 0);
  }

  onResponseHeaders?.(response.headers);

  if (!response.ok) {
    throw errorFromBody(await readResponseBody(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await readResponseBody(response);
  return body as T;
}
