/**
 * Utilidades compartidas para el módulo de envíos.
 * Centraliza formateo, mapeo de estados y helpers de UI.
 */

import type { ShipmentStatus } from '../types/shipment';

// ─── Status configuration ───────────────────────────────────────────────────

interface StatusConfig {
  label: string;
  bg: string;
  dot: string;
  text: string;
  color: string;
}

const STATUS_MAP: Record<ShipmentStatus, StatusConfig> = {
  REGISTRADO: {
    label: 'Registrado',
    bg: 'bg-gray-100',
    dot: 'bg-gray-400',
    text: 'text-gray-600',
    color: '#9CA3AF',
  },
  SELECCIONADO: {
    label: 'Seleccionado',
    bg: 'bg-blue-50',
    dot: 'bg-blue-500',
    text: 'text-blue-600',
    color: '#3B82F6',
  },
  ACEPTADO: {
    label: 'Aceptado',
    bg: 'bg-indigo-50',
    dot: 'bg-indigo-500',
    text: 'text-indigo-600',
    color: '#6366F1',
  },
  EN_TRANSITO: {
    label: 'En tránsito',
    bg: 'bg-amber-50',
    dot: 'bg-amber-500',
    text: 'text-amber-600',
    color: '#F59E0B',
  },
  ENTREGADO: {
    label: 'Entregado',
    bg: 'bg-green-50',
    dot: 'bg-green-500',
    text: 'text-green-600',
    color: '#10B981',
  },
  CANCELADO: {
    label: 'Cancelado',
    bg: 'bg-red-50',
    dot: 'bg-red-500',
    text: 'text-red-600',
    color: '#EF4444',
  },
};

/** Obtiene la configuración visual de un estado de envío. */
export const getStatusConfig = (status: ShipmentStatus): StatusConfig =>
  STATUS_MAP[status] ?? STATUS_MAP.REGISTRADO;

// ─── Editable check ─────────────────────────────────────────────────────────

const EDITABLE_STATUSES: ReadonlySet<ShipmentStatus> = new Set([
  'REGISTRADO',
  'SELECCIONADO',
]);

/** Determina si un envío es editable basado en su estado. */
export const isEditable = (status: ShipmentStatus): boolean =>
  EDITABLE_STATUSES.has(status);

// ─── Status ordering (for timeline) ─────────────────────────────────────────

const STATUS_ORDER: readonly ShipmentStatus[] = [
  'REGISTRADO',
  'SELECCIONADO',
  'ACEPTADO',
  'EN_TRANSITO',
  'ENTREGADO',
];

/** Retorna el índice ordinal de un estado (para la timeline). -1 si CANCELADO. */
export const getStatusIndex = (status: ShipmentStatus): number =>
  STATUS_ORDER.indexOf(status);

/** Retorna la lista ordenada de estados para la timeline. */
export const getStatusTimeline = () =>
  STATUS_ORDER.map((status) => ({
    status,
    ...getStatusConfig(status),
  }));

// ─── Date formatting ────────────────────────────────────────────────────────

/**
 * Formatea una fecha ISO a un formato legible.
 * Ejemplo: "03/05/2026 09:15"
 */
export const formatShipmentDate = (isoString: string | null | undefined): string => {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '—';

    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

/**
 * Formatea una fecha ISO a formato relativo corto.
 * Ejemplo: "Hace 5 min", "Hace 2 hrs", "Hace 3 días"
 */
export const formatRelativeTime = (isoString: string): string => {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60_000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes} min`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} ${hours === 1 ? 'hora' : 'hrs'}`;

    const days = Math.floor(hours / 24);
    return `Hace ${days} ${days === 1 ? 'día' : 'días'}`;
  } catch {
    return '—';
  }
};

// ─── Avatar helpers ─────────────────────────────────────────────────────────

/** Genera iniciales de un nombre completo (máx. 2 caracteres). */
export const getInitials = (name: string | null | undefined): string => {
  if (!name) return '??';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
};

/**
 * Genera un color determinístico basado en un string.
 * Usa una paleta predefinida para garantizar buen contraste.
 */
const AVATAR_COLORS = [
  '#0F172A', '#1E40AF', '#065F46', '#7C2D12',
  '#4C1D95', '#831843', '#1E3A5F', '#713F12',
  '#134E4A', '#581C87', '#1C1917', '#3730A3',
];

export const getAvatarColor = (name: string | null | undefined): string => {
  if (!name) return AVATAR_COLORS[0];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

// ─── Error formatting ───────────────────────────────────────────────────────

/**
 * Formatea un cuerpo de error de DRF a un mensaje legible.
 * Soporta tanto `{ field: [errors] }` como `{ detail: "..." }`.
 */
export const formatApiError = (data: unknown): string => {
  if (!data || typeof data !== 'object') return 'Error desconocido.';

  const record = data as Record<string, unknown>;

  // DRF detail string
  if (typeof record.detail === 'string') return record.detail;

  // DRF field errors: { field: ["error1", "error2"] }
  return Object.entries(record)
    .map(([field, errors]) => {
      const msgs = Array.isArray(errors) ? errors.join(', ') : String(errors);
      return `${field}: ${msgs}`;
    })
    .join(' | ');
};

/**
 * Convierte un string ISO UTC proveniente del Backend
 * a un formato legible en Hora Perú.
 */
export const formatToPeruTime = (isoString: string | null | undefined): string => {
  if (!isoString) return 'No programada';

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'No programada';

    return new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return 'No programada';
  }
};

/**
 * Construye un ISO String válido con offset fijo de Perú (-05:00)
 * a partir de los inputs separados de fecha y hora.
 */
export const buildPeruIsoString = (dateString: string, timeString: string): string => {
  // dateString: "2026-06-01"
  // timeString: "14:30"
  return `${dateString}T${timeString}:00-05:00`;
};

