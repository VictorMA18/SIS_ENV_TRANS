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
