import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  CheckCircle, Star, Package, Truck, TrendingUp, ChevronRight,
  AlertTriangle, Loader2, Coins, Bell, X
} from 'lucide-react';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useAuth } from '../../context/auth';
import { useShipmentListStore } from '../../stores/useShipmentListStore';
import {
  fetchTransporterProfile,
  patchTransporterProfile,
  TransporterProfile
} from '../../lib/transporter-api';
import { ApiError } from '../../lib/api';
import type { AppNotification } from '../../types/shipment';

export function TransporterDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    transporterSelections,
    isLoading: isStoreLoading,
    error: storeError,
    fetchTransporterSelections,
    clearError
  } = useShipmentListStore();

  // Transporter profile states
  const [profile, setProfile] = useState<TransporterProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Push notification banner state
  const [notification, setNotification] = useState<string | null>(null);
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Suscripción a la store unificada de notificaciones (WebSocket push)
  const storeNotifications = useNotificationStore((s) => s.notifications);
  const prevNotifCountRef = useRef<number>(0);

  // Load data on mount
  useEffect(() => {
    if (user?.id) {
      loadProfile();
      fetchTransporterSelections();
    }
  }, [user?.id, fetchTransporterSelections]);

  // Reactivo a notificaciones push
  useEffect(() => {
    if (prevNotifCountRef.current === 0) {
      prevNotifCountRef.current = storeNotifications.length;
      return;
    }

    if (storeNotifications.length > prevNotifCountRef.current) {
      const latest = storeNotifications[0] as AppNotification | undefined;
      const metaType = latest?.metadata?.type;
      const transporterTypes = ['SHIPMENT_CREATED', 'TRANSPORTER_SELECTED', 'DELIVERY_CONFIRMED', 'SHIPMENT_CANCELLED'];

      if (latest && transporterTypes.includes(metaType ?? '')) {
        fetchTransporterSelections();
        if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
        setNotification(latest.message);
        notifTimerRef.current = setTimeout(() => setNotification(null), 8000);
      }
    }

    prevNotifCountRef.current = storeNotifications.length;
  }, [storeNotifications, fetchTransporterSelections]);

  useEffect(() => () => {
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
  }, []);

  const loadProfile = async () => {
    if (!user?.id) return;
    setProfileLoading(true);
    setProfileError(null);
    try {
      const data = await fetchTransporterProfile(user.id);
      setProfile(data);
    } catch {
      setProfileError('No se pudo cargar el perfil del transportista.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleToggleAvailability = async () => {
    if (!profile) return;
    const nextVal = !profile.is_available;
    setProfileError(null);
    clearError();

    try {
      const updated = await patchTransporterProfile(profile.id, {
        is_available: nextVal,
      });
      setProfile(updated);
    } catch (err: unknown) {
      const data = err instanceof ApiError ? err.data : null;
      const msg = data && typeof data === 'object' && 'is_available' in data
        ? (data as Record<string, unknown>).is_available
        : 'Error al actualizar disponibilidad.';
      setProfileError(Array.isArray(msg) ? msg[0] : String(msg));
    }
  };

  // Selections stats derived from store state
  const pendingRequests = useMemo(() => {
    return transporterSelections.filter(sel => sel.status === 'PENDIENTE');
  }, [transporterSelections]);

  const activeShipments = useMemo(() => {
    return transporterSelections.filter(
      sel => sel.status === 'ACEPTADO' && sel.shipment.status !== 'ENTREGADO' && sel.shipment.status !== 'CANCELADO'
    );
  }, [transporterSelections]);

  const completedShipments = useMemo(() => {
    return transporterSelections.filter(
      sel => sel.status === 'ACEPTADO' && sel.shipment.status === 'ENTREGADO'
    );
  }, [transporterSelections]);

  const totalEarnings = useMemo(() => {
    return completedShipments.reduce((sum, sel) => sum + Number(sel.shipment.price), 0);
  }, [completedShipments]);

  return (
    <div className="p-5 lg:p-7">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#0F172A] text-white px-5 py-4 rounded-[16px] shadow-2xl flex items-center gap-3 border border-slate-800 animate-slide-in-up max-w-sm">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Bell className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-blue-400 font-bold uppercase tracking-wider">Nueva Notificación</p>
            <p className="text-xs font-semibold text-slate-200 mt-0.5 truncate">{notification}</p>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-500 hover:text-slate-300">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] mb-0.5">¡Hola, {user?.name}! 👋</h1>
          <p className="text-gray-400 text-sm">Este es el resumen de tu actividad como Transportista.</p>
        </div>

        {/* Toggle disponibilidad */}
        {profile && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] shadow-sm">
            <span className="text-xs font-bold text-gray-500">¿Disponible para envíos?</span>
            <button
              onClick={handleToggleAvailability}
              className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
                profile.is_available ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${
                  profile.is_available ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        )}
      </div>

      {/* Errors */}
      {(storeError || profileError) && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[12px] flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800">Ha ocurrido un problema</p>
            <p className="text-xs text-red-600">{storeError || profileError}</p>
          </div>
          <button onClick={clearError} className="ml-auto text-xs font-bold text-red-600 hover:underline">Descartar</button>
        </div>
      )}

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Ganancias */}
        <div className="bg-white rounded-[20px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 relative overflow-hidden group hover:scale-[1.01] transition-all">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl" />
          <div className="w-10 h-10 rounded-[12px] bg-emerald-50 flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Ingresos Totales</p>
          <h3 className="text-[#0F172A] font-extrabold text-2xl mt-1">S/. {totalEarnings.toFixed(2)}</h3>
        </div>

        {/* Entregados */}
        <div className="bg-white rounded-[20px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 relative overflow-hidden group hover:scale-[1.01] transition-all">
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/5 rounded-full blur-xl" />
          <div className="w-10 h-10 rounded-[12px] bg-green-50 flex items-center justify-center mb-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Entregas Exitosas</p>
          <h3 className="text-[#0F172A] font-extrabold text-2xl mt-1">{completedShipments.length}</h3>
        </div>

        {/* Rutas Activas */}
        <div className="bg-white rounded-[20px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 relative overflow-hidden group hover:scale-[1.01] transition-all cursor-pointer" onClick={() => navigate('/app/transporter/active-routes')}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 rounded-full blur-xl" />
          <div className="w-10 h-10 rounded-[12px] bg-indigo-50 flex items-center justify-center mb-3">
            <Truck className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">En Curso</p>
          <h3 className="text-[#0F172A] font-extrabold text-2xl mt-1">{activeShipments.length}</h3>
        </div>

        {/* Solicitudes Pendientes */}
        <div className="bg-white rounded-[20px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 relative overflow-hidden group hover:scale-[1.01] transition-all cursor-pointer" onClick={() => navigate('/app/transporter/requests')}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/5 rounded-full blur-xl" />
          <div className="w-10 h-10 rounded-[12px] bg-orange-50 flex items-center justify-center mb-3">
            <Package className="w-5 h-5 text-[#F97316]" />
          </div>
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Solicitudes</p>
          <h3 className="text-[#0F172A] font-extrabold text-2xl mt-1">{pendingRequests.length}</h3>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Seccion Resumen Rutas Activas */}
        <div className="bg-white rounded-[20px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50">
              <h2 className="text-[#0F172A] font-extrabold text-sm flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-500" /> Rutas Activas
              </h2>
              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                {activeShipments.length} rutas
              </span>
            </div>

            {isStoreLoading && (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin text-[#F97316]" />
              </div>
            )}

            {!isStoreLoading && activeShipments.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p className="text-xs font-medium">No tienes rutas activas en este momento.</p>
              </div>
            )}

            {!isStoreLoading && activeShipments.length > 0 && (
              <div className="space-y-3">
                {activeShipments.slice(0, 3).map(sel => (
                  <div key={sel.id} className="text-xs p-3 bg-gray-50 rounded-[10px] border border-gray-100">
                    <div className="flex justify-between font-bold text-[#0F172A] mb-1">
                      <span>ID: {sel.shipment.id.substring(0, 8).toUpperCase()}</span>
                      <span className="text-[#F97316]">S/. {Number(sel.shipment.price).toFixed(2)}</span>
                    </div>
                    <div className="text-gray-500 truncate">
                      <span className="text-green-500">●</span> {sel.shipment.origin_address}
                    </div>
                    <div className="text-gray-500 truncate mt-0.5">
                      <span className="text-red-400">●</span> {sel.shipment.destination_address}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/app/transporter/active-routes')}
            className="w-full mt-4 flex items-center justify-center gap-1 py-2 bg-indigo-50 hover:bg-indigo-100/70 text-indigo-700 font-bold text-xs rounded-[10px] transition-all"
          >
            Gestionar mis rutas <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Seccion Resumen Solicitudes */}
        <div className="bg-white rounded-[20px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50">
              <h2 className="text-[#0F172A] font-extrabold text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-[#F97316]" /> Solicitudes Pendientes
              </h2>
              <span className="text-[10px] font-bold bg-orange-50 text-[#F97316] px-2 py-0.5 rounded-full">
                {pendingRequests.length} solicitudes
              </span>
            </div>

            {isStoreLoading && (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin text-[#F97316]" />
              </div>
            )}

            {!isStoreLoading && pendingRequests.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p className="text-xs font-medium">No tienes solicitudes pendientes.</p>
              </div>
            )}

            {!isStoreLoading && pendingRequests.length > 0 && (
              <div className="space-y-3">
                {pendingRequests.slice(0, 3).map(sel => (
                  <div key={sel.id} className="text-xs p-3 bg-gray-50 rounded-[10px] border border-gray-100">
                    <div className="flex justify-between font-bold text-[#0F172A] mb-1">
                      <span>Cliente: {sel.shipment.client.full_name}</span>
                      <span className="text-[#F97316]">S/. {Number(sel.shipment.price).toFixed(2)}</span>
                    </div>
                    <div className="text-gray-500 truncate">
                      De: {sel.shipment.origin_address}
                    </div>
                    <div className="text-gray-500 truncate mt-0.5">
                      A: {sel.shipment.destination_address}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/app/transporter/requests')}
            className="w-full mt-4 flex items-center justify-center gap-1 py-2 bg-orange-50 hover:bg-orange-100/70 text-[#F97316] font-bold text-xs rounded-[10px] transition-all"
          >
            Ver todas las solicitudes <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      <style>{`
        @keyframes slide-in-up {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-in-up {
          animation: slide-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
