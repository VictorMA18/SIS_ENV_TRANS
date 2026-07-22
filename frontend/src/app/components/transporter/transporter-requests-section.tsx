import { useEffect, useMemo, useState } from 'react';
import {
  Package, Check, X, Loader2, AlertTriangle, ArrowRight,
  Coins, Sparkles, FileText, Camera, MapPin, Clock, Calendar,
} from 'lucide-react';
import { useAuth } from '../../context/auth';
import { useShipmentListStore } from '../../stores/useShipmentListStore';
import { formatShipmentDate } from '../../lib/shipment-utils';
import type { TransporterShipmentSelection } from '../../types/shipment';

// ─── Main Component ─────────────────────────────────────────────────────────

export function TransporterRequestsSection() {
  const { user } = useAuth();
  const {
    transporterSelections,
    isLoading,
    error: storeError,
    fetchTransporterSelections,
    acceptTransporterSelection,
    rejectTransporterSelection,
    clearError,
  } = useShipmentListStore();

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedSelection, setSelectedSelection] = useState<TransporterShipmentSelection | null>(null);

  useEffect(() => {
    if (user?.id) fetchTransporterSelections();
  }, [user?.id, fetchTransporterSelections]);

  const pendingRequests = useMemo(() => {
    return transporterSelections.filter(sel => sel.status === 'PENDIENTE');
  }, [transporterSelections]);

  const handleAccept = async (id: string) => {
    clearError();
    try {
      await acceptTransporterSelection(id);
      fetchTransporterSelections();
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

  return (
    <div className="p-5 lg:p-7">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] mb-0.5">Solicitudes Entrantes</h1>
          <p className="text-gray-400 text-sm">{pendingRequests.length} solicitudes de envío esperando tu respuesta</p>
        </div>
        {pendingRequests.length > 0 && (
          <span className="bg-orange-100 text-[#F97316] text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> {pendingRequests.length} nuevas
          </span>
        )}
      </div>

      {/* Error */}
      {storeError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[12px] flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800">Ha ocurrido un problema</p>
            <p className="text-xs text-red-600">{storeError}</p>
          </div>
          <button onClick={clearError} className="ml-auto text-xs font-bold text-red-600 hover:underline">Descartar</button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && pendingRequests.length === 0 && (
        <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100">
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
              <Package className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-bold text-sm">No hay solicitudes pendientes</p>
            <p className="text-gray-400 text-xs mt-1">Los envíos que te soliciten los clientes aparecerán aquí.</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && pendingRequests.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#F97316] mb-3" />
          <p className="text-sm">Cargando solicitudes...</p>
        </div>
      )}

      {/* Requests List */}
      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          {pendingRequests.map(sel => (
            <div key={sel.id} className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 p-5 hover:shadow-[0_8px_28px_rgba(0,0,0,0.1)] transition-all">
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
                      <span className="text-gray-400 ml-1">
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
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white rounded-[10px] text-xs font-bold hover:bg-green-600 transition-all hover:scale-[1.02] shadow-md shadow-green-200 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Aceptar Solicitud
                </button>
                <button
                  onClick={() => setRejectingId(sel.id)}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-red-200 text-red-500 rounded-[10px] text-xs font-bold hover:bg-red-50 transition-all hover:scale-[1.02] disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" /> Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectingId && (
        <div className="fixed inset-0 bg-[#0F172A]/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[20px] shadow-2xl max-w-md w-full p-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <h3 className="text-lg font-extrabold text-[#0F172A]">Rechazar Solicitud</h3>
            </div>
            <p className="text-gray-500 text-sm mb-4">
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
                className="w-full px-3 py-2 border border-gray-200 rounded-[10px] text-sm resize-none focus:outline-none focus:border-red-400"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setRejectingId(null); setRejectionReason(''); }}
                className="px-4 py-2 border border-gray-200 rounded-[10px] text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all"
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

      {/* DETAIL MODAL */}
      {selectedSelection && (
        <div className="fixed inset-0 bg-[#0F172A]/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[20px] shadow-2xl max-w-lg w-full p-6 border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <h3 className="text-base font-extrabold text-[#0F172A]">
                Ficha del Envío {selectedSelection.shipment.id.substring(0, 8).toUpperCase()}
              </h3>
              <button
                onClick={() => setSelectedSelection(null)}
                className="p-1 hover:bg-gray-100 rounded-full transition-all text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-[12px] p-4 border border-gray-100">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#F97316]" /> Ruta del Envío
                </h4>
                <p className="text-xs font-bold text-[#0F172A] mb-1">
                  <span className="text-green-500 font-extrabold mr-1">Origen:</span>
                  {selectedSelection.shipment.origin_address}
                </p>
                <p className="text-xs font-bold text-[#0F172A]">
                  <span className="text-red-500 font-extrabold mr-1">Destino:</span>
                  {selectedSelection.shipment.destination_address}
                </p>
              </div>
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
    </div>
  );
}
