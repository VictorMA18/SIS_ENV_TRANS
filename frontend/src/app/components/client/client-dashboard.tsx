import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Package, CheckCircle, Users, Star, Plus, TrendingUp, Eye, ArrowRight,
  MoreHorizontal, Loader2, AlertCircle, Inbox, Bell,
} from 'lucide-react';
import { useAuth } from '../../context/auth';
import { useShipmentListStore } from '../../stores/useShipmentListStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { getStatusConfig, formatShipmentDate, formatRelativeTime } from '../../lib/shipment-utils';
import type { ShipmentStatus, Shipment } from '../../types/shipment';
import { RatingModal } from './RatingModal';
import { useNotificationPolling } from '../../hooks/useNotificationPolling';
import { fetchClientProfile, type ClientProfile } from '../../lib/shipment-api';


// ─── Sub-components ─────────────────────────────────────────────────────────

function Badge({ status }: { status: ShipmentStatus }) {
  const c = getStatusConfig(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

// ─── Stats computation ──────────────────────────────────────────────────────

function computeStats(shipments: Shipment[]) {
  const active = shipments.filter(s =>
    ['REGISTRADO', 'SELECCIONADO', 'ACEPTADO', 'EN_TRANSITO'].includes(s.status),
  ).length;
  const delivered = shipments.filter(s => s.status === 'ENTREGADO').length;
  const cancelled = shipments.filter(s => s.status === 'CANCELADO').length;

  return { active, delivered, cancelled, total: shipments.length };
}

// ─── Main component ─────────────────────────────────────────────────────────

export function ClientDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { shipments, isLoading, error, fetchShipments, clearError } = useShipmentListStore();
  const {
    pendingRatingNotification,
    fetchNotifications,
    openRatingModal,
  } = useNotificationStore();

  const [profile, setProfile] = useState<ClientProfile | null>(null);

  // Activa el polling periódico seguro
  useNotificationPolling({ enabled: true });

  useEffect(() => {
    fetchShipments();
    fetchNotifications();

    if (user?.id) {
      fetchClientProfile(user.id)
        .then(setProfile)
        .catch((err: unknown) => console.error('Error loading client profile:', err));
    }
  }, [fetchShipments, fetchNotifications, user?.id]);

  const computed = useMemo(() => computeStats(shipments), [shipments]);

  // Derive recent activity from shipment tracking entries
  const recentActivity = useMemo(() => {
    const entries: { text: string; time: string; color: string }[] = [];

    for (const s of shipments) {
      // Latest selection status
      for (const sel of s.selections) {
        if (sel.status === 'ACEPTADO') {
          entries.push({
            text: `${sel.transporter.full_name} aceptó tu envío`,
            time: formatRelativeTime(sel.responded_at ?? sel.updated_at),
            color: 'bg-green-400',
          });
        }
      }
      // Latest tracking
      for (const t of s.tracking_entries.slice(-1)) {
        const cfg = getStatusConfig(t.status);
        entries.push({
          text: `Envío actualizado a "${cfg.label}"${t.location ? ` en ${t.location}` : ''}`,
          time: formatRelativeTime(t.created_at),
          color: cfg.dot,
        });
      }
    }

    return entries.slice(0, 5);
  }, [shipments]);

  const stats = [
    { label: 'Envíos activos', value: computed.active.toString(), icon: Package, color: '#F97316', iconBg: 'bg-orange-100', trend: `${computed.total} totales` },
    { label: 'Entregados', value: computed.delivered.toString(), icon: CheckCircle, color: '#10B981', iconBg: 'bg-green-100', trend: 'Completados' },
    { label: 'Total envíos', value: computed.total.toString(), icon: Users, color: '#3B82F6', iconBg: 'bg-blue-100', trend: 'Histórico' },
    { label: 'Cancelados', value: computed.cancelled.toString(), icon: Star, color: '#F59E0B', iconBg: 'bg-amber-100', trend: computed.cancelled === 0 ? '¡Excelente!' : '' },
  ];

  return (
    <div className="p-5 lg:p-7">
      {/* Rating modal — se renderiza sobre todo el contenido */}
      <RatingModal />

      {/* Banner de calificación pendiente */}
      {pendingRatingNotification && (
        <div
          className="mb-5 flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-[14px] shadow-sm"
          style={{ animation: 'slideDownFade 0.4s ease' }}
        >
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#0F172A] leading-tight">
              {pendingRatingNotification.title}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {pendingRatingNotification.message}
            </p>
          </div>
          <button
            onClick={openRatingModal}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-[#F97316] text-white rounded-[8px] text-xs font-bold hover:bg-[#ea6b0e] transition-all shadow-md shadow-orange-200"
          >
            <Star className="w-3.5 h-3.5 fill-white" />
            Calificar
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] mb-0.5">
            Hola, {user?.name?.split(' ')[0]} 👋
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <p className="text-gray-400 text-sm">Aquí está el resumen de tus envíos distritales</p>
            {profile?.average_rating !== undefined && profile?.average_rating !== null && (
              <>
                <span className="text-gray-300 text-xs">•</span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#F59E0B] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {Number(profile.average_rating).toFixed(2)} reputación cliente
                </span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={() => navigate('/app/client/new-shipment')}
          className="flex items-center gap-2 bg-[#F97316] text-white px-4 py-2.5 rounded-[10px] font-semibold text-sm hover:bg-[#ea6b0e] transition-all hover:scale-[1.02] shadow-md shadow-orange-200/80 flex-shrink-0 ml-4">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo Envío</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-[10px] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-700 font-medium">{error}</p>
            <button onClick={clearError} className="text-xs text-red-500 hover:underline mt-1">Cerrar</button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-[16px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.1)] transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-11 h-11 ${s.iconBg} rounded-[12px] flex items-center justify-center`}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-3xl font-extrabold text-[#0F172A] mb-1">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-gray-300" /> : s.value}
            </div>
            <div className="text-xs text-gray-500 mb-1.5 font-medium">{s.label}</div>
            <div className="text-xs text-green-500 font-medium">{s.trend}</div>
          </div>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid xl:grid-cols-3 gap-6">
        {/* Shipments table */}
        <div className="xl:col-span-2 bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-[#0F172A] font-bold text-base">Envíos Recientes</h2>
              <p className="text-gray-400 text-xs mt-0.5">Últimas solicitudes de envío</p>
            </div>
            <button
              onClick={() => fetchShipments()}
              className="text-xs text-[#F97316] hover:underline flex items-center gap-1 font-medium">
              Actualizar <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Loading */}
          {isLoading && shipments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#F97316] mb-3" />
              <p className="text-sm">Cargando envíos...</p>
            </div>
          )}

          {/* Empty */}
          {!isLoading && shipments.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Inbox className="w-12 h-12 mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">No tienes envíos aún</p>
              <p className="text-xs text-gray-400 mt-1">Crea tu primer envío para comenzar</p>
              <button onClick={() => navigate('/app/client/new-shipment')}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-[#F97316] text-white rounded-[8px] text-sm font-bold hover:bg-[#ea6b0e] transition-all shadow-md shadow-orange-200">
                <Plus className="w-4 h-4" /> Crear Envío
              </button>
            </div>
          )}

          {/* Table */}
          {shipments.length > 0 && (
            <>
              <div className="hidden md:grid grid-cols-[1.5fr_1.2fr_1fr_0.6fr] gap-4 px-5 py-2.5 bg-gray-50 border-b border-gray-100">
                {['Ruta', 'Transportista', 'Estado', 'Acción'].map(h => (
                  <span key={h} className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{h}</span>
                ))}
              </div>
              <div className="divide-y divide-gray-50">
                {shipments.slice(0, 10).map(s => {
                  const acceptedSel = s.selections.find(sel => sel.status === 'ACEPTADO' || sel.status === 'PENDIENTE');
                  const transporterName = acceptedSel?.transporter.full_name ?? '—';

                  return (
                    <div key={s.id} className="px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center justify-between md:grid md:grid-cols-[1.5fr_1.2fr_1fr_0.6fr] gap-4">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-[#0F172A] truncate">{s.origin_address}</div>
                          <div className="text-xs text-gray-500 mt-0.5 truncate">
                            <span className="text-green-600">●</span> {s.origin_address} → <span className="text-red-500">●</span> {s.destination_address}
                          </div>
                          <div className="text-[10px] text-gray-300 mt-0.5">
                            {formatShipmentDate(s.created_at)}{s.weight_kg ? ` · ${s.weight_kg} kg` : ''}
                          </div>
                        </div>
                        <div className="hidden md:block min-w-0">
                          <div className="text-sm text-[#0F172A] truncate">{transporterName}</div>
                        </div>
                        <div className="hidden md:flex items-center">
                          <Badge status={s.status} />
                        </div>
                        <div className="hidden md:flex items-center gap-1.5">
                          <button
                            onClick={() => navigate(`/app/client/tracking/${s.id}`)}
                            className="p-2 rounded-[8px] hover:bg-orange-50 text-gray-400 hover:text-[#F97316] transition-colors"
                            title="Ver seguimiento">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-2 rounded-[8px] hover:bg-gray-100 text-gray-400 transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                        {/* Mobile view */}
                        <div className="md:hidden flex flex-col items-end gap-1.5">
                          <Badge status={s.status} />
                          <button onClick={() => navigate(`/app/client/tracking/${s.id}`)}
                            className="text-xs text-[#F97316] font-medium">Ver →</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Monthly summary */}
          <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-5">
            <h3 className="text-[#0F172A] font-bold text-sm mb-4">Resumen general</h3>
            <div className="space-y-3">
              {[
                { label: 'Total envíos', value: computed.total.toString(), color: 'text-[#0F172A]' },
                { label: 'Completados', value: computed.delivered.toString(), color: 'text-green-600' },
                { label: 'En proceso', value: computed.active.toString(), color: 'text-amber-600' },
                { label: 'Cancelados', value: computed.cancelled.toString(), color: 'text-red-600' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-500">{item.label}</span>
                  <span className={`text-sm font-bold ${item.color}`}>{isLoading ? '...' : item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity */}
          <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-5">
            <h3 className="text-[#0F172A] font-bold text-sm mb-4">Actividad reciente</h3>
            <div className="space-y-3">
              {recentActivity.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">Sin actividad reciente</p>
              )}
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${a.color}`} />
                  <div>
                    <p className="text-xs text-[#0F172A] leading-relaxed">{a.text}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA card */}
          <div className="bg-gradient-to-br from-[#F97316] to-[#ea6b0e] rounded-[16px] p-5 text-white shadow-lg shadow-orange-200">
            <Package className="w-8 h-8 mb-3 opacity-90" />
            <h3 className="font-bold mb-1.5 text-base">¿Necesitas enviar algo?</h3>
            <p className="text-sm opacity-85 mb-4 leading-relaxed">Crea un envío en segundos y encuentra al transportista ideal en tu distrito.</p>
            <button
              onClick={() => navigate('/app/client/new-shipment')}
              className="flex items-center gap-2 bg-white text-[#F97316] text-sm font-bold px-4 py-2.5 rounded-[8px] hover:bg-orange-50 transition-all hover:scale-[1.02]">
              <Plus className="w-4 h-4" />
              Nuevo Envío
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
