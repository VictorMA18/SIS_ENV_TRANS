import { useEffect, useRef } from 'react';
import { useNotificationStore } from '../stores/useNotificationStore';

const POLL_INTERVAL = 15000; // 15 segundos

interface UseNotificationPollingOptions {
  enabled: boolean;
}

export function useNotificationPolling({ enabled }: UseNotificationPollingOptions): void {
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled) return;

    // Fetch inicial
    fetchNotifications();

    // Configurar polling
    const interval = setInterval(() => {
      if (mountedRef.current) {
        fetchNotifications();
      }
    }, POLL_INTERVAL);

    // Cleanup: evitar memory leaks y updates post-unmount
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [enabled, fetchNotifications]);
}
