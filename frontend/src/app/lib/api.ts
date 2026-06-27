import { clearStoredAuth, getAccessToken, getStoredAuth, setStoredAuth } from './auth-storage';

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

// Queueing mechanism for concurrent requests during token refresh
let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (err: unknown) => void }[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const refreshAccessToken = async (): Promise<string> => {
  const stored = getStoredAuth();
  if (!stored || !stored.refresh) {
    throw new Error('No refresh token available');
  }

  const refreshUrl = buildUrl('/api/auth/token/refresh/');
  const response = await fetch(refreshUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ refresh: stored.refresh }),
  });

  if (!response.ok) {
    throw new Error('Refresh token invalid or expired');
  }

  const data = await response.json();
  if (!data?.access) {
    throw new Error('No access token returned');
  }

  setStoredAuth({ ...stored, access: data.access });
  return data.access;
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
    if (response.status === 401 && auth) {
      const stored = getStoredAuth();
      if (stored?.refresh) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const newAccessToken = await refreshAccessToken();
            isRefreshing = false;
            processQueue(null, newAccessToken);
          } catch (refreshErr) {
            isRefreshing = false;
            processQueue(refreshErr, null);
            clearStoredAuth();
            if (unauthorizedHandler) unauthorizedHandler();
            throw new ApiError('Request failed', response.status, data);
          }
        }

        try {
          const retryToken = await new Promise<string>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          });
          finalHeaders.Authorization = `Bearer ${retryToken}`;
          const retryResponse = await fetch(buildUrl(path), {
            method,
            headers: finalHeaders,
            body: finalBody,
            signal,
          });
          const retryData = await parseResponse(retryResponse);
          if (!retryResponse.ok) {
            throw new ApiError('Request failed after token refresh', retryResponse.status, retryData);
          }
          return retryData as T;
        } catch (queueErr) {
          throw new ApiError('Request failed', response.status, data);
        }
      } else {
        clearStoredAuth();
        if (unauthorizedHandler) unauthorizedHandler();
      }
    } else if (response.status === 401) {
      clearStoredAuth();
      if (unauthorizedHandler) unauthorizedHandler();
    }
    throw new ApiError('Request failed', response.status, data);
  }

  return data as T;
};
