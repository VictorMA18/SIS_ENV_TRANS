import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle, Star, Loader2, AlertTriangle, Search, Package,
  ArrowRight, Calendar,
} from 'lucide-react';
import { useAuth } from '../../context/auth';
import { useShipmentListStore } from '../../stores/useShipmentListStore';
import { fetchRatings } from '../../lib/shipment-api';
import { formatShipmentDate, getInitials, getAvatarColor } from '../../lib/shipment-utils';
import type { Rating } from '../../types/shipment';
import { RateClientModal } from './modals/rate-client-modal';

// ─── Main Component ─────────────────────────────────────────────────────────

export function TransporterHistorySection() {
  const { user } = useAuth();
  const {
    transporterSelections,
    isLoading,
    error: storeError,
    fetchTransporterSelections,
    clearError,
  } = useShipmentListStore();

  const [ratings, setRatings] = useState<Rating[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Rate client modal state
  const [ratingTarget, setRatingTarget] = useState<{
    shipmentId: string;
    clientName: string;
  } | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchTransporterSelections();
      loadRatings();
    }
  }, [user?.id, fetchTransporterSelections]);

  const loadRatings = async () => {
    setRatingsLoading(true);
    try {
      const data = await fetchRatings();
      setRatings(data);
    } catch {
      // Silently fail — ratings are supplementary
    } finally {
      setRatingsLoading(false);
    }
  };

  const completedShipments = useMemo(() => {
    return transporterSelections.filter(
      sel => sel.status === 'ACEPTADO' && sel.shipment.status === 'ENTREGADO'
    );
  }, [transporterSelections]);

  // Set of shipment IDs that have been rated by the transporter
  const ratedShipmentIds = useMemo(() => {
    return new Set(
      ratings
        .filter(r => r.reviewer_role === 'TRANSPORTER')
        .map(r => r.shipment_id)
    );
  }, [ratings]);

  const filteredShipments = useMemo(() => {
    if (!searchQuery.trim()) return completedShipments;
    const q = searchQuery.toLowerCase();
    return completedShipments.filter(sel =>
      sel.shipment.client.full_name.toLowerCase().includes(q) ||
      sel.shipment.origin_address.toLowerCase().includes(q) ||
      sel.shipment.destination_address.toLowerCase().includes(q) ||
      sel.shipment.id.toLowerCase().includes(q)
    );
  }, [completedShipments, searchQuery]);

  const totalEarnings = useMemo(() => {
    return completedShipments.reduce((sum, sel) => sum + Number(sel.shipment.price), 0);
  }, [completedShipments]);

  const handleRated = () => {
    loadRatings(); // Refresh ratings to update is_rated indicators
  };

  return (
    <div className="p-5 lg:p-7">
      {/* Rate Client Modal */}
      {ratingTarget && (
        <RateClientModal
          isOpen={!!ratingTarget}
          shipmentId={ratingTarget.shipmentId}
          clientName={ratingTarget.clientName}
          onClose={() => setRatingTarget(null)}
          onRated={handleRated}
        />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] mb-0.5">Historial de Entregas</h1>
          <p className="text-gray-400 text-sm">{completedShipments.length} envíos completados · S/. {totalEarnings.toFixed(2)} en ingresos</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-100">
            <CheckCircle className="w-3.5 h-3.5" />
            {completedShipments.length} entregados
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Buscar por cliente, dirección o ID..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-[10px] text-sm focus:outline-none focus:border-[#F97316] transition-colors placeholder:text-gray-300"
        />
      </div>

      {/* Error */}
      {storeError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[12px] flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{storeError}</p>
          <button onClick={clearError} className="ml-auto text-xs font-bold text-red-600 hover:underline">Descartar</button>
        </div>
      )}

      {/* Loading */}
      {isLoading && completedShipments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#F97316] mb-3" />
          <p className="text-sm">Cargando historial...</p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && filteredShipments.length === 0 && (
        <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 p-16 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-bold text-sm">
            {searchQuery.trim() ? 'Sin resultados para esa búsqueda' : 'No tienes entregas completadas aún'}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">Tus envíos entregados aparecerán aquí.</p>
        </div>
      )}

      {/* History List */}
      {filteredShipments.length > 0 && (
        <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-[1.5fr_1fr_0.8fr_0.6fr_0.8fr] gap-4 px-5 py-2.5 bg-gray-50 border-b border-gray-100">
            {['Ruta', 'Cliente', 'Fecha Entrega', 'Monto', 'Calificación'].map(h => (
              <span key={h} className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{h}</span>
            ))}
          </div>

          <div className="divide-y divide-gray-50">
            {filteredShipments.map(sel => {
              const isRated = ratedShipmentIds.has(sel.shipment.id);
              const clientName = sel.shipment.client.full_name;
              const initials = getInitials(clientName);
              const avatarColor = getAvatarColor(clientName);

              return (
                <div key={sel.id} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center justify-between md:grid md:grid-cols-[1.5fr_1fr_0.8fr_0.6fr_0.8fr] gap-4">
                    {/* Route */}
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#0F172A] truncate flex items-center gap-1">
                        <span className="text-green-500">●</span> {sel.shipment.origin_address}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate flex items-center gap-1">
                        <ArrowRight className="w-3 h-3 text-[#F97316] flex-shrink-0" />
                        <span className="text-red-400">●</span> {sel.shipment.destination_address}
                      </div>
                    </div>

                    {/* Client */}
                    <div className="hidden md:flex items-center gap-2 min-w-0">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0"
                        style={{ backgroundColor: avatarColor }}
                      >
                        {initials}
                      </div>
                      <span className="text-xs text-[#0F172A] font-medium truncate">{clientName}</span>
                    </div>

                    {/* Date */}
                    <div className="hidden md:flex items-center gap-1.5 min-w-0">
                      <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <span className="text-xs text-gray-500">{formatShipmentDate(sel.shipment.updated_at)}</span>
                    </div>

                    {/* Price */}
                    <div className="hidden md:block">
                      <span className="text-xs font-bold text-[#0F172A]">S/. {Number(sel.shipment.price).toFixed(2)}</span>
                    </div>

                    {/* Rating action */}
                    <div className="flex items-center gap-1.5">
                      {isRated ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-600 border border-green-100">
                          <CheckCircle className="w-3 h-3" />
                          Calificado
                        </span>
                      ) : (
                        <button
                          onClick={() => setRatingTarget({
                            shipmentId: sel.shipment.id,
                            clientName,
                          })}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] text-[11px] font-bold bg-[#F97316] text-white hover:bg-[#ea6b0e] transition-all shadow-sm shadow-orange-200/60 hover:scale-[1.02]"
                        >
                          <Star className="w-3 h-3 fill-white" />
                          Calificar Cliente
                        </button>
                      )}
                    </div>

                    {/* Mobile: Status + Rating */}
                    <div className="md:hidden flex flex-col items-end gap-1.5">
                      <span className="text-xs font-bold text-green-600">Entregado</span>
                      <span className="text-[10px] text-gray-400">{formatShipmentDate(sel.shipment.updated_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
