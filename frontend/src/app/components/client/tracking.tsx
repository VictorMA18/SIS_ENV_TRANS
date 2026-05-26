import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  MapPin, Truck, Package, CheckCircle, Clock, Star, ArrowLeft,
  Phone, MessageSquare, Loader2, AlertCircle,
} from 'lucide-react';
import { useShipmentListStore } from '../../stores/useShipmentListStore';
import {
  getStatusConfig, getStatusTimeline, getStatusIndex,
  formatShipmentDate, formatRelativeTime, getInitials, getAvatarColor,
} from '../../lib/shipment-utils';
import type { ShipmentTracking } from '../../types/shipment';

// ─── Icon mapping for timeline ──────────────────────────────────────────────

const STATUS_ICONS: Record<string, React.ElementType> = {
  REGISTRADO: Package,
  SELECCIONADO: Package,
  ACEPTADO: CheckCircle,
  EN_TRANSITO: Truck,
  ENTREGADO: CheckCircle,
};

// ─── Sub-components ─────────────────────────────────────────────────────────

function TrackingEvent({ entry, isLast }: { entry: ShipmentTracking; isLast: boolean }) {
  const cfg = getStatusConfig(entry.status);
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-0.5 ${cfg.dot}`} />
        {!isLast && <div className="w-0.5 flex-1 bg-gray-100 mt-1 mb-0" style={{ minHeight: '32px' }} />}
      </div>
      <div className={!isLast ? 'pb-4' : ''}>
        <p className="text-sm text-[#0F172A] leading-relaxed">
          {cfg.label}{entry.location ? ` — ${entry.location}` : ''}
        </p>
        {entry.notes && <p className="text-xs text-gray-500 mt-0.5">{entry.notes}</p>}
        <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
          {formatShipmentDate(entry.created_at)}
        </p>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function TrackingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentShipment, isLoading, error, fetchShipmentById, clearCurrentShipment } = useShipmentListStore();

  useEffect(() => {
    if (id) fetchShipmentById(id);
    return () => { clearCurrentShipment(); };
  }, [id, fetchShipmentById, clearCurrentShipment]);

  const timeline = useMemo(() => getStatusTimeline(), []);

  const currentStatusIndex = currentShipment
    ? getStatusIndex(currentShipment.status)
    : -1;

  const isCancelled = currentShipment?.status === 'CANCELADO';

  // Get the accepted transporter from selections
  const assignedTransporter = useMemo(() => {
    if (!currentShipment) return null;
    const accepted = currentShipment.selections.find(s => s.status === 'ACEPTADO');
    return accepted?.transporter ?? currentShipment.selections[0]?.transporter ?? null;
  }, [currentShipment]);

  // Sort tracking entries newest first for the event log
  const sortedTrackingEntries = useMemo(() => {
    if (!currentShipment) return [];
    return [...currentShipment.tracking_entries].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [currentShipment]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading && !currentShipment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full py-20">
        <Loader2 className="w-10 h-10 animate-spin text-[#F97316] mb-4" />
        <p className="text-sm text-gray-500 font-medium">Cargando envío...</p>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error && !currentShipment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full py-20">
        <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
        <p className="text-sm text-red-600 font-medium mb-2">{error}</p>
        <button onClick={() => navigate('/app/client/dashboard')}
          className="px-4 py-2 text-sm text-[#F97316] border border-orange-200 rounded-[8px] hover:bg-orange-50 transition-all">
          Volver al Dashboard
        </button>
      </div>
    );
  }

  if (!currentShipment) return null;

  const statusCfg = getStatusConfig(currentShipment.status);

  return (
    <div className="p-5 lg:p-7" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/app/client/dashboard')}
          className="p-2.5 rounded-[10px] hover:bg-gray-100 transition-colors text-gray-500 border border-gray-200">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-[#0F172A]">Seguimiento de envío</h1>
          <p className="text-gray-400 text-xs mt-0.5">
            {currentShipment.origin_address} → {currentShipment.destination_address}
          </p>
        </div>
        <div className={`ml-auto flex items-center gap-1.5 border rounded-full px-3 py-1.5 ${statusCfg.bg} ${statusCfg.text}`}
          style={{ borderColor: statusCfg.color + '40' }}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${statusCfg.dot}`} />
          <span className="text-xs font-bold">{statusCfg.label}</span>
        </div>
      </div>

      {/* Cancelled banner */}
      {isCancelled && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[12px] flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-700">Envío cancelado</p>
            <p className="text-xs text-red-500">Este envío ha sido cancelado y no puede ser modificado.</p>
          </div>
        </div>
      )}

      {/* Timeline */}
      {!isCancelled && (
        <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[#0F172A] font-bold text-sm">Estado del envío</h2>
            <span className="text-xs text-gray-400">
              Actualizado: {formatShipmentDate(currentShipment.updated_at)}
            </span>
          </div>

          {/* Desktop horizontal */}
          <div className="hidden md:flex items-start">
            {timeline.map((s, i) => {
              const done = i < currentStatusIndex;
              const active = i === currentStatusIndex;
              const Icon = STATUS_ICONS[s.status] || Package;
              const trackingEntry = currentShipment.tracking_entries.find(t => t.status === s.status);

              return (
                <div key={s.status} className="flex-1 flex flex-col items-center relative">
                  {i < timeline.length - 1 && (
                    <div className={`absolute top-[18px] left-1/2 w-full h-0.5 transition-all duration-700 ${i < currentStatusIndex ? 'bg-[#F97316]' : 'bg-gray-200'}`} />
                  )}
                  <div className={`relative z-10 w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                    done ? 'bg-[#F97316] border-[#F97316]'
                      : active ? 'bg-[#F97316] border-[#F97316] shadow-[0_0_0_8px_rgba(249,115,22,0.15)]'
                        : 'bg-white border-gray-200'
                  }`}>
                    {done ? <CheckCircle className="w-4 h-4 text-white" /> : <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-gray-300'}`} />}
                    {active && <div className="absolute inset-0 rounded-full border-2 border-[#F97316] animate-ping opacity-25" />}
                  </div>
                  <p className={`mt-2.5 text-xs font-bold text-center ${active ? 'text-[#F97316]' : done ? 'text-gray-500' : 'text-gray-300'}`}>{s.label}</p>
                  {trackingEntry && (
                    <p className="text-[10px] text-gray-400 mt-0.5 text-center">
                      {formatShipmentDate(trackingEntry.created_at)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile vertical */}
          <div className="md:hidden space-y-3">
            {timeline.map((s, i) => {
              const done = i < currentStatusIndex;
              const active = i === currentStatusIndex;
              const Icon = STATUS_ICONS[s.status] || Package;

              return (
                <div key={s.status} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    done ? 'bg-[#F97316] border-[#F97316]'
                      : active ? 'bg-[#F97316] border-[#F97316] shadow-[0_0_0_5px_rgba(249,115,22,0.15)]'
                        : 'bg-white border-gray-200'
                  }`}>
                    {done ? <CheckCircle className="w-4 h-4 text-white" /> : <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-gray-300'}`} />}
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${active ? 'text-[#F97316]' : done ? 'text-gray-600' : 'text-gray-400'}`}>{s.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="grid xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-5">
          {/* Details */}
          <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-5">
            <h3 className="text-[#0F172A] font-bold text-sm mb-4">Detalles del envío</h3>
            <div className="grid grid-cols-2 gap-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-green-50 rounded-[10px] flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">ORIGEN</p>
                  <p className="text-sm font-bold text-[#0F172A]">{currentShipment.origin_address}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-red-50 rounded-[10px] flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">DESTINO</p>
                  <p className="text-sm font-bold text-[#0F172A]">{currentShipment.destination_address}</p>
                </div>
              </div>
              {currentShipment.description && (
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">DESCRIPCIÓN</p>
                  <p className="text-sm font-semibold text-[#0F172A]">{currentShipment.description}</p>
                </div>
              )}
              {currentShipment.weight_kg && (
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">PESO</p>
                  <p className="text-sm font-semibold text-[#0F172A]">{currentShipment.weight_kg} kg</p>
                </div>
              )}
              {currentShipment.volume_m3 && (
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">VOLUMEN</p>
                  <p className="text-sm font-semibold text-[#0F172A]">{currentShipment.volume_m3} m³</p>
                </div>
              )}
              {currentShipment.scheduled_delivery_at && (
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">ENTREGA PROGRAMADA</p>
                  <p className="text-sm font-semibold text-[#0F172A]">{formatShipmentDate(currentShipment.scheduled_delivery_at)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Transporter */}
          {assignedTransporter && (
            <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-5">
              <h3 className="text-[#0F172A] font-bold text-sm mb-4">Transportista asignado</h3>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: getAvatarColor(assignedTransporter.full_name) }}>
                  <span className="text-white font-extrabold text-xl">
                    {getInitials(assignedTransporter.full_name)}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-[#0F172A] text-base">{assignedTransporter.full_name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i <= Math.floor(assignedTransporter.average_rating ?? 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                    ))}
                    <span className="text-xs text-gray-500 ml-1">
                      {assignedTransporter.average_rating?.toFixed(1) ?? '—'}
                    </span>
                  </div>
                  {assignedTransporter.license_number && (
                    <p className="text-xs text-gray-400 mt-0.5">Licencia: {assignedTransporter.license_number}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button className="w-10 h-10 bg-green-50 border border-green-100 rounded-[10px] flex items-center justify-center hover:bg-green-100 transition-colors">
                    <Phone className="w-4 h-4 text-green-600" />
                  </button>
                  <button className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-[10px] flex items-center justify-center hover:bg-blue-100 transition-colors">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Activity log */}
        <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-5 h-fit">
          <h3 className="text-[#0F172A] font-bold text-sm mb-5 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#F97316]" />
            Historial de eventos
          </h3>

          {sortedTrackingEntries.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">Sin eventos registrados</p>
          ) : (
            <div className="space-y-0">
              {sortedTrackingEntries.map((entry, i) => (
                <TrackingEvent
                  key={entry.id}
                  entry={entry}
                  isLast={i === sortedTrackingEntries.length - 1}
                />
              ))}
            </div>
          )}

          {currentShipment.scheduled_delivery_at && (
            <div className="mt-5 p-4 bg-orange-50 rounded-[12px] border border-orange-100">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-[#F97316]" />
                <p className="text-xs font-bold text-[#F97316]">Entrega programada</p>
              </div>
              <p className="text-base font-extrabold text-[#0F172A]">
                {formatShipmentDate(currentShipment.scheduled_delivery_at)}
              </p>
            </div>
          )}

          {currentShipment.notes && (
            <div className="mt-4 p-4 bg-blue-50 rounded-[12px] border border-blue-100">
              <p className="text-xs font-bold text-blue-600 mb-1">Notas del envío</p>
              <p className="text-sm text-[#0F172A]">{currentShipment.notes}</p>
            </div>
          )}

          <div className="mt-4 text-center">
            <p className="text-[10px] text-gray-400">
              Creado: {formatShipmentDate(currentShipment.created_at)}
            </p>
            <p className="text-[10px] text-gray-400">
              Última actualización: {formatRelativeTime(currentShipment.updated_at)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
