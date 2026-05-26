/**
 * Store Zustand para el listado y detalle de envíos.
 * Usado por el dashboard y la página de tracking.
 */

import { create } from 'zustand';
import type { Shipment, UpdateShipmentPayload } from '../types/shipment';
import {
  fetchShipments as fetchShipmentsApi,
  fetchShipmentById as fetchShipmentByIdApi,
  patchShipment as patchShipmentApi,
} from '../lib/shipment-api';
import { ApiError } from '../lib/api';
import { formatApiError } from '../lib/shipment-utils';

// ─── State ──────────────────────────────────────────────────────────────────

interface ShipmentListState {
  /** Lista de envíos del usuario. */
  shipments: Shipment[];

  /** Envío individual cargado para detalle/tracking. */
  currentShipment: Shipment | null;

  /** Indica si hay una operación de carga en curso. */
  isLoading: boolean;

  /** Mensaje de error para mostrar al usuario. */
  error: string | null;
}

// ─── Actions ────────────────────────────────────────────────────────────────

interface ShipmentListActions {
  /** Cargar la lista de envíos del usuario autenticado. */
  fetchShipments: () => Promise<void>;

  /** Cargar el detalle de un envío por ID. */
  fetchShipmentById: (id: string) => Promise<void>;

  /** Actualizar parcialmente un envío (solo estados tempranos). */
  updateShipment: (id: string, payload: Partial<UpdateShipmentPayload>) => Promise<void>;

  /** Limpiar el envío actual del detalle. */
  clearCurrentShipment: () => void;

  /** Limpiar errores. */
  clearError: () => void;
}

// ─── Initial state ──────────────────────────────────────────────────────────

const initialState: ShipmentListState = {
  shipments: [],
  currentShipment: null,
  isLoading: false,
  error: null,
};

// ─── Store ──────────────────────────────────────────────────────────────────

export const useShipmentListStore = create<ShipmentListState & ShipmentListActions>(
  (set, get) => ({
    ...initialState,

    fetchShipments: async () => {
      set({ isLoading: true, error: null });

      try {
        const shipments = await fetchShipmentsApi();
        set({ shipments, isLoading: false });
      } catch (err) {
        const message =
          err instanceof ApiError
            ? formatApiError(err.data)
            : 'Error al cargar los envíos.';
        set({ isLoading: false, error: message });
      }
    },

    fetchShipmentById: async (id) => {
      set({ isLoading: true, error: null, currentShipment: null });

      try {
        const shipment = await fetchShipmentByIdApi(id);
        set({ currentShipment: shipment, isLoading: false });
      } catch (err) {
        const message =
          err instanceof ApiError
            ? formatApiError(err.data)
            : 'Error al cargar el detalle del envío.';
        set({ isLoading: false, error: message });
      }
    },

    updateShipment: async (id, payload) => {
      set({ isLoading: true, error: null });

      try {
        const updated = await patchShipmentApi(id, payload);

        // Actualizar tanto en la lista como en el detalle
        set((state) => ({
          isLoading: false,
          currentShipment:
            state.currentShipment?.id === id ? updated : state.currentShipment,
          shipments: state.shipments.map((s) => (s.id === id ? updated : s)),
        }));
      } catch (err) {
        const message =
          err instanceof ApiError
            ? formatApiError(err.data)
            : 'Error al actualizar el envío.';
        set({ isLoading: false, error: message });
      }
    },

    clearCurrentShipment: () => set({ currentShipment: null }),
    clearError: () => set({ error: null }),
  }),
);
