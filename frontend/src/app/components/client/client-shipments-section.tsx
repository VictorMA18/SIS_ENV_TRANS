import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Package, Plus, Eye, MoreHorizontal, Loader2, AlertCircle, Inbox,
  ArrowRight, Search, Filter,
} from 'lucide-react';
import { useShipmentListStore } from '../../stores/useShipmentListStore';
import { getStatusConfig, formatShipmentDate } from '../../lib/shipment-utils';
import type { ShipmentStatus, Shipment } from '../../types/shipment';

// ─── Status Tabs ─────────────────────────────────────────────────────────────

type TabKey = 'all' | 'pending' | 'transit' | 'completed' | 'cancelled';

interface TabConfig {
  key: TabKey;
  label: string;
  statuses: ShipmentStatus[];
}

const TABS: TabConfig[] = [
  { key: 'all',       label: 'Todos',       statuses: [] },
  { key: 'pending',   label: 'Pendientes',  statuses: ['REGISTRADO', 'SELECCIONADO'] },
  { key: 'transit',   label: 'En Tránsito', statuses: ['ACEPTADO', 'EN_TRANSITO'] },
  { key: 'completed', label: 'Completados', statuses: ['ENTREGADO'] },
  { key: 'cancelled', label: 'Cancelados',  statuses: ['CANCELADO'] },
];

// ─── Badge Sub-component ────────────────────────────────────────────────────

function Badge({ status }: { status: ShipmentStatus }) {
  const c = getStatusConfig(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

// ─── Shipment Row Sub-component ─────────────────────────────────────────────

function ShipmentRow({ s, navigate }: { s: Shipment; navigate: ReturnType<typeof useNavigate> }) {
  const acceptedSel = s.selections.find(sel => sel.status === 'ACEPTADO' || sel.status === 'PENDIENTE');
  const transporterName = acceptedSel?.transporter.full_name ?? '—';

  return (
    <div className="px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
      <div className="flex items-center justify-between md:grid md:grid-cols-[1.5fr_1.2fr_1fr_0.8fr_0.6fr] gap-4">
        <div className="min-w-0">
          <div className="text-sm font-bold text-[#0F172A] truncate">
            <span className="text-green-600">●</span> {s.origin_address}
          </div>
          <div className="text-xs text-gray-500 mt-0.5 truncate flex items-center gap-1">
            <ArrowRight className="w-3 h-3 text-[#F97316] flex-shrink-0" />
            <span className="text-red-500">●</span> {s.destination_address}
          </div>
          {s.weight_kg && (
            <span className="text-[10px] text-gray-300">{s.weight_kg} kg</span>
          )}
        </div>
        <div className="hidden md:block min-w-0">
          <div className="text-sm text-[#0F172A] truncate">{transporterName}</div>
        </div>
        <div className="hidden md:flex items-center">
          <Badge status={s.status} />
        </div>
        <div className="hidden md:block min-w-0">
          <div className="text-xs text-gray-400">{formatShipmentDate(s.created_at)}</div>
          <div className="text-xs font-bold text-[#0F172A] mt-0.5">S/. {Number(s.price).toFixed(2)}</div>
        </div>
        <div className="hidden md:flex items-center gap-1.5">
          <button
            onClick={() => navigate(`/app/client/tracking/${s.id}`)}
            className="p-2 rounded-[8px] hover:bg-orange-50 text-gray-400 hover:text-[#F97316] transition-colors"
            title="Ver seguimiento"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-[8px] hover:bg-gray-100 text-gray-400 transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
        {/* Mobile view */}
        <div className="md:hidden flex flex-col items-end gap-1.5">
          <Badge status={s.status} />
          <button
            onClick={() => navigate(`/app/client/tracking/${s.id}`)}
            className="text-xs text-[#F97316] font-medium"
          >
            Ver →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ClientShipmentsSection() {
  const navigate = useNavigate();
  const { shipments, isLoading, error, fetchShipments, clearError } = useShipmentListStore();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  const filteredShipments = useMemo(() => {
    const tabConfig = TABS.find(t => t.key === activeTab)!;
    let result = shipments;

    // Filter by tab statuses
    if (tabConfig.statuses.length > 0) {
      result = result.filter(s => tabConfig.statuses.includes(s.status));
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.origin_address.toLowerCase().includes(q) ||
        s.destination_address.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q))
      );
    }

    return result;
  }, [shipments, activeTab, searchQuery]);

  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = {
      all: shipments.length,
      pending: 0,
      transit: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const s of shipments) {
      if (['REGISTRADO', 'SELECCIONADO'].includes(s.status)) counts.pending++;
      if (['ACEPTADO', 'EN_TRANSITO'].includes(s.status)) counts.transit++;
      if (s.status === 'ENTREGADO') counts.completed++;
      if (s.status === 'CANCELADO') counts.cancelled++;
    }
    return counts;
  }, [shipments]);

  return (
    <div className="p-5 lg:p-7">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] mb-0.5">Mis Envíos</h1>
          <p className="text-gray-400 text-sm">Gestiona y filtra todos tus envíos</p>
        </div>
        <button
          onClick={() => navigate('/app/client/new-shipment')}
          className="flex items-center gap-2 bg-[#F97316] text-white px-4 py-2.5 rounded-[10px] font-semibold text-sm hover:bg-[#ea6b0e] transition-all hover:scale-[1.02] shadow-md shadow-orange-200/80 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo Envío</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por dirección, descripción o ID..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-[10px] text-sm focus:outline-none focus:border-[#F97316] transition-colors placeholder:text-gray-300"
          />
        </div>
        <button
          onClick={() => fetchShipments()}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-[10px] text-sm text-gray-600 hover:bg-gray-50 transition-all font-medium"
        >
          <Filter className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
        {TABS.map(tab => {
          const count = tabCounts[tab.key];
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-[10px] text-xs font-bold transition-all whitespace-nowrap ${
                active
                  ? 'bg-[#F97316] text-white shadow-md shadow-orange-200/60'
                  : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                active ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
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

      {/* Content Card */}
      <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">
        {/* Loading */}
        {isLoading && shipments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#F97316] mb-3" />
            <p className="text-sm">Cargando envíos...</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && filteredShipments.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Inbox className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">
              {activeTab === 'all' ? 'No tienes envíos aún' : `Sin envíos ${TABS.find(t => t.key === activeTab)?.label.toLowerCase()}`}
            </p>
            {activeTab === 'all' && (
              <>
                <p className="text-xs text-gray-400 mt-1">Crea tu primer envío para comenzar</p>
                <button
                  onClick={() => navigate('/app/client/new-shipment')}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-[#F97316] text-white rounded-[8px] text-sm font-bold hover:bg-[#ea6b0e] transition-all shadow-md shadow-orange-200"
                >
                  <Plus className="w-4 h-4" /> Crear Envío
                </button>
              </>
            )}
          </div>
        )}

        {/* Table */}
        {filteredShipments.length > 0 && (
          <>
            <div className="hidden md:grid grid-cols-[1.5fr_1.2fr_1fr_0.8fr_0.6fr] gap-4 px-5 py-2.5 bg-gray-50 border-b border-gray-100">
              {['Ruta', 'Transportista', 'Estado', 'Fecha', 'Acción'].map(h => (
                <span key={h} className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{h}</span>
              ))}
            </div>

            {/* Sub-section headers for transit tab */}
            {activeTab === 'transit' ? (
              <div>
                {/* Sub-section: Aceptados (Por Iniciar) */}
                {filteredShipments.some(s => s.status === 'ACEPTADO') && (
                  <>
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50/60 border-b border-indigo-100">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                        Por Iniciar — Aceptados
                      </span>
                      <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold">
                        {filteredShipments.filter(s => s.status === 'ACEPTADO').length}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {filteredShipments.filter(s => s.status === 'ACEPTADO').map(s => (
                        <ShipmentRow key={s.id} s={s} navigate={navigate} />
                      ))}
                    </div>
                  </>
                )}
                {/* Sub-section: En Tránsito (En Ruta) */}
                {filteredShipments.some(s => s.status === 'EN_TRANSITO') && (
                  <>
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-amber-50/60 border-y border-amber-100">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                        En Ruta Activa — En Tránsito
                      </span>
                      <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-bold">
                        {filteredShipments.filter(s => s.status === 'EN_TRANSITO').length}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {filteredShipments.filter(s => s.status === 'EN_TRANSITO').map(s => (
                        <ShipmentRow key={s.id} s={s} navigate={navigate} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredShipments.map(s => (
                  <ShipmentRow key={s.id} s={s} navigate={navigate} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
