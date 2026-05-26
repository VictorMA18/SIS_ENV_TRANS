/**
 * Store Zustand para el stepper de creación de envíos.
 * Maneja el flujo de 3 pasos: datos del envío → selección de transportista → confirmación.
 */

import { create } from 'zustand';
import type { AvailableTransporter, Shipment } from '../types/shipment';
import {
  createShipment,
  fetchAvailableTransporters as fetchTransportersApi,
} from '../lib/shipment-api';
import { ApiError } from '../lib/api';
import { formatApiError } from '../lib/shipment-utils';

// ─── Step 1 payload ─────────────────────────────────────────────────────────

export interface Step1Data {
  origin_address: string;
  destination_address: string;
  description?: string;
  weight_kg?: number;
  volume_m3?: number;
  notes?: string;
  scheduled_delivery_at?: string; // ISO 8601
}

// ─── State ──────────────────────────────────────────────────────────────────

interface ShipmentStoreState {
  /** Paso actual del stepper (1, 2 o 3). */
  currentStep: 1 | 2 | 3;

  /** Datos del formulario del paso 1. */
  step1Data: Step1Data | null;

  /** Transportistas disponibles cargados del API. */
  availableTransporters: AvailableTransporter[];

  /** ID del transportista seleccionado en el paso 2. */
  selectedTransporterId: string | null;

  /** Envío creado exitosamente (paso 3). */
  createdShipment: Shipment | null;

  /** Indica si hay una operación en curso. */
  isLoading: boolean;

  /** Mensaje de error para mostrar al usuario. */
  error: string | null;
}

// ─── Actions ────────────────────────────────────────────────────────────────

interface ShipmentStoreActions {
  goToStep: (step: 1 | 2 | 3) => void;
  setStep1Data: (data: Step1Data) => void;
  fetchAvailableTransporters: (
    originDistrict?: string,
    destinationDistrict?: string,
  ) => Promise<void>;
  selectTransporter: (transporterId: string) => void;
  submitShipment: () => Promise<void>;
  resetStore: () => void;
  clearError: () => void;
}

// ─── Initial state ──────────────────────────────────────────────────────────

const initialState: ShipmentStoreState = {
  currentStep: 1,
  step1Data: null,
  availableTransporters: [],
  selectedTransporterId: null,
  createdShipment: null,
  isLoading: false,
  error: null,
};

// ─── Store ──────────────────────────────────────────────────────────────────

export const useShipmentStore = create<ShipmentStoreState & ShipmentStoreActions>(
  (set, get) => ({
    ...initialState,

    // ── Navegación ──────────────────────────────────────────────────────

    goToStep: (step) => set({ currentStep: step, error: null }),

    // ── Paso 1: Guardar datos del formulario ────────────────────────────

    setStep1Data: (data) =>
      set({
        step1Data: data,
        currentStep: 2,
        error: null,
      }),

    // ── Paso 2: Cargar transportistas disponibles ───────────────────────

    fetchAvailableTransporters: async (originDistrict, destinationDistrict) => {
      set({ isLoading: true, error: null });

      try {
        const transporters = await fetchTransportersApi(
          originDistrict,
          destinationDistrict,
        );
        set({ availableTransporters: transporters, isLoading: false });
      } catch (err) {
        const message =
          err instanceof ApiError
            ? formatApiError(err.data)
            : 'Error al cargar transportistas.';
        set({ isLoading: false, error: message });
      }
    },

    // ── Paso 2: Seleccionar transportista ───────────────────────────────

    selectTransporter: (transporterId) =>
      set({
        selectedTransporterId: transporterId,
        currentStep: 3,
        error: null,
      }),

    // ── Paso 3: Enviar payload unificado al backend ─────────────────────

    submitShipment: async () => {
      const { step1Data, selectedTransporterId } = get();

      if (!step1Data || !selectedTransporterId) {
        set({ error: 'Datos incompletos. Completa los pasos anteriores.' });
        return;
      }

      set({ isLoading: true, error: null });

      try {
        const createdShipment = await createShipment({
          ...step1Data,
          transporter_id: selectedTransporterId,
        });

        set({
          createdShipment,
          isLoading: false,
          // Limpiar datos del formulario para futuros usos
          step1Data: null,
          selectedTransporterId: null,
          availableTransporters: [],
        });
      } catch (err) {
        const message =
          err instanceof ApiError
            ? formatApiError(err.data)
            : 'Error desconocido al crear el envío.';
        set({ isLoading: false, error: message });
      }
    },

    // ── Reset ───────────────────────────────────────────────────────────

    resetStore: () => set({ ...initialState }),
    clearError: () => set({ error: null }),
  }),
);
