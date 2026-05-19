import { clearStoredAuth, getAccessToken } from './auth-storage';

type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export interface ApiRequestOptions {
  method?: ApiMethod;
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
  signal?: AbortSignal;
}

let unauthorizedHandler: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  unauthorizedHandler = handler;
};

const API_BASE_URL = (import.meta.env.VITE_API_URL_BACKEND || '').replace(/\/$/, '');

const buildUrl = (path: string) => {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (!API_BASE_URL) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

const parseResponse = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const apiRequest = async <T>(
  path: string,
  { method = 'GET', body, headers = {}, auth = true, signal }: ApiRequestOptions = {},
): Promise<T> => {
  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };

  let finalBody: BodyInit | undefined;

  if (body !== undefined && body !== null) {
    if (body instanceof FormData) {
      finalBody = body;
    } else {
      finalBody = JSON.stringify(body);
      if (!finalHeaders['Content-Type']) {
        finalHeaders['Content-Type'] = 'application/json';
      }
    }
  }

  if (auth) {
    const token = getAccessToken();
    if (token) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers: finalHeaders,
    body: finalBody,
    signal,
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredAuth();
      if (unauthorizedHandler) unauthorizedHandler();
    }
    throw new ApiError('Request failed', response.status, data);
  }

  return data as T;
};
