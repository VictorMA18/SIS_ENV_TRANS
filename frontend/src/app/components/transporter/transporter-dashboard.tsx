import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  CheckCircle, Star, Package, Truck, TrendingUp, Check, X,
  ChevronDown, ArrowRight, MapPin, Activity, FileText, Camera,
  AlertTriangle, Loader2, Coins, Calendar, Clock, Sparkles, Bell
} from 'lucide-react';
import { useTransporterNotifications } from '../../hooks/useTransporterNotifications';
import { useAuth } from '../../context/auth';
import { useShipmentListStore } from '../../stores/useShipmentListStore';
import {
  fetchTransporterProfile,
  patchTransporterProfile,
  TransporterProfile
} from '../../lib/transporter-api';
import {
  formatShipmentDate,
  getInitials,
  getAvatarColor,
  formatApiError
} from '../../lib/shipment-utils';
import { ApiError } from '../../lib/api';
import type { TransporterShipmentSelection } from '../../types/shipment';
import { useNotificationPolling } from '../../hooks/useNotificationPolling';


const STATUS_CFG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  REGISTRADO: { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-400', label: 'Registrado' },
  SELECCIONADO: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Seleccionado' },
  ACEPTADO: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500', label: 'Asignado' },
  EN_TRANSITO: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'En tránsito' },
  ENTREGADO: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', label: 'Entregado' },
  CANCELADO: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: 'Cancelado' },
};

export function TransporterDashboard() {
  const { user } = useAuth();
  const {
    transporterSelections,
    isLoading: isStoreLoading,
    error: storeError,
    fetchTransporterSelections,
    acceptTransporterSelection,
    rejectTransporterSelection,
    startTransporterTransit,
    confirmTransporterDelivery,
    clearError
  } = useShipmentListStore();

  // Transporter profile states
  const [profile, setProfile] = useState<TransporterProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Modal / Interaction states
  const [selectedSelection, setSelectedSelection] = useState<TransporterShipmentSelection | null>(null);

  // Polling de notificaciones periódico seguro
  useNotificationPolling({ enabled: true });
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [startingTransitId, setStartingTransitId] = useState<string | null>(null);
  const [transitLocation, setTransitLocation] = useState('');

  const [deliveringId, setDeliveringId] = useState<string | null>(null);
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Dropdown states for active shipment action menus
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Estado del banner de notificación
  const [notification, setNotification] = useState<string | null>(null);
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load data on mount
  useEffect(() => {
    if (user?.id) {
      loadProfile();
      fetchTransporterSelections();
    }
  }, [user?.id, fetchTransporterSelections]);

  // --- Notificaciones en tiempo real ---
  const handleNewShipment = useCallback(({ message }: { shipmentId: string; message: string }) => {
    // Refrescar la lista automáticamente
    fetchTransporterSelections();
    // Mostrar banner por 8 segundos
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    setNotification(message);
    notifTimerRef.current = setTimeout(() => setNotification(null), 8000);
  }, [fetchTransporterSelections]);

  useTransporterNotifications({
    enabled: user?.role === 'transporter',
    onNewShipment: handleNewShipment,
  });

  // Limpiar timer al desmontar
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
    } catch (err: unknown) {
      setProfileError('No se pudo cargar el perfil del transportista.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Toggle availability status
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

  // Selections list derived from store state
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

  // Actions execution wrapper
  const handleAccept = async (id: string) => {
    clearError();
    try {
      await acceptTransporterSelection(id);
      fetchTransporterSelections(); // Refresh to catch updated state
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async () => {
    if (!rejectingId) return;
    clearError();
    try {
      await rejectTransporterSelection(rejectingId, rejectionReason.trim() || undefined);
      setRejectingId(null);
      setRejectionReason('');
      fetchTransporterSelections();
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartTransit = async () => {
    if (!startingTransitId) return;
    clearError();
    try {
      await startTransporterTransit(startingTransitId, transitLocation.trim());
      setStartingTransitId(null);
      setTransitLocation('');
      setOpenMenuId(null);
      fetchTransporterSelections();
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!deliveringId) return;
    clearError();
    try {
      await confirmTransporterDelivery(
        deliveringId,
        deliveryLocation.trim(),
        undefined,
        undefined,
        deliveryNotes.trim() || undefined
      );
      setDeliveringId(null);
      setDeliveryLocation('');
      setDeliveryNotes('');
      setOpenMenuId(null);
      fetchTransporterSelections();
      // Reload profile to update completed shipments count and rating
      loadProfile();
    } catch (e) {
      console.error(e);
    }
  };

  const isLoading = profileLoading || isStoreLoading;

  return (
    <div className="p-5 lg:p-7" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] mb-0.5">
            Hola, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-400 text-sm">
            Panel de transportista · {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Availability toggle */}
        {profile && (
          <button
            onClick={handleToggleAvailability}
            disabled={profileLoading}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-[12px] border-2 transition-all hover:scale-[1.02] ${
              profile.is_available ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'
            }`}
          >
            {profileLoading ? (
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            ) : (
              <div className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${profile.is_available ? 'bg-green-500' : 'bg-gray-200'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${profile.is_available ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            )}
            <div className="text-left">
              <p className={`text-xs font-bold leading-tight ${profile.is_available ? 'text-green-700' : 'text-gray-500'}`}>
                {profile.is_available ? 'Disponible' : 'No disponible'}
              </p>
              <p className="text-[10px] text-gray-400">Estado de asignaciones</p>
            </div>
          </button>
        )}
      </div>

      {/* Banner de notificación en tiempo real */}
      {notification && (
        <div className="mb-5 flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-[14px] shadow-sm animate-pulse-once">
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Bell className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-indigo-800">Nueva solicitud de envío</p>
            <p className="text-xs text-indigo-600">{notification} — la lista ya fue actualizada.</p>
          </div>
          <button
            onClick={() => { setNotification(null); if (notifTimerRef.current) clearTimeout(notifTimerRef.current); }}
            className="text-indigo-400 hover:text-indigo-700 transition-colors p-1"
            aria-label="Cerrar notificación"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Displays */}
      {(profileError || storeError) && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[12px] flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800">Ha ocurrido un problema</p>
            <p className="text-xs text-red-655">{profileError || storeError}</p>
          </div>
          <button
            onClick={() => { setProfileError(null); clearError(); }}
            className="ml-auto text-xs font-bold text-red-600 hover:underline"
          >
            Descartar
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
        {[
          {
            label: 'Envíos completados',
            value: profile?.completed_shipments ?? 0,
            icon: CheckCircle,
            color: '#10B981',
            iconBg: 'bg-green-100',
            trend: 'Historial completo'
          },
          {
            label: 'Calificación promedio',
            value: profile?.average_rating ? Number(profile.average_rating).toFixed(1) : '—',
            icon: Star,
            color: '#F59E0B',
            iconBg: 'bg-amber-100',
            trend: profile?.average_rating ? 'Opiniones de clientes' : 'Sin calificaciones aún'
          },
          {
            label: 'Solicitudes pendientes',
            value: pendingRequests.length,
            icon: Package,
            color: '#F97316',
            iconBg: 'bg-orange-100',
            trend: 'Nuevas propuestas'
          },
          {
            label: 'Ingresos totales',
            value: `S/. ${totalEarnings.toFixed(2)}`,
            icon: TrendingUp,
            color: '#3B82F6',
            iconBg: 'bg-blue-100',
            trend: 'De envíos entregados'
          },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-[16px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 hover:shadow-[0_8px_28px_rgba(0,0,0,0.1)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-11 h-11 ${s.iconBg} rounded-[12px] flex items-center justify-center`}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-[#0F172A] mb-1">{s.value}</div>
            <div className="text-xs text-gray-500 mb-1.5 font-medium">{s.label}</div>
            <div className="text-[10px] text-gray-400 font-medium">{s.trend}</div>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        {/* Pending requests */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-[#0F172A] font-bold text-base">Solicitudes Pendientes</h2>
                <p className="text-gray-400 text-xs mt-0.5">{pendingRequests.length} solicitudes de envío esperando respuesta</p>
              </div>
              {pendingRequests.length > 0 && (
                <span className="bg-orange-100 text-[#F97316] text-xs font-bold px-2.5 py-1.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> {pendingRequests.length} nuevas
                </span>
              )}
            </div>

            {pendingRequests.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                  <Package className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-gray-500 font-bold text-sm">No hay solicitudes pendientes</p>
                <p className="text-gray-450 text-xs mt-1">Los envíos que te soliciten los clientes aparecerán aquí.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {pendingRequests.map(sel => (
                  <div key={sel.id} className="p-5 hover:bg-gray-50/30 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold bg-orange-50 text-[#F97316] border border-orange-100 px-2.5 py-0.5 rounded-[6px]">
                            ID: {sel.shipment.id.substring(0, 8).toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Cliente: <span className="text-[#0F172A] font-bold">{sel.shipment.client.full_name}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-extrabold text-[#F97316] flex items-center gap-1 justify-end">
                          <Coins className="w-4 h-4 text-amber-500" /> S/. {Number(sel.shipment.price).toFixed(2)}
                        </p>
                        <p className="text-[10px] text-gray-400">Pago propuesto</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-5 bg-gray-50/50 rounded-[12px] p-4 border border-gray-100">
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Origen</p>
                        <p className="text-xs text-[#0F172A] font-bold mt-0.5">{sel.shipment.origin_address}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Destino</p>
                        <p className="text-xs text-[#0F172A] font-bold mt-0.5 flex items-center gap-1">
                          <ArrowRight className="w-3.5 h-3.5 text-[#F97316] flex-shrink-0" />
                          {sel.shipment.destination_address}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Detalles de Carga</p>
                        <p className="text-xs text-[#0F172A] mt-0.5 font-medium">
                          {sel.shipment.description || 'Sin descripción'}
                          {(sel.shipment.weight_kg || sel.shipment.volume_m3) && (
                            <span className="text-gray-450 ml-1">
                              ({sel.shipment.weight_kg ? `${sel.shipment.weight_kg}kg` : ''}
                              {sel.shipment.weight_kg && sel.shipment.volume_m3 ? ' / ' : ''}
                              {sel.shipment.volume_m3 ? `${sel.shipment.volume_m3}m³` : ''})
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Entrega Programada</p>
                        <p className="text-xs text-[#0F172A] mt-0.5 font-semibold">
                          {formatShipmentDate(sel.shipment.scheduled_delivery_at)}
                        </p>
                      </div>
                      {sel.shipment.notes && (
                        <div className="col-span-2">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Notas del Cliente</p>
                          <p className="text-xs text-gray-600 mt-0.5 italic">"{sel.shipment.notes}"</p>
                        </div>
                      )}
                      {sel.shipment.url_images && sel.shipment.url_images.length > 0 && (
                        <div className="col-span-2">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Imágenes</p>
                          <div className="flex gap-1.5">
                            {sel.shipment.url_images.map((url, i) => (
                              <a href={url} target="_blank" rel="noreferrer" key={url} className="w-14 h-10 border border-gray-200 rounded-[6px] overflow-hidden bg-white">
                                <img src={url} alt={`Carga ${i}`} className="w-full h-full object-cover" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAccept(sel.id)}
                        disabled={isLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-500 text-white rounded-[10px] text-xs font-bold hover:bg-green-600 transition-all hover:scale-[1.02] shadow-md shadow-green-200 disabled:opacity-50"
                      >
                        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Aceptar Solicitud
                      </button>
                      <button
                        onClick={() => setRejectingId(sel.id)}
                        disabled={isLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-white border border-red-200 text-red-500 rounded-[10px] text-xs font-bold hover:bg-red-50 transition-all hover:scale-[1.02] disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" /> Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Active Shipments */}
        <div className="space-y-5">
          <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-[#0F172A] font-bold text-sm">Mis Envíos Activos</h2>
              <p className="text-gray-400 text-xs mt-0.5">{activeShipments.length} envíos asignados en curso</p>
            </div>

            {activeShipments.length === 0 ? (
              <div className="p-10 text-center">
                <Truck className="w-10 h-10 text-gray-250 mx-auto mb-3" />
                <p className="text-gray-450 text-xs font-bold">Sin envíos activos</p>
                <p className="text-[10px] text-gray-400 mt-1">Acepta solicitudes para iniciar rutas.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {activeShipments.map(sel => {
                  const cfg = STATUS_CFG[sel.shipment.status] || STATUS_CFG.ACEPTADO;
                  const isOpen = openMenuId === sel.id;
                  return (
                    <div key={sel.id} className="p-4 hover:bg-gray-50/20 transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-xs font-bold text-[#0F172A]">
                            ID: {sel.shipment.id.substring(0, 8).toUpperCase()}
                          </p>
                          <p className="text-[10px] text-gray-455 mt-0.5">Cliente: {sel.shipment.client.full_name}</p>
                        </div>
                        <span className="text-xs font-bold text-[#F97316]">S/. {Number(sel.shipment.price).toFixed(2)}</span>
                      </div>

                      <div className="text-[11px] text-gray-500 mb-3 bg-gray-50/70 p-2.5 rounded-[8px] border border-gray-100">
                        <p className="font-bold flex items-center gap-1 mb-1">
                          <span className="text-green-500">●</span> {sel.shipment.origin_address}
                        </p>
                        <p className="font-bold flex items-center gap-1">
                          <span className="text-red-400">●</span> {sel.shipment.destination_address}
                        </p>
                      </div>

                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(isOpen ? null : sel.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-[10px] border text-xs font-bold transition-all ${cfg.bg} ${cfg.text}`}
                          style={{ borderColor: 'transparent' }}
                        >
                          <span className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /> {cfg.label}
                          </span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-[10px] shadow-[0_8px_24px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden z-20">
                              {sel.shipment.status === 'ACEPTADO' && (
                                <button
                                  onClick={() => {
                                    setStartingTransitId(sel.id);
                                    setTransitLocation(sel.shipment.origin_address); // default location
                                  }}
                                  className="w-full text-left px-3 py-2.5 text-xs text-[#0F172A] hover:bg-gray-50 transition-colors flex items-center gap-2 font-bold"
                                >
                                  <Truck className="w-3.5 h-3.5 text-amber-500" />
                                  Iniciar Tránsito
                                </button>
                              )}
                              {sel.shipment.status === 'EN_TRANSITO' && (
                                <button
                                  onClick={() => {
                                    setDeliveringId(sel.id);
                                    setDeliveryLocation(sel.shipment.destination_address); // default location
                                  }}
                                  className="w-full text-left px-3 py-2.5 text-xs text-[#0F172A] hover:bg-gray-50 transition-colors flex items-center gap-2 font-bold"
                                >
                                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                  Confirmar Entrega
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedSelection(sel);
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left px-3 py-2.5 text-xs text-gray-500 hover:bg-gray-50 transition-colors flex items-center gap-2 border-t border-gray-100"
                              >
                                <FileText className="w-3.5 h-3.5 text-gray-400" />
                                Ver Ficha Completa
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Monthly stats card */}
          <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-[16px] p-5 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
            <TrendingUp className="w-7 h-7 text-[#F97316] mb-3" />
            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Ingresos del mes</h3>
            <p className="text-3xl font-extrabold mb-1">S/. {totalEarnings.toFixed(2)}</p>
            <p className="text-slate-400 text-[10px] mb-4">Calculado de envíos entregados con éxito.</p>
            <div className="space-y-2 border-t border-slate-800 pt-3">
              <div className="flex justify-between text-xs items-center">
                <span className="text-slate-450">Servicios Realizados</span>
                <span className="text-white font-bold">{completedShipments.length}</span>
              </div>
              <div className="flex justify-between text-xs items-center">
                <span className="text-slate-455">Tarifa Promedio</span>
                <span className="text-white font-bold">
                  S/. {completedShipments.length > 0 ? (totalEarnings / completedShipments.length).toFixed(2) : '0.00'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED SHIPMENT MODAL */}
      {selectedSelection && (
        <div className="fixed inset-0 bg-[#0F172A]/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-[20px] shadow-2xl max-w-lg w-full p-6 border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <h3 className="text-base font-extrabold text-[#0F172A]">
                Ficha del Envío {selectedSelection.shipment.id.substring(0, 8).toUpperCase()}
              </h3>
              <button
                onClick={() => setSelectedSelection(null)}
                className="p-1 hover:bg-gray-100 rounded-full transition-all text-gray-455"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Route */}
              <div className="bg-gray-50 rounded-[12px] p-4 border border-gray-100">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#F97316]" /> Ruta del Envío
                </h4>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-[#0F172A]">
                    <span className="text-green-500 font-extrabold mr-1">Origen:</span>
                    {selectedSelection.shipment.origin_address}
                  </p>
                  <p className="text-xs font-bold text-[#0F172A]">
                    <span className="text-red-500 font-extrabold mr-1">Destino:</span>
                    {selectedSelection.shipment.destination_address}
                  </p>
                </div>
              </div>

              {/* Cargo Details */}
              <div className="bg-gray-50 rounded-[12px] p-4 border border-gray-100">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-[#F97316]" /> Detalles de Carga
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-455 block">Descripción</span>
                    <span className="font-bold text-[#0F172A]">{selectedSelection.shipment.description || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-455 block">Precio Propuesto</span>
                    <span className="font-bold text-[#0F172A]">S/. {Number(selectedSelection.shipment.price).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-455 block">Peso</span>
                    <span className="font-bold text-[#0F172A]">{selectedSelection.shipment.weight_kg ? `${selectedSelection.shipment.weight_kg} kg` : '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-455 block">Volumen</span>
                    <span className="font-bold text-[#0F172A]">{selectedSelection.shipment.volume_m3 ? `${selectedSelection.shipment.volume_m3} m³` : '—'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-455 block">Programado Para</span>
                    <span className="font-bold text-[#0F172A]">{formatShipmentDate(selectedSelection.shipment.scheduled_delivery_at)}</span>
                  </div>
                </div>
              </div>

              {/* Images */}
              {selectedSelection.shipment.url_images && selectedSelection.shipment.url_images.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Imágenes de la Carga</h4>
                  <div className="flex gap-2">
                    {selectedSelection.shipment.url_images.map((url: string, i: number) => (
                      <a href={url} target="_blank" rel="noreferrer" key={url} className="w-20 h-16 border border-gray-200 rounded-[8px] overflow-hidden hover:scale-105 transition-all">
                        <img src={url} alt={`Carga ${i}`} className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedSelection.shipment.notes && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-[10px] text-xs">
                  <span className="font-bold text-blue-700 block mb-1">Notas especiales</span>
                  <p className="text-[#0F172A] italic">"{selectedSelection.shipment.notes}"</p>
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedSelection(null)}
                className="px-5 py-2 bg-[#F97316] text-white rounded-[10px] text-xs font-bold hover:bg-[#ea6b0e] transition-all"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectingId && (
        <div className="fixed inset-0 bg-[#0F172A]/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-[20px] shadow-2xl max-w-md w-full p-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <h3 className="text-lg font-extrabold text-[#0F172A]">Rechazar Solicitud</h3>
            </div>
            <p className="text-gray-455 text-sm mb-4">
              ¿Estás seguro de que deseas rechazar este envío? Por favor indica el motivo.
            </p>
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Motivo del Rechazo
              </label>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Escribe el motivo del rechazo aquí..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-205 rounded-[10px] text-sm resize-none focus:outline-none focus:border-red-400"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setRejectingId(null); setRejectionReason(''); }}
                className="px-4 py-2 border border-gray-200 rounded-[10px] text-sm font-bold text-gray-550 hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={isLoading}
                className="px-4 py-2 bg-red-500 text-white rounded-[10px] text-sm font-bold hover:bg-red-600 transition-all shadow-md shadow-red-200"
              >
                {isLoading ? 'Rechazando...' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* START TRANSIT MODAL */}
      {startingTransitId && (
        <div className="fixed inset-0 bg-[#0F172A]/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-[20px] shadow-2xl max-w-md w-full p-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-6 h-6 text-amber-500" />
              <h3 className="text-lg font-extrabold text-[#0F172A]">Iniciar Tránsito</h3>
            </div>
            <p className="text-gray-455 text-sm mb-4">
              Confirma tu ubicación inicial para registrar el inicio del despacho.
            </p>
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Ubicación Inicial
              </label>
              <input
                type="text"
                value={transitLocation}
                onChange={e => setTransitLocation(e.target.value)}
                placeholder="Ej: Lince, Lima"
                className="w-full px-3 py-2 border border-gray-205 rounded-[10px] text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setStartingTransitId(null); setTransitLocation(''); }}
                className="px-4 py-2 border border-gray-200 rounded-[10px] text-sm font-bold text-gray-550 hover:bg-gray-50 transition-all"
              >
                Volver
              </button>
              <button
                onClick={handleStartTransit}
                disabled={isLoading || !transitLocation.trim()}
                className="px-4 py-2 bg-amber-500 text-white rounded-[10px] text-sm font-bold hover:bg-amber-600 transition-all shadow-md shadow-amber-200 disabled:opacity-50"
              >
                {isLoading ? 'Cargando...' : 'Iniciar Ruta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELIVERY MODAL */}
      {deliveringId && (
        <div className="fixed inset-0 bg-[#0F172A]/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-[20px] shadow-2xl max-w-md w-full p-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <h3 className="text-lg font-extrabold text-[#0F172A]">Confirmar Entrega</h3>
            </div>
            <p className="text-gray-455 text-sm mb-4">
              Completa los datos de recepción del pedido para cerrar el envío.
            </p>
            <div className="space-y-3.5 mb-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Ubicación de la Entrega
                </label>
                <input
                  type="text"
                  value={deliveryLocation}
                  onChange={e => setDeliveryLocation(e.target.value)}
                  placeholder="Ej: San Isidro, Lima"
                  className="w-full px-3 py-2 border border-gray-205 rounded-[10px] text-sm focus:outline-none focus:border-green-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Notas de Entrega (opcional)
                </label>
                <textarea
                  value={deliveryNotes}
                  onChange={e => setDeliveryNotes(e.target.value)}
                  placeholder="Ej: Recibido por el vigilante en portería..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-205 rounded-[10px] text-sm resize-none focus:outline-none focus:border-green-400"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setDeliveringId(null); setDeliveryLocation(''); setDeliveryNotes(''); }}
                className="px-4 py-2 border border-gray-200 rounded-[10px] text-sm font-bold text-gray-550 hover:bg-gray-50 transition-all"
              >
                Volver
              </button>
              <button
                onClick={handleConfirmDelivery}
                disabled={isLoading || !deliveryLocation.trim()}
                className="px-4 py-2 bg-green-500 text-white rounded-[10px] text-sm font-bold hover:bg-green-600 transition-all shadow-md shadow-green-200 disabled:opacity-50"
              >
                {isLoading ? 'Guardando...' : 'Confirmar Entrega'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
