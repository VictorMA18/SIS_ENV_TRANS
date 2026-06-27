/**
 * Hook: useNotifications
 *
 * Arquitectura híbrida V2: REST (historial) + WebSocket (push en tiempo real).
 *
 * Reemplaza los hooks obsoletos:
 *   - useNotificationPolling.ts  (polling GET cada 15s)
 *   - useTransporterNotifications.ts  (WS legacy a ws/shipments/notifications/)
 *
 * Características:
 *   - Carga inicial vía REST (store.fetchNotifications).
 *   - WebSocket nativo a ws/notifications/?token=<JWT> (endpoint universal).
 *   - Reconexión automática con backoff exponencial (1s → 2s → 4s → ... → 30s máx).
 *   - Prevención de memory leaks con mountedRef + cleanup en useEffect return.
 *   - Deduplicación de notificaciones vía store.addNotification.
 *   - Estado de conexión vía store.setConnected.
 */

import { useEffect, useRef } from 'react';
import { getAccessToken } from '../lib/auth-storage';
import { useNotificationStore } from '../stores/useNotificationStore';
import type { AppNotification } from '../types/shipment';

// ─── Configuración ──────────────────────────────────────────────────────────

/**
 * Base URL del WebSocket.
 * En desarrollo, Vite hace de proxy y redirige /ws/ → Django :8000
 * (ver vite.config.ts → server.proxy).
 * En producción, apuntar a la URL real del backend con VITE_WS_URL.
 */
const WS_BASE_URL: string =
  import.meta.env.VITE_WS_URL ??
  `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;

/** Tope máximo del backoff de reconexión (30 segundos). */
const MAX_RECONNECT_DELAY = 30_000;

// ─── Interfaz ───────────────────────────────────────────────────────────────

interface UseNotificationsOptions {
  /** Si es false, no se conecta el WebSocket ni se cargan notificaciones. */
  enabled: boolean;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useNotifications({ enabled }: UseNotificationsOptions): void {
  // Refs para control seguro de ciclo de vida
  const mountedRef = useRef<boolean>(true);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef<number>(0);

  // Acciones de la store (estables — no causan re-render)
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const setConnected = useNotificationStore((s) => s.setConnected);
  const addNotification = useNotificationStore((s) => s.addNotification);

  useEffect(() => {
    if (!enabled) return;

    mountedRef.current = true;

    // ── REST: Carga inicial de historial + badge count ──────────────────
    fetchNotifications();

    // ── WebSocket: Conexión persistente + Reconexión automática ─────────

    const connectWebSocket = () => {
      // No conectar si el componente se desmontó
      if (!mountedRef.current) return;

      // Obtener token fresco en cada intento de conexión
      const token = getAccessToken();
      if (!token) {
        // Sin token, no hay nada que conectar.
        // Se reintentará cuando el hook se re-monte con enabled=true.
        return;
      }

      // Limpiar conexión previa si existiera
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      const wsUrl = `${WS_BASE_URL}/ws/notifications/?token=${token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // ── onopen ────────────────────────────────────────────────────────
      ws.onopen = () => {
        if (!mountedRef.current) return;

        reconnectAttemptRef.current = 0; // Reset backoff
        setConnected(true);

        console.info('[useNotifications] WebSocket conectado');
      };

      // ── onmessage ─────────────────────────────────────────────────────
      ws.onmessage = (event: MessageEvent) => {
        if (!mountedRef.current) return;

        try {
          const data = JSON.parse(event.data as string) as {
            type: string;
            notification?: AppNotification;
          };

          if (data.type === 'new_notification' && data.notification) {
            addNotification(data.notification);
          }
          // Ignorar otros tipos de mensaje (pong, etc.)
        } catch (parseError) {
          console.error(
            '[useNotifications] Error parseando mensaje WS:',
            parseError,
          );
        }
      };

      // ── onclose ───────────────────────────────────────────────────────
      ws.onclose = (event: CloseEvent) => {
        if (!mountedRef.current) return;

        setConnected(false);
        wsRef.current = null;

        // No reconectar si fue un cierre intencional del servidor
        // 4001 = token inválido o ausente
        if (event.code === 4001) {
          console.warn(
            '[useNotifications] Conexión rechazada (4001): Token inválido',
          );
          return;
        }

        // Reconexión con backoff exponencial: 1s → 2s → 4s → 8s → ... → 30s
        const attempt = reconnectAttemptRef.current;
        const delay = Math.min(1000 * 2 ** attempt, MAX_RECONNECT_DELAY);
        reconnectAttemptRef.current = attempt + 1;

        console.info(
          `[useNotifications] Reconectando en ${delay / 1000}s (intento ${attempt + 1})`,
        );

        reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
      };

      // ── onerror ───────────────────────────────────────────────────────
      ws.onerror = () => {
        // El evento error siempre precede a onclose, la reconexión se
        // maneja allí. Solo loggear para debugging.
        console.error('[useNotifications] Error en WebSocket');
      };
    };

    connectWebSocket();

    // ── Cleanup: Desmonte seguro — cierra WS y cancela reconexiones ─────
    return () => {
      mountedRef.current = false;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      setConnected(false);
    };
  }, [enabled, fetchNotifications, setConnected, addNotification]);
}
