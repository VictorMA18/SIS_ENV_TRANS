import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle, Truck, ChevronDown, Loader2, AlertTriangle,
  X, FileText, MapPin, Package,
} from 'lucide-react';
import { useAuth } from '../../context/auth';
import { useShipmentListStore } from '../../stores/useShipmentListStore';
import { formatShipmentDate } from '../../lib/shipment-utils';
import type { TransporterShipmentSelection } from '../../types/shipment';

const STATUS_CFG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  REGISTRADO:   { bg: 'bg-gray-50',   text: 'text-gray-700',   dot: 'bg-gray-400',   label: 'Registrado' },
  SELECCIONADO: { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500',   label: 'Seleccionado' },
  ACEPTADO:     { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500', label: 'Asignado' },
  EN_TRANSITO:  { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500',  label: 'En tránsito' },
  ENTREGADO:    { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500',  label: 'Entregado' },
  CANCELADO:    { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500',    label: 'Cancelado' },
};

// ─── Main Component ─────────────────────────────────────────────────────────

export function TransporterActiveRoutesSection() {
  const { user } = useAuth();
  const {
    transporterSelections,
    isLoading,
    error: storeError,
    fetchTransporterSelections,
    startTransporterTransit,
    confirmTransporterDelivery,
    clearError,
  } = useShipmentListStore();

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [startingTransitId, setStartingTransitId] = useState<string | null>(null);
  const [transitLocation, setTransitLocation] = useState('');
  const [deliveringId, setDeliveringId] = useState<string | null>(null);
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [selectedSelection, setSelectedSelection] = useState<TransporterShipmentSelection | null>(null);

  useEffect(() => {
    if (user?.id) fetchTransporterSelections();
  }, [user?.id, fetchTransporterSelections]);

  const activeShipments = useMemo(() => {
    return transporterSelections.filter(
      sel => sel.status === 'ACEPTADO' && sel.shipment.status !== 'ENTREGADO' && sel.shipment.status !== 'CANCELADO'
    );
  }, [transporterSelections]);

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
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-5 lg:p-7">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] mb-0.5">Rutas Activas</h1>
          <p className="text-gray-400 text-sm">{activeShipments.length} envíos asignados en curso</p>
        </div>
        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100">
          <Truck className="w-3.5 h-3.5" />
          {activeShipments.filter(s => s.shipment.status === 'EN_TRANSITO').length} en tránsito
        </span>
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
      {isLoading && activeShipments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#F97316] mb-3" />
          <p className="text-sm">Cargando rutas...</p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && activeShipments.length === 0 && (
        <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 p-16 text-center">
          <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-bold text-sm">Sin envíos activos</p>
          <p className="text-[10px] text-gray-400 mt-1">Acepta solicitudes para iniciar rutas.</p>
        </div>
      )}

      {/* Active Routes Grid */}
      {activeShipments.length > 0 && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {activeShipments.map(sel => {
            const cfg = STATUS_CFG[sel.shipment.status] || STATUS_CFG.ACEPTADO;
            const isOpen = openMenuId === sel.id;

            return (
              <div key={sel.id} className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 p-5 hover:shadow-[0_8px_28px_rgba(0,0,0,0.1)] transition-all">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-bold text-[#0F172A]">
                      ID: {sel.shipment.id.substring(0, 8).toUpperCase()}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Cliente: {sel.shipment.client.full_name}</p>
                  </div>
                  <span className="text-xs font-bold text-[#F97316]">S/. {Number(sel.shipment.price).toFixed(2)}</span>
                </div>

                {/* Route */}
                <div className="text-[11px] text-gray-500 mb-4 bg-gray-50/70 p-3 rounded-[8px] border border-gray-100">
                  <p className="font-bold flex items-center gap-1 mb-1">
                    <span className="text-green-500">●</span> {sel.shipment.origin_address}
                  </p>
                  <p className="font-bold flex items-center gap-1">
                    <span className="text-red-400">●</span> {sel.shipment.destination_address}
                  </p>
                </div>

                {/* Status + Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setOpenMenuId(isOpen ? null : sel.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[10px] border text-xs font-bold transition-all ${cfg.bg} ${cfg.text}`}
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
                              setTransitLocation(sel.shipment.origin_address);
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
                              setDeliveryLocation(sel.shipment.destination_address);
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

      {/* START TRANSIT MODAL */}
      {startingTransitId && (
        <div className="fixed inset-0 bg-[#0F172A]/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[20px] shadow-2xl max-w-md w-full p-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-6 h-6 text-amber-500" />
              <h3 className="text-lg font-extrabold text-[#0F172A]">Iniciar Tránsito</h3>
            </div>
            <p className="text-gray-500 text-sm mb-4">
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
                className="w-full px-3 py-2 border border-gray-200 rounded-[10px] text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setStartingTransitId(null); setTransitLocation(''); }}
                className="px-4 py-2 border border-gray-200 rounded-[10px] text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all"
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
        <div className="fixed inset-0 bg-[#0F172A]/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[20px] shadow-2xl max-w-md w-full p-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <h3 className="text-lg font-extrabold text-[#0F172A]">Confirmar Entrega</h3>
            </div>
            <p className="text-gray-500 text-sm mb-4">
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
                  className="w-full px-3 py-2 border border-gray-200 rounded-[10px] text-sm focus:outline-none focus:border-green-400"
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
                  className="w-full px-3 py-2 border border-gray-200 rounded-[10px] text-sm resize-none focus:outline-none focus:border-green-400"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setDeliveringId(null); setDeliveryLocation(''); setDeliveryNotes(''); }}
                className="px-4 py-2 border border-gray-200 rounded-[10px] text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all"
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

      {/* DETAIL MODAL */}
      {selectedSelection && (
        <div className="fixed inset-0 bg-[#0F172A]/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[20px] shadow-2xl max-w-lg w-full p-6 border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <h3 className="text-base font-extrabold text-[#0F172A]">
                Ficha del Envío {selectedSelection.shipment.id.substring(0, 8).toUpperCase()}
              </h3>
              <button onClick={() => setSelectedSelection(null)} className="p-1 hover:bg-gray-100 rounded-full transition-all text-gray-400">
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
              <div className="bg-gray-50 rounded-[12px] p-4 border border-gray-100">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-[#F97316]" /> Detalles de Carga
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 block">Descripción</span>
                    <span className="font-bold text-[#0F172A]">{selectedSelection.shipment.description || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Precio</span>
                    <span className="font-bold text-[#0F172A]">S/. {Number(selectedSelection.shipment.price).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Peso</span>
                    <span className="font-bold text-[#0F172A]">{selectedSelection.shipment.weight_kg ? `${selectedSelection.shipment.weight_kg} kg` : '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Programado</span>
                    <span className="font-bold text-[#0F172A]">{formatShipmentDate(selectedSelection.shipment.scheduled_delivery_at)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-gray-100 flex justify-end">
              <button onClick={() => setSelectedSelection(null)} className="px-5 py-2 bg-[#F97316] text-white rounded-[10px] text-xs font-bold hover:bg-[#ea6b0e] transition-all">
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
