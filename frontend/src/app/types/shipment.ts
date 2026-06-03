/**
 * Tipos TypeScript para el módulo de envíos (Shipments).
 * Alineados con los contratos del backend (shipment_integration_guide.md).
 */

// ─── Enums ──────────────────────────────────────────────────────────────────

export type ShipmentStatus =
  | 'REGISTRADO'
  | 'SELECCIONADO'
  | 'ACEPTADO'
  | 'EN_TRANSITO'
  | 'ENTREGADO'
  | 'CANCELADO';

export type SelectionStatus =
  | 'PENDIENTE'
  | 'ACEPTADO'
  | 'RECHAZADO'
  | 'CANCELADO';

// ─── Nested entities ────────────────────────────────────────────────────────

export interface ClientNested {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  average_rating: number | null;
}

export interface TransporterMini {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  license_number: string | null;
  is_available: boolean;
  is_active: boolean;
  average_rating: number | null;
}

export interface ShipmentSelection {
  id: string;
  transporter: TransporterMini;
  status: SelectionStatus;
  responded_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShipmentTracking {
  id: string;
  status: ShipmentStatus;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  created_at: string;
}

// ─── Main entity ────────────────────────────────────────────────────────────

export interface Shipment {
  id: string;
  client: ClientNested;
  origin_address: string;
  destination_address: string;
  description: string | null;
  weight_kg: number | null;
  volume_m3: number | null;
  price: string;
  url_images: string[];
  status: ShipmentStatus;
  notes: string | null;
  is_active: boolean;
  scheduled_delivery_at: string | null;
  created_at: string;
  updated_at: string;
  selections: ShipmentSelection[];
  tracking_entries: ShipmentTracking[];
}

// ─── Available transporter (from /available-transporters/) ──────────────────

export interface AvailableTransporter {
  user: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
  };
  license_number: string | null;
  ruc: string | null;
  vehicle_description: string | null;
  is_available: boolean;
  is_active: boolean;
  completed_shipments: number;
  average_rating: number | null;
  created_at: string;
  updated_at: string;
}

// ─── Cloudinary Signature ──────────────────────────────────

export interface CloudinarySignatureResponse {
  signature: string;
  timestamp: number;
  api_key: string;
  cloud_name: string;
  folder: string;
}

// ─── Payloads ───────────────────────────────────────────────────────────────

export interface CreateShipmentPayload {
  origin_address: string;
  destination_address: string;
  description?: string;
  weight_kg?: number;
  volume_m3?: number;
  price: number;
  url_images?: string[];
  notes?: string;
  scheduled_delivery_at?: string; // ISO 8601 con offset
  transporter_id: string;
}

export interface UpdateShipmentPayload {
  origin_address?: string;
  destination_address?: string;
  description?: string;
  weight_kg?: number;
  volume_m3?: number;
  price?: number;
  url_images?: string[];
  notes?: string;
  scheduled_delivery_at?: string;
}

export interface CancelShipmentPayload {
  cancellation_reason?: string;
}

export interface RejectSelectionPayload {
  rejection_reason?: string;
}

export interface StartTransitPayload {
  location?: string;
  latitude?: number;
  longitude?: number;
}

export interface ConfirmDeliveryPayload {
  location?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

// ─── Transporter Dashboard Entities ──────────────────────────────────────────

export interface TransporterShipmentDetail {
  id: string;
  client: ClientNested;
  origin_address: string;
  destination_address: string;
  description: string | null;
  weight_kg: string | null;
  volume_m3: string | null;
  price: string;
  url_images: string[];
  status: ShipmentStatus;
  notes: string | null;
  is_active: boolean;
  scheduled_delivery_at: string | null;
  created_at: string;
  updated_at: string;
  tracking_entries: ShipmentTracking[];
}

export interface TransporterShipmentSelection {
  id: string;
  shipment: TransporterShipmentDetail;
  status: SelectionStatus;
  responded_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationMetadata {
  type?: string;
  shipment_id?: string;
  transporter_id?: string;
  action_url?: string;
  [key: string]: unknown;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  status: 'PENDIENTE' | 'ENVIADO' | 'FALLIDO' | string;
  metadata: NotificationMetadata;
  is_read: boolean;
  created_at: string;
}

// ─── Rating ─────────────────────────────────────────────────────────────────

export interface RatingPayload {
  shipment_id: string;
  score: number;      // 1 – 5
  comment?: string;
}

export interface Rating {
  id: string;
  shipment_id: string;
  reviewer_role: 'CLIENT' | 'TRANSPORTER' | string;
  score: number;
  comment: string | null;
  client_name: string;
  transporter_name: string;
  created_at: string;
  updated_at: string;
}
