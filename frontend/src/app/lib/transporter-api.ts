import { apiRequest } from './api';

export interface TransporterProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  avatar_url?: string | null;
  license_number?: string | null;
  ruc?: string | null;
  vehicle_description?: string | null;
  is_available: boolean;
  is_active: boolean;
  completed_shipments: number;
  average_rating: number | null;
}

/** Obtener el perfil de un transportista por su ID (UUID del usuario) */
export const fetchTransporterProfile = (id: string): Promise<TransporterProfile> =>
  apiRequest<TransporterProfile>(`/api/transporters/${id}/`);

/** Actualizar parcialmente el perfil del transportista actual */
export const patchTransporterProfile = (
  id: string,
  payload: Partial<
    Pick<
      TransporterProfile,
      | 'is_available'
      | 'license_number'
      | 'ruc'
      | 'vehicle_description'
      | 'full_name'
      | 'phone'
      | 'avatar_url'
    >
  >,
): Promise<TransporterProfile> =>
  apiRequest<TransporterProfile>(`/api/transporters/${id}/`, {
    method: 'PATCH',
    body: payload,
  });

export interface TransporterZone {
  id: string;
  transporter: string;
  district: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const ZONES_BASE = '/api/transporter-zones/';

export const fetchTransporterZones = (): Promise<TransporterZone[]> =>
  apiRequest<TransporterZone[]>(ZONES_BASE);

export const createTransporterZone = (district: string): Promise<TransporterZone> =>
  apiRequest<TransporterZone>(ZONES_BASE, {
    method: 'POST',
    body: { district },
  });

export const updateTransporterZone = (
  id: string,
  payload: Partial<Pick<TransporterZone, 'district' | 'is_active'>>,
): Promise<TransporterZone> =>
  apiRequest<TransporterZone>(`${ZONES_BASE}${id}/`, {
    method: 'PATCH',
    body: payload,
  });

export const deleteTransporterZone = (id: string): Promise<void> =>
  apiRequest<void>(`${ZONES_BASE}${id}/`, { method: 'DELETE' });
