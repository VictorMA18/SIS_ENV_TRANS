/**
 * Store Zustand para el listado y detalle de envíos.
 * Usado por el dashboard y la página de tracking.
 */

import { create } from 'zustand';
import type {
  Shipment,
  UpdateShipmentPayload,
  SelectionStatus,
  TransporterShipmentSelection,
} from '../types/shipment';
import {
  fetchShipments as fetchShipmentsApi,
  fetchShipmentById as fetchShipmentByIdApi,
  patchShipment as patchShipmentApi,
  cancelShipment as cancelShipmentApi,
  fetchTransporterSelections as fetchTransporterSelectionsApi,
  acceptSelection as acceptSelectionApi,
  rejectSelection as rejectSelectionApi,
  startTransit as startTransitApi,
  confirmDelivery as confirmDeliveryApi,
} from '../lib/shipment-api';
import { ApiError } from '../lib/api';
import { formatApiError } from '../lib/shipment-utils';

// ─── State ──────────────────────────────────────────────────────────────────

interface ShipmentListState {
  /** Lista de envíos del usuario (Cliente / Admin). */
  shipments: Shipment[];

  /** Lista de asignaciones/selecciones del transportista. */
  transporterSelections: TransporterShipmentSelection[];

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

  /** Cancelar un envío (Cliente). */
  cancelClientShipment: (id: string, reason?: string) => Promise<void>;

  /** Cargar la lista de asignaciones del transportista actual. */
  fetchTransporterSelections: (status?: SelectionStatus) => Promise<void>;

  /** Aceptar una asignación como transportista. */
  acceptTransporterSelection: (id: string) => Promise<void>;

  /** Rechazar una asignación como transportista. */
  rejectTransporterSelection: (id: string, reason?: string) => Promise<void>;

  /** Iniciar el tránsito de un envío aceptado. */
  startTransporterTransit: (
    id: string,
    location: string,
    latitude?: number,
    longitude?: number,
  ) => Promise<void>;

  /** Confirmar la entrega final de un envío. */
  confirmTransporterDelivery: (
    id: string,
    location: string,
    latitude?: number,
    longitude?: number,
    notes?: string,
  ) => Promise<void>;

  /** Limpiar el envío actual del detalle. */
  clearCurrentShipment: () => void;

  /** Limpiar errores. */
  clearError: () => void;
}

// ─── Initial state ──────────────────────────────────────────────────────────

const initialState: ShipmentListState = {
  shipments: [],
  transporterSelections: [],
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
        throw err;
      }
    },

    cancelClientShipment: async (id, reason) => {
      set({ isLoading: true, error: null });

      try {
        const updated = await cancelShipmentApi(id, { cancellation_reason: reason });

        // Actualizar en el estado
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
            : 'Error al cancelar el envío.';
        set({ isLoading: false, error: message });
        throw err;
      }
    },

    fetchTransporterSelections: async (status) => {
      set({ isLoading: true, error: null });

      try {
        const selections = await fetchTransporterSelectionsApi(status);
        set({ transporterSelections: selections, isLoading: false });
      } catch (err) {
        const message =
          err instanceof ApiError
            ? formatApiError(err.data)
            : 'Error al cargar las asignaciones.';
        set({ isLoading: false, error: message });
      }
    },

    acceptTransporterSelection: async (id) => {
      set({ isLoading: true, error: null });

      try {
        const updated = await acceptSelectionApi(id);

        set((state) => ({
          isLoading: false,
          transporterSelections: state.transporterSelections.map((sel) =>
            sel.id === id ? updated : sel,
          ),
        }));
      } catch (err) {
        const message =
          err instanceof ApiError
            ? formatApiError(err.data)
            : 'Error al aceptar la asignación.';
        set({ isLoading: false, error: message });
        throw err;
      }
    },

    rejectTransporterSelection: async (id, reason) => {
      set({ isLoading: true, error: null });

      try {
        const updated = await rejectSelectionApi(id, { rejection_reason: reason });

        set((state) => ({
          isLoading: false,
          transporterSelections: state.transporterSelections.map((sel) =>
            sel.id === id ? updated : sel,
          ),
        }));
      } catch (err) {
        const message =
          err instanceof ApiError
            ? formatApiError(err.data)
            : 'Error al rechazar la asignación.';
        set({ isLoading: false, error: message });
        throw err;
      }
    },

    startTransporterTransit: async (id, location, latitude, longitude) => {
      set({ isLoading: true, error: null });

      try {
        const updated = await startTransitApi(id, { location, latitude, longitude });

        set((state) => ({
          isLoading: false,
          transporterSelections: state.transporterSelections.map((sel) =>
            sel.id === id ? updated : sel,
          ),
        }));
      } catch (err) {
        const message =
          err instanceof ApiError
            ? formatApiError(err.data)
            : 'Error al iniciar tránsito.';
        set({ isLoading: false, error: message });
        throw err;
      }
    },

    confirmTransporterDelivery: async (id, location, latitude, longitude, notes) => {
      set({ isLoading: true, error: null });

      try {
        const updated = await confirmDeliveryApi(id, {
          location,
          latitude,
          longitude,
          notes,
        });

        set((state) => ({
          isLoading: false,
          transporterSelections: state.transporterSelections.map((sel) =>
            sel.id === id ? updated : sel,
          ),
        }));
      } catch (err) {
        const message =
          err instanceof ApiError
            ? formatApiError(err.data)
            : 'Error al confirmar la entrega.';
        set({ isLoading: false, error: message });
        throw err;
      }
    },

    clearCurrentShipment: () => set({ currentShipment: null }),
    clearError: () => set({ error: null }),
  }),
);

