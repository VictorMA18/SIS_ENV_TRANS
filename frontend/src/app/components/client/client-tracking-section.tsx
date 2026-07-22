import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  MapPin, Loader2, Inbox, ArrowRight, Eye, Truck, Package,
} from 'lucide-react';
import { useShipmentListStore } from '../../stores/useShipmentListStore';
import { getStatusConfig, formatShipmentDate } from '../../lib/shipment-utils';
import type { ShipmentStatus } from '../../types/shipment';

// ─── Badge ──────────────────────────────────────────────────────────────────

function Badge({ status }: { status: ShipmentStatus }) {
  const c = getStatusConfig(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ClientTrackingSection() {
  const navigate = useNavigate();
  const { shipments, isLoading, fetchShipments } = useShipmentListStore();

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  // Envíos activos con tracking relevante: EN_TRANSITO primero, luego ACEPTADO
  const activeShipments = useMemo(() => {
    return shipments
      .filter(s => ['ACEPTADO', 'EN_TRANSITO'].includes(s.status))
      .sort((a, b) => {
        // EN_TRANSITO primero
        if (a.status === 'EN_TRANSITO' && b.status !== 'EN_TRANSITO') return -1;
        if (b.status === 'EN_TRANSITO' && a.status !== 'EN_TRANSITO') return 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
  }, [shipments]);

  return (
    <div className="p-5 lg:p-7">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] mb-0.5">Seguimiento</h1>
          <p className="text-gray-400 text-sm">Monitorea el progreso de tus envíos activos en tiempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-xs font-bold border border-amber-100">
            <Truck className="w-3.5 h-3.5" />
            {activeShipments.filter(s => s.status === 'EN_TRANSITO').length} en tránsito
          </span>
        </div>
      </div>

      {/* Loading */}
      {isLoading && activeShipments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#F97316] mb-3" />
          <p className="text-sm">Cargando envíos...</p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && activeShipments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <MapPin className="w-12 h-12 mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">Sin envíos activos para rastrear</p>
          <p className="text-xs text-gray-400 mt-1">Tus envíos en tránsito aparecerán aquí</p>
        </div>
      )}

      {/* Cards Grid */}
      {activeShipments.length > 0 && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {activeShipments.map(s => {
            const latestTracking = s.tracking_entries[s.tracking_entries.length - 1];
            const acceptedSel = s.selections.find(sel => sel.status === 'ACEPTADO');
            const transporterName = acceptedSel?.transporter.full_name ?? '—';
            const isTransit = s.status === 'EN_TRANSITO';

            return (
              <div
                key={s.id}
                className={`bg-white rounded-[16px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] border transition-all hover:shadow-[0_8px_28px_rgba(0,0,0,0.1)] cursor-pointer group ${
                  isTransit ? 'border-amber-200' : 'border-gray-100'
                }`}
                onClick={() => navigate(`/app/client/tracking/${s.id}`)}
              >
                {/* Status Badge */}
                <div className="flex items-center justify-between mb-4">
                  <Badge status={s.status} />
                  <span className="text-[10px] text-gray-400 font-mono">
                    {s.id.substring(0, 8).toUpperCase()}
                  </span>
                </div>

                {/* Route */}
                <div className="space-y-2 mb-4 bg-gray-50 rounded-[10px] p-3 border border-gray-100">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                    <span className="text-[#0F172A] font-bold truncate">{s.origin_address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <ArrowRight className="w-2 h-2 text-[#F97316] flex-shrink-0" />
                    <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                    <span className="text-[#0F172A] font-bold truncate">{s.destination_address}</span>
                  </div>
                </div>

                {/* Transporter */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#0F172A] to-[#1E293B] flex items-center justify-center flex-shrink-0">
                    <Truck className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#0F172A] truncate">{transporterName}</p>
                    <p className="text-[10px] text-gray-400">Transportista asignado</p>
                  </div>
                </div>

                {/* Latest location */}
                {latestTracking?.location && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-[8px] border border-amber-100 mb-3">
                    <MapPin className="w-3 h-3 text-amber-500 flex-shrink-0" />
                    <span className="text-[11px] text-amber-700 font-medium truncate">{latestTracking.location}</span>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-[10px] text-gray-400">{formatShipmentDate(s.updated_at)}</span>
                  <span className="flex items-center gap-1 text-xs text-[#F97316] font-bold group-hover:underline">
                    <Eye className="w-3.5 h-3.5" />
                    Ver detalle
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
