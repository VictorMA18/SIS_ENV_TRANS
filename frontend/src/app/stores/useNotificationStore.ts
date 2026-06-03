/**
 * Store Zustand para notificaciones y calificaciones del cliente/transportista.
 */

import { create } from 'zustand';
import type { AppNotification, RatingPayload } from '../types/shipment';
import {
  fetchNotifications as fetchNotificationsApi,
  markNotificationRead as markNotificationReadApi,
  markAllNotificationsRead as markAllNotificationsReadApi,
  fetchUnreadCount as fetchUnreadCountApi,
  submitRating as submitRatingApi,
} from '../lib/shipment-api';
import { ApiError } from '../lib/api';
import { formatApiError } from '../lib/shipment-utils';

// ─── State ──────────────────────────────────────────────────────────────────

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
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
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  openRatingModal: () => void;
  closeRatingModal: () => void;
  submitRating: (payload: RatingPayload) => Promise<void>;
  clearError: () => void;
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useNotificationStore = create<NotificationState & NotificationActions>(
  (set, get) => ({
    notifications: [],
    unreadCount: 0,
    pendingRatingNotification: null,
    isLoading: false,
    isSubmitting: false,
    error: null,
    ratingModalOpen: false,

    fetchNotifications: async () => {
      set({ isLoading: true, error: null });
      try {
        const [notifications, countRes] = await Promise.all([
          fetchNotificationsApi(),
          fetchUnreadCountApi(),
        ]);

        // Buscar la primera notificación RATING_REQUEST no leída
        const pending = notifications.find(
          (n) =>
            !n.is_read &&
            n.metadata?.type === 'RATING_REQUEST' &&
            n.metadata?.shipment_id,
        ) ?? null;

        set({
          notifications,
          unreadCount: countRes?.unread_count ?? 0,
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

    markAsRead: async (id) => {
      try {
        await markNotificationReadApi(id);
        const { notifications, unreadCount } = get();
        set({
          notifications: notifications.map((n) =>
            n.id === id ? { ...n, is_read: true } : n
          ),
          unreadCount: Math.max(0, unreadCount - 1),
        });
      } catch (err) {
        // Silenciar error o registrarlo, no bloquear UI
        console.error('Error marking notification as read:', err);
      }
    },

    markAllAsRead: async () => {
      try {
        await markAllNotificationsReadApi();
        const { notifications } = get();
        set({
          notifications: notifications.map((n) => ({ ...n, is_read: true })),
          unreadCount: 0,
        });
      } catch (err) {
        console.error('Error marking all notifications as read:', err);
      }
    },

    openRatingModal: () => set({ ratingModalOpen: true }),
    closeRatingModal: () => set({ ratingModalOpen: false }),

    submitRating: async (payload) => {
      set({ isSubmitting: true, error: null });
      try {
        await submitRatingApi(payload);

        // Marcar la notificación como leída en el backend si existía una pendiente
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
