import { apiRequest } from './api';
import type { User, UserRole } from '../context/auth';

type ApiRole = 'CLIENT' | 'TRANSPORTER' | 'ADMIN';

interface ApiTokens {
  access: string;
  refresh: string;
}

interface ApiUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string | null;
  phone?: string | null;
  role?: ApiRole | string;
}

interface ApiProfile {
  dni?: string | null;
  address?: string | null;
  license_number?: string | null;
  ruc?: string | null;
  vehicle_description?: string | null;
  is_available?: boolean | null;
  completed_shipments?: number | null;
  average_rating?: number | null;
}

interface ApiAuthResponse {
  tokens: ApiTokens;
  user: ApiUser;
  profile?: ApiProfile;
}

export interface AuthResult {
  user: User;
  access: string;
  refresh: string;
}

const toApiRole = (role: UserRole): ApiRole =>
  role === 'transporter' ? 'TRANSPORTER' : 'CLIENT';

const fromApiRole = (role?: ApiRole | string): UserRole =>
  role === 'TRANSPORTER' ? 'transporter' : 'client';

const mapDocument = (profile?: ApiProfile) => {
  if (!profile) return undefined;
  if (profile.dni) return `DNI: ${profile.dni}`;
  if (profile.ruc) return `RUC: ${profile.ruc}`;
  return undefined;
};

const mapUser = (apiUser: ApiUser, profile?: ApiProfile, googleLinked = false): User => {
  const role = fromApiRole(apiUser.role);

  return {
    id: apiUser.id,
    name: apiUser.full_name || apiUser.email,
    email: apiUser.email,
    role,
    avatar: apiUser.avatar_url || undefined,
    googleLinked,
    phone: apiUser.phone || undefined,
    document: mapDocument(profile),
    vehicleType: role === 'transporter' ? profile?.vehicle_description || undefined : undefined,
    completedShipments: profile?.completed_shipments ?? undefined,
    rating: profile?.average_rating ?? undefined,
  };
};

const mapAuthResponse = (data: ApiAuthResponse, googleLinked = false): AuthResult => ({
  user: mapUser(data.user, data.profile, googleLinked),
  access: data.tokens.access,
  refresh: data.tokens.refresh,
});

export const loginApi = async (
  email: string,
  password: string,
  role: UserRole,
): Promise<AuthResult> => {
  const data = await apiRequest<ApiAuthResponse>('/api/auth/login/', {
    method: 'POST',
    auth: false,
    body: {
      email,
      password,
      role: toApiRole(role),
    },
  });

  return mapAuthResponse(data);
};

export const registerApi = async (
  fullName: string,
  email: string,
  password: string,
  confirmPassword: string,
  role: UserRole,
): Promise<AuthResult> => {
  const endpoint = role === 'transporter'
    ? '/api/auth/register/transporter/'
    : '/api/auth/register/client/';

  const data = await apiRequest<ApiAuthResponse>(endpoint, {
    method: 'POST',
    auth: false,
    body: {
      full_name: fullName,
      email,
      password,
      confirm_password: confirmPassword,
    },
  });

  return mapAuthResponse(data);
};

export const loginWithGoogleApi = async (
  idToken: string,
  role: UserRole,
): Promise<AuthResult> => {
  const data = await apiRequest<ApiAuthResponse>('/api/auth/callback/google/', {
    method: 'POST',
    auth: false,
    body: {
      id_token: idToken,
      role: toApiRole(role),
    },
  });

  return mapAuthResponse(data, true);
};
