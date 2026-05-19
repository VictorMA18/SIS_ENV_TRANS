import type { User } from '../context/auth';

const AUTH_STORAGE_KEY = 'cargoDistrict.auth';

export interface StoredAuth {
  access: string;
  refresh: string;
  user: User;
}

const canUseStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const getStoredAuth = (): StoredAuth | null => {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuth;
    if (!parsed?.access || !parsed?.refresh || !parsed?.user) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const setStoredAuth = (auth: StoredAuth) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
};

export const clearStoredAuth = () => {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
};

export const getAccessToken = () => getStoredAuth()?.access ?? null;
