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
  CloudinarySignatureResponse,
  CancelShipmentPayload,
  RejectSelectionPayload,
  StartTransitPayload,
  ConfirmDeliveryPayload,
  TransporterShipmentSelection,
  SelectionStatus,
  AppNotification,
  Rating,
  RatingPayload,
} from '../types/shipment';

const SHIPMENTS_BASE = '/api/shipments/';

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

/** Cancelar un envío (Cliente/Admin) */
export const cancelShipment = (
  id: string,
  payload: CancelShipmentPayload,
): Promise<Shipment> =>
  apiRequest<Shipment>(`${SHIPMENTS_BASE}${id}/cancel/`, {
    method: 'POST',
    body: payload,
  });

// ─── Cloudinary ─────────────────────────────────────────────────────────────

/** Obtener firma de Cloudinary para signed uploads seguros */
export const fetchCloudinarySignature = (): Promise<CloudinarySignatureResponse> =>
  apiRequest<CloudinarySignatureResponse>(`${SHIPMENTS_BASE}cloudinary-signature/`, {
    method: 'POST',
    body: {},
  });

// ─── Available Transporters ─────────────────────────────────────────────────



// ─── Transporter Actions ────────────────────────────────────────────────────

/** Obtener envíos asignados al transportista actual, opcionalmente filtrados por estado. */
export const fetchTransporterSelections = (
  status?: SelectionStatus,
): Promise<TransporterShipmentSelection[]> => {
  const url = status ? `${SHIPMENTS_BASE}transporter/?status=${status}` : `${SHIPMENTS_BASE}transporter/`;
  return apiRequest<TransporterShipmentSelection[]>(url);
};

/** Obtener detalle de una selección específica del transportista. */
export const fetchTransporterSelectionById = (
  id: string,
): Promise<TransporterShipmentSelection> =>
  apiRequest<TransporterShipmentSelection>(`${SHIPMENTS_BASE}transporter/${id}/`);

/** Aceptar una selección asignada. */
export const acceptSelection = (id: string): Promise<TransporterShipmentSelection> =>
  apiRequest<TransporterShipmentSelection>(`${SHIPMENTS_BASE}transporter/${id}/accept/`, {
    method: 'POST',
    body: {},
  });

/** Rechazar una selección asignada con motivo de rechazo. */
export const rejectSelection = (
  id: string,
  payload: RejectSelectionPayload,
): Promise<TransporterShipmentSelection> =>
  apiRequest<TransporterShipmentSelection>(`${SHIPMENTS_BASE}transporter/${id}/reject/`, {
    method: 'POST',
    body: payload,
  });

/** Iniciar tránsito de un envío aceptado. */
export const startTransit = (
  id: string,
  payload: StartTransitPayload,
): Promise<TransporterShipmentSelection> =>
  apiRequest<TransporterShipmentSelection>(`${SHIPMENTS_BASE}transporter/${id}/start-transit/`, {
    method: 'POST',
    body: payload,
  });

/** Confirmar la entrega de un envío en tránsito. */
export const confirmDelivery = (
  id: string,
  payload: ConfirmDeliveryPayload,
): Promise<TransporterShipmentSelection> =>
  apiRequest<TransporterShipmentSelection>(`${SHIPMENTS_BASE}transporter/${id}/confirm-delivery/`, {
    method: 'POST',
    body: payload,
  });

// ─── Notifications ───────────────────────────────────────────────────────────

/** Obtener notificaciones del cliente autenticado. */
export const fetchNotifications = (): Promise<AppNotification[]> =>
  apiRequest<AppNotification[]>('/api/notifications/');

/** Marcar una notificación como leída. */
export const markNotificationRead = (id: string): Promise<AppNotification> =>
  apiRequest<AppNotification>(`/api/notifications/${id}/read/`, {
    method: 'PATCH',
    body: {},
  });

/** Marcar todas las notificaciones como leídas. */
export const markAllNotificationsRead = (): Promise<{ detail: string }> =>
  apiRequest<{ detail: string }>('/api/notifications/read-all/', {
    method: 'PATCH',
    body: {},
  });

/** Obtener el contador de notificaciones no leídas. */
export const fetchUnreadCount = (): Promise<{ unread_count: number }> =>
  apiRequest<{ unread_count: number }>('/api/notifications/unread-count/');


// ─── Ratings ─────────────────────────────────────────────────────────────────

/** Enviar calificación del cliente para un envío entregado. */
export const submitRating = (payload: RatingPayload): Promise<Rating> =>
  apiRequest<Rating>('/api/ratings/', {
    method: 'POST',
    body: payload,
  });

// ─── Client Profile ──────────────────────────────────────────────────────────

export interface ClientProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  avatar_url?: string | null;
  dni?: string | null;
  address?: string | null;
  average_rating: number | null;
}

export const fetchClientProfile = (id: string): Promise<ClientProfile> =>
  apiRequest<ClientProfile>(`/api/clients/${id}/`);

export const patchClientProfile = (
  id: string,
  payload: Partial<
    Pick<
      ClientProfile,
      | 'full_name'
      | 'phone'
      | 'avatar_url'
      | 'dni'
      | 'address'
    >
  >,
): Promise<ClientProfile> =>
  apiRequest<ClientProfile>(`/api/clients/${id}/`, {
    method: 'PATCH',
    body: payload,
  });

