import { getAuthClient } from '@/lib/auth-client';
import { api } from '@/lib/client-api';

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

export const getAuthErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  return 'The admin service is unavailable. Try again when the campaign service is configured.';
};

export const isUnauthorized = (error: unknown): boolean => {
  const value = error as { status?: number; code?: string } | null;
  return value?.status === 401 || value?.code === 'UNAUTHENTICATED' || value?.code === 'SESSION_EXPIRED';
};

