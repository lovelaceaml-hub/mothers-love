import { getAuthClient } from '@/lib/auth-client';
import { ApiClientError, api } from '@/lib/client-api';

type ApiOptions = RequestInit & { token?: string };

const getBearer = async (): Promise<string | null> => {
  const client = getAuthClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
};

export const adminApi = async <T>(path: string, options: ApiOptions = {}): Promise<T> => {
  const token = options.token ?? (await getBearer());
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const { token: _token, ...requestOptions } = options;
  return api<T>(path, { ...requestOptions, headers });
};

export const adminJson = <T>(path: string, body: unknown, method: 'POST' | 'PATCH' = 'PATCH') =>
  adminApi<T>(path, {
    method,
    body: JSON.stringify(body),
  });

export const adminCsv = async (path: string): Promise<string> => {
  const token = await getBearer();
  const headers = new Headers({ Accept: 'text/csv' });
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(path, { credentials: 'include', headers });
  } catch {
    throw new ApiClientError('The service is temporarily unavailable.', 'network_error', 0);
  }
  if (!response.ok) {
    let errorMessage = 'The request could not be completed.';
    let errorCode = 'request_failed';
    if ((response.headers.get('content-type') ?? '').includes('application/json')) {
      const body = await response.json().catch(() => null) as { error?: unknown; code?: unknown } | null;
      if (typeof body?.error === 'string') errorMessage = body.error;
      if (typeof body?.code === 'string') errorCode = body.code;
    }
    throw new ApiClientError(errorMessage, errorCode, response.status);
  }
  return response.text();
};

export const getAuthErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  return 'The admin service is unavailable. Try again when the campaign service is configured.';
};

export const isUnauthorized = (error: unknown): boolean => {
  const value = error as { status?: number; code?: string } | null;
  return value?.status === 401 || value?.code === 'UNAUTHENTICATED' || value?.code === 'SESSION_EXPIRED';
};
