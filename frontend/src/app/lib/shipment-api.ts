/**
 * Capa de servicio API para el módulo de envíos.
 * Todas las llamadas HTTP pasan por `apiRequest` para auth y manejo de errores.
 */

import { apiRequest } from './api';
import type {
  AvailableTransporter,
  CreateShipmentPayload,
  Shipment,
  UpdateShipmentPayload,
} from '../types/shipment';

// ─── Endpoints ──────────────────────────────────────────────────────────────

const SHIPMENTS_BASE = '/api/shipments/';
const AVAILABLE_TRANSPORTERS = '/api/shipments/available-transporters/';

// ─── Shipment CRUD ──────────────────────────────────────────────────────────

/** Listar envíos del usuario autenticado. */
export const fetchShipments = (): Promise<Shipment[]> =>
  apiRequest<Shipment[]>(SHIPMENTS_BASE);

/** Obtener detalle de un envío por ID. */
export const fetchShipmentById = (id: string): Promise<Shipment> =>
  apiRequest<Shipment>(`${SHIPMENTS_BASE}${id}/`);

/** Crear un envío con selección de transportista. */
export const createShipment = (payload: CreateShipmentPayload): Promise<Shipment> =>
  apiRequest<Shipment>(SHIPMENTS_BASE, {
    method: 'POST',
    body: payload,
  });

/** Edición completa de un envío (solo estados tempranos). */
export const updateShipment = (
  id: string,
  payload: UpdateShipmentPayload,
): Promise<Shipment> =>
  apiRequest<Shipment>(`${SHIPMENTS_BASE}${id}/`, {
    method: 'PUT',
    body: payload,
  });

/** Edición parcial de un envío (solo estados tempranos). */
export const patchShipment = (
  id: string,
  payload: Partial<UpdateShipmentPayload>,
): Promise<Shipment> =>
  apiRequest<Shipment>(`${SHIPMENTS_BASE}${id}/`, {
    method: 'PATCH',
    body: payload,
  });

// ─── Available Transporters ─────────────────────────────────────────────────

/** Obtener transportistas disponibles, opcionalmente filtrados por distrito. */
export const fetchAvailableTransporters = (
  originDistrict?: string,
  destinationDistrict?: string,
): Promise<AvailableTransporter[]> => {
  const params = new URLSearchParams();
  if (originDistrict) params.set('origin_district', originDistrict);
  if (destinationDistrict) params.set('destination_district', destinationDistrict);

  const query = params.toString();
  const url = query ? `${AVAILABLE_TRANSPORTERS}?${query}` : AVAILABLE_TRANSPORTERS;

  return apiRequest<AvailableTransporter[]>(url);
};
