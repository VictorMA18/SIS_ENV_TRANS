import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Star, Truck, Loader2, AlertCircle, Users, CheckCircle, Package,
  ArrowRight, Search,
} from 'lucide-react';
import { fetchAvailableTransporters, type AvailableTransporterProfile } from '../../lib/shipment-api';
import { getInitials, getAvatarColor } from '../../lib/shipment-utils';

// ─── Transporter Card ───────────────────────────────────────────────────────

function TransporterCard({
  transporter,
  onRequestShipment,
}: {
  transporter: AvailableTransporterProfile;
  onRequestShipment: () => void;
}) {
  const name = transporter.user.full_name;
  const initials = getInitials(name);
  const avatarColor = getAvatarColor(name);
  const rating = transporter.average_rating;

  return (
    <div className="bg-white rounded-[16px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 hover:shadow-[0_8px_28px_rgba(0,0,0,0.1)] transition-all group">
      {/* Top: Avatar + Info */}
      <div className="flex items-start gap-3.5 mb-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ backgroundColor: avatarColor }}
        >
          {transporter.user.avatar_url ? (
            <img
              src={transporter.user.avatar_url}
              alt={name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-[#0F172A] truncate">{name}</h3>
          <p className="text-xs text-gray-400 truncate">{transporter.user.email}</p>
          {transporter.is_available && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Disponible
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded-[10px] p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-base font-extrabold text-[#0F172A]">
              {rating !== null && rating !== undefined ? Number(rating).toFixed(1) : '—'}
            </span>
          </div>
          <p className="text-[10px] text-gray-400 font-medium">Rating</p>
        </div>
        <div className="bg-gray-50 rounded-[10px] p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Package className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-base font-extrabold text-[#0F172A]">
              {transporter.completed_shipments}
            </span>
          </div>
          <p className="text-[10px] text-gray-400 font-medium">Entregas</p>
        </div>
      </div>

      {/* Vehicle info */}
      {transporter.vehicle_description && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-[8px] mb-4 border border-blue-100">
          <Truck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
          <span className="text-xs text-blue-700 font-medium truncate">{transporter.vehicle_description}</span>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={onRequestShipment}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#F97316] text-white rounded-[10px] text-xs font-bold hover:bg-[#ea6b0e] transition-all hover:scale-[1.02] shadow-md shadow-orange-200/60"
      >
        <ArrowRight className="w-3.5 h-3.5" />
        Solicitar Envío
      </button>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ClientTransportersSection() {
  const navigate = useNavigate();
  const [transporters, setTransporters] = useState<AvailableTransporterProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTransporters();
  }, []);

  const loadTransporters = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAvailableTransporters();
      setTransporters(data);
    } catch {
      setError('No se pudo cargar la lista de transportistas.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTransporters = searchQuery.trim()
    ? transporters.filter(t => {
        const q = searchQuery.toLowerCase();
        return (
          t.user.full_name.toLowerCase().includes(q) ||
          t.user.email.toLowerCase().includes(q) ||
          (t.vehicle_description && t.vehicle_description.toLowerCase().includes(q))
        );
      })
    : transporters;

  return (
    <div className="p-5 lg:p-7">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] mb-0.5">Transportistas</h1>
          <p className="text-gray-400 text-sm">Directorio de transportistas disponibles en tu distrito</p>
        </div>
        <button
          onClick={loadTransporters}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-[10px] text-sm text-gray-600 hover:bg-gray-50 transition-all font-medium"
        >
          <Users className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Buscar transportista por nombre, email o vehículo..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-[10px] text-sm focus:outline-none focus:border-[#F97316] transition-colors placeholder:text-gray-300"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-[10px] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-700 font-medium">{error}</p>
            <button onClick={() => setError(null)} className="text-xs text-red-500 hover:underline mt-1">Cerrar</button>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#F97316] mb-3" />
          <p className="text-sm">Cargando transportistas...</p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && filteredTransporters.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Truck className="w-12 h-12 mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">
            {searchQuery.trim()
              ? 'No se encontraron transportistas con esa búsqueda'
              : 'No hay transportistas disponibles en este momento'}
          </p>
          <p className="text-xs text-gray-400 mt-1">Intenta nuevamente más tarde</p>
        </div>
      )}

      {/* Grid */}
      {!isLoading && filteredTransporters.length > 0 && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredTransporters.map(t => (
            <TransporterCard
              key={t.user.id}
              transporter={t}
              onRequestShipment={() => navigate('/app/client/new-shipment')}
            />
          ))}
        </div>
      )}

      {/* Summary */}
      {!isLoading && filteredTransporters.length > 0 && (
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
          <span>{filteredTransporters.length} transportista{filteredTransporters.length !== 1 ? 's' : ''} disponible{filteredTransporters.length !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}
