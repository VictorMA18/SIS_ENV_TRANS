/**
 * Store Zustand para notificaciones y calificaciones del cliente.
 *
 * - Consulta las notificaciones no leídas al montar el dashboard.
 * - Expone la notificación RATING_REQUEST pendiente para mostrar el modal.
 * - Al calificar: envía el rating y marca la notificación como leída.
 */

import { create } from 'zustand';
import type { AppNotification, RatingPayload } from '../types/shipment';
import {
  fetchNotifications as fetchNotificationsApi,
  markNotificationRead as markNotificationReadApi,
  submitRating as submitRatingApi,
} from '../lib/shipment-api';
import { ApiError } from '../lib/api';
import { formatApiError } from '../lib/shipment-utils';

// ─── State ──────────────────────────────────────────────────────────────────

interface NotificationState {
  notifications: AppNotification[];
  /** Notificación RATING_REQUEST activa (sin leer), si existe. */
  pendingRatingNotification: AppNotification | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  /** true si el modal de calificación está visible */
  ratingModalOpen: boolean;
}

interface NotificationActions {
  fetchNotifications: () => Promise<void>;
  openRatingModal: () => void;
  closeRatingModal: () => void;
  submitRating: (payload: RatingPayload) => Promise<void>;
  clearError: () => void;
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useNotificationStore = create<NotificationState & NotificationActions>(
  (set, get) => ({
    notifications: [],
    pendingRatingNotification: null,
    isLoading: false,
    isSubmitting: false,
    error: null,
    ratingModalOpen: false,

    fetchNotifications: async () => {
      set({ isLoading: true, error: null });
      try {
        const notifications = await fetchNotificationsApi();

        // Buscar la primera notificación RATING_REQUEST no leída
        const pending = notifications.find(
          (n) =>
            !n.is_read &&
            n.metadata?.type === 'RATING_REQUEST' &&
            n.metadata?.shipment_id,
        ) ?? null;

        set({
          notifications,
          pendingRatingNotification: pending,
          isLoading: false,
          // Abrir el modal automáticamente si hay una notificación pendiente
          ratingModalOpen: pending !== null,
        });
      } catch (err) {
        const message =
          err instanceof ApiError
            ? formatApiError(err.data)
            : 'Error al cargar notificaciones.';
        set({ isLoading: false, error: message });
      }
    },

    openRatingModal: () => set({ ratingModalOpen: true }),
    closeRatingModal: () => set({ ratingModalOpen: false }),

    submitRating: async (payload) => {
      set({ isSubmitting: true, error: null });
      try {
        await submitRatingApi(payload);

        // Marcar la notificación como leída en el backend
        const { pendingRatingNotification } = get();
        if (pendingRatingNotification) {
          await markNotificationReadApi(pendingRatingNotification.id);
        }

        set({
          isSubmitting: false,
          ratingModalOpen: false,
          pendingRatingNotification: null,
        });
      } catch (err) {
        const message =
          err instanceof ApiError
            ? formatApiError(err.data)
            : 'Error al enviar la calificación.';
        set({ isSubmitting: false, error: message });
        throw err;
      }
    },

    clearError: () => set({ error: null }),
  }),
);
