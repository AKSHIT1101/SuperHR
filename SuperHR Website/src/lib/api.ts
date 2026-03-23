export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

type RequestOptions = {
  method?: ApiMethod;
  token?: string | null;
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
};

async function readResponseBody(res: Response): Promise<unknown> {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
  try {
    return await res.text();
  } catch {
    return null;
  }
}

function extractErrorMessage(data: unknown, fallback: string): string {
  if (!data) return fallback;
  if (typeof data === 'string') return data || fallback;
  if (typeof data === 'object') {
    const anyData = data as any;
    if (typeof anyData.detail === 'string') return anyData.detail;
    if (Array.isArray(anyData.detail) && anyData.detail.length > 0) {
      const first = anyData.detail[0];
      if (first && typeof first.msg === 'string') return first.msg;
    }
    if (typeof anyData.message === 'string') return anyData.message;
  }
  return fallback;
}

export async function apiRequest<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const method = opts.method ?? 'GET';
  const token = opts.token ?? localStorage.getItem('crm_token');

  const headers: Record<string, string> = {
    ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers ?? {}),
  };

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  const data = await readResponseBody(res);
  if (!res.ok) {
    const msg = extractErrorMessage(data, `Request failed (${res.status})`);
    throw new ApiError(msg, res.status, data);
  }
  return data as T;
}

export const apiGet = <T = unknown>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
  apiRequest<T>(path, { ...opts, method: 'GET' });

export const apiPost = <T = unknown, B = unknown>(path: string, body: B, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
  apiRequest<T>(path, { ...opts, method: 'POST', body });

export const apiPatch = <T = unknown, B = unknown>(path: string, body: B, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
  apiRequest<T>(path, { ...opts, method: 'PATCH', body });

export const apiPut = <T = unknown, B = unknown>(path: string, body: B, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
  apiRequest<T>(path, { ...opts, method: 'PUT', body });

export const apiDelete = <T = unknown>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
  apiRequest<T>(path, { ...opts, method: 'DELETE' });

