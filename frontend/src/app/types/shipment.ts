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

// ─── Payloads ───────────────────────────────────────────────────────────────

export interface CreateShipmentPayload {
  origin_address: string;
  destination_address: string;
  description?: string;
  weight_kg?: number;
  volume_m3?: number;
  notes?: string;
  scheduled_delivery_at?: string; // ISO 8601
  transporter_id: string;
}

export interface UpdateShipmentPayload {
  origin_address?: string;
  destination_address?: string;
  description?: string;
  weight_kg?: number;
  volume_m3?: number;
  notes?: string;
}
