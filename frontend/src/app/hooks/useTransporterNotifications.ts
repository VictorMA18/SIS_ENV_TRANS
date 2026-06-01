/**
 * Hook: useTransporterNotifications
 *
 * Abre un canal WebSocket personal para el transportista autenticado.
 * Escucha mensajes del tipo "new_shipment" emitidos desde el backend
 * cuando un cliente crea un envío y lo asigna a este transportista.
 *
 * Uso:
 *   useTransporterNotifications({
 *     enabled: user?.role === 'TRANSPORTER',
 *     onNewShipment: ({ shipmentId, message }) => { ... }
 *   });
 */

import { useEffect, useRef } from 'react';
import { getAccessToken } from '../lib/auth-storage';

interface NewShipmentEvent {
  shipmentId: string;
  message: string;
}

interface UseTransporterNotificationsOptions {
  /** Si es false, el WebSocket no se abre (ej: usuario no es transportista) */
  enabled: boolean;
  /** Callback llamado cuando llega una notificación de nuevo envío */
  onNewShipment: (event: NewShipmentEvent) => void;
}

// En desarrollo, Vite hace de proxy y redirige /ws/ → Django :8000
// (ver vite.config.ts → server.proxy)
// En producción, apuntar a la URL real del backend con VITE_WS_URL
const WS_BASE =
  import.meta.env.VITE_WS_URL ||
  `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;

const RECONNECT_DELAY_MS = 3000;
const PING_INTERVAL_MS = 25000;

export function useTransporterNotifications({
  enabled,
  onNewShipment,
}: UseTransporterNotificationsOptions): void {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isUnmountedRef = useRef(false);

  // Guardamos el callback en un ref para no re-crear el WS si cambia
  const onNewShipmentRef = useRef(onNewShipment);
  onNewShipmentRef.current = onNewShipment;

  useEffect(() => {
    if (!enabled) return;
    isUnmountedRef.current = false;

    function clearTimers() {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
    }

    function connect() {
      if (isUnmountedRef.current) return;

      const token = getAccessToken();
      if (!token) return; // Sin token no conectar

      const url = `${WS_BASE}/ws/shipments/notifications/?token=${token}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        // Ping periódico para mantener la conexión viva
        pingTimerRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, PING_INTERVAL_MS);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_shipment') {
            onNewShipmentRef.current({
              shipmentId: data.shipment_id ?? '',
              message: data.message ?? 'Tienes una nueva solicitud de envío',
            });
          }
        } catch {
          // Mensaje malformado — ignorar
        }
      };

      ws.onclose = (event) => {
        clearTimers();
        // Reconectar automáticamente excepto si fue un cierre intencional (4001/4003)
        if (!isUnmountedRef.current && event.code !== 4001 && event.code !== 4003) {
          reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      isUnmountedRef.current = true;
      clearTimers();
      if (wsRef.current) {
        wsRef.current.onclose = null; // Evitar reconexión al desmontar
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled]);
}
