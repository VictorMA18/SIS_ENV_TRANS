import { useEffect, useState } from 'react';
import {
  User, Mail, Phone, Shield, Star, Package, Edit2, Check, X, Camera,
  MapPin, Loader2, AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/auth';
import { fetchClientProfile, patchClientProfile, type ClientProfile } from '../../lib/shipment-api';
import { useShipmentListStore } from '../../stores/useShipmentListStore';
import { ApiError } from '../../lib/api';

// ─── Info Row ───────────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon, label, value, editing, editValue, onEditChange, nonEditable,
}: {
  icon: React.ElementType; label: string; value: string; editing?: boolean;
  editValue?: string; onEditChange?: (v: string) => void; nonEditable?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 p-4 rounded-[12px] transition-all ${editing && !nonEditable ? 'bg-orange-50 border border-orange-100' : 'bg-gray-50'}`}>
      <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 ${editing && !nonEditable ? 'bg-orange-100' : 'bg-gray-100'}`}>
        <Icon className={`w-4 h-4 ${editing && !nonEditable ? 'text-[#F97316]' : 'text-gray-400'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">{label}</p>
        {editing && !nonEditable && onEditChange ? (
          <input
            value={editValue}
            onChange={e => onEditChange(e.target.value)}
            className="w-full text-sm text-[#0F172A] bg-transparent outline-none border-b border-[#F97316] pb-0.5"
          />
        ) : (
          <p className="text-sm font-semibold text-[#0F172A] truncate">{value || '—'}</p>
        )}
      </div>
    </div>
  );
}

// ─── Star Row ───────────────────────────────────────────────────────────────

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-4 h-4 ${i <= Math.floor(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
        />
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ClientProfileSection() {
  const { user } = useAuth();
  const { shipments, fetchShipments } = useShipmentListStore();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    dni: '',
    address: '',
  });

  useEffect(() => {
    if (user?.id) {
      setIsLoading(true);
      Promise.all([
        fetchClientProfile(user.id),
        fetchShipments(),
      ])
        .then(([profileData]) => {
          setProfile(profileData);
          setForm({
            full_name: profileData.full_name || '',
            phone: profileData.phone || '',
            dni: profileData.dni || '',
            address: profileData.address || '',
          });
        })
        .catch(() => setError('Error al cargar el perfil.'))
        .finally(() => setIsLoading(false));
    }
  }, [user?.id, fetchShipments]);

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await patchClientProfile(profile.id, {
        full_name: form.full_name,
        phone: form.phone || null,
        dni: form.dni || null,
        address: form.address || null,
      });
      setProfile(updated);
      setIsEditing(false);
    } catch (err) {
      const data = err instanceof ApiError ? err.data : null;
      setError('Error al actualizar el perfil. Por favor verifica tus datos.');
    } finally {
      setIsSaving(false);
    }
  };

  // Derive frequently used addresses from shipments
  const frequentAddresses = (() => {
    const addressCount: Record<string, number> = {};
    for (const s of shipments) {
      addressCount[s.origin_address] = (addressCount[s.origin_address] || 0) + 1;
      addressCount[s.destination_address] = (addressCount[s.destination_address] || 0) + 1;
    }
    return Object.entries(addressCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([address, count]) => ({ address, count }));
  })();

  // Stats
  const totalShipments = shipments.length;
  const completedShipments = shipments.filter(s => s.status === 'ENTREGADO').length;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#F97316] mb-3" />
        <p className="text-sm">Cargando perfil...</p>
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-7 max-w-4xl mx-auto">
      {/* Error */}
      {error && (
        <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-[10px] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-white rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden mb-6">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-r from-[#F97316] to-[#fb923c] relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        </div>

        {/* Profile info */}
        <div className="px-6 pt-14 pb-6 relative">
          {/* Floating avatar */}
          <div className="absolute -top-10 left-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#F97316] to-[#ea6b0e] flex items-center justify-center border-4 border-white shadow-lg">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-white font-extrabold text-2xl">{user?.name?.charAt(0)}</span>
              )}
            </div>
          </div>
          {/* Info below avatar */}
          <div>
            <h1 className="text-xl font-extrabold text-[#0F172A]">{profile?.full_name || user?.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{profile?.email || user?.email}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#F97316]/15 text-[#F97316]">
                Cliente
              </span>
              {profile?.average_rating !== null && profile?.average_rating !== undefined && (
                <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {Number(profile.average_rating).toFixed(2)} reputación
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Personal Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[#0F172A] font-bold text-sm">Información Personal</h2>
              {!isEditing ? (
                <button
                  onClick={() => {
                    setForm({
                      full_name: profile?.full_name || '',
                      phone: profile?.phone || '',
                      dni: profile?.dni || '',
                      address: profile?.address || '',
                    });
                    setIsEditing(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-[8px] text-xs font-bold text-gray-500 hover:bg-gray-50 transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Editar
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#F97316] text-white rounded-[8px] text-xs font-bold hover:bg-[#ea6b0e] transition-all hover:scale-[1.02] shadow-sm shadow-orange-100 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Guardar
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 text-gray-500 rounded-[8px] text-xs font-bold hover:bg-gray-50 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancelar
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              <InfoRow
                icon={User}
                label="Nombre completo"
                value={profile?.full_name || '—'}
                editing={isEditing}
                editValue={form.full_name}
                onEditChange={v => setForm(f => ({ ...f, full_name: v }))}
              />
              <InfoRow
                icon={Mail}
                label="Correo electrónico"
                value={profile?.email || '—'}
                editing={isEditing}
                nonEditable
              />
              <InfoRow
                icon={Phone}
                label="Teléfono"
                value={profile?.phone || 'No registrado'}
                editing={isEditing}
                editValue={form.phone}
                onEditChange={v => setForm(f => ({ ...f, phone: v }))}
              />
              <InfoRow
                icon={Shield}
                label="DNI"
                value={profile?.dni || 'No registrado'}
                editing={isEditing}
                editValue={form.dni}
                onEditChange={v => setForm(f => ({ ...f, dni: v }))}
              />
              <InfoRow
                icon={MapPin}
                label="Dirección"
                value={profile?.address || 'No registrada'}
                editing={isEditing}
                editValue={form.address}
                onEditChange={v => setForm(f => ({ ...f, address: v }))}
              />
            </div>
          </div>

          {/* Frequent Addresses */}
          {frequentAddresses.length > 0 && (
            <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-5">
              <h2 className="text-[#0F172A] font-bold text-sm mb-4">Direcciones Frecuentes</h2>
              <div className="space-y-2">
                {frequentAddresses.map(a => (
                  <div key={a.address} className="flex items-center gap-3 p-3 rounded-[10px] bg-gray-50">
                    <MapPin className="w-4 h-4 text-[#F97316] flex-shrink-0" />
                    <span className="text-xs font-medium text-[#0F172A] flex-1 truncate">{a.address}</span>
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-bold">
                      {a.count}x
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Stats & Rating */}
        <div className="space-y-5">
          {/* Stats */}
          <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-5">
            <h3 className="text-[#0F172A] font-bold text-sm mb-4">Estadísticas</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-blue-500" /> Total envíos
                </span>
                <span className="text-sm font-extrabold text-[#0F172A]">{totalShipments}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-green-500" /> Completados
                </span>
                <span className="text-sm font-extrabold text-green-600">{completedShipments}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500" /> Rating promedio
                </span>
                <span className="text-sm font-extrabold text-amber-600">
                  {profile?.average_rating !== null && profile?.average_rating !== undefined
                    ? Number(profile.average_rating).toFixed(2)
                    : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Rating Visual */}
          {profile?.average_rating !== null && profile?.average_rating !== undefined && (
            <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-5 text-center">
              <h3 className="text-[#0F172A] font-bold text-sm mb-3">Tu Reputación</h3>
              <div className="text-4xl font-extrabold text-[#0F172A] mb-2">
                {Number(profile.average_rating).toFixed(1)}
              </div>
              <StarRow rating={Number(profile.average_rating)} />
              <p className="text-[10px] text-gray-400 mt-2">Basada en calificaciones de transportistas</p>
            </div>
          )}

          {/* CTA */}
          <div className="bg-gradient-to-br from-[#F97316] to-[#ea6b0e] rounded-[16px] p-5 text-white shadow-lg shadow-orange-200">
            <Package className="w-7 h-7 mb-2 opacity-90" />
            <h3 className="font-bold text-sm mb-1">Mejora tu reputación</h3>
            <p className="text-xs opacity-80 leading-relaxed">
              Completa tus datos de perfil y mantén buenas prácticas con tus transportistas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
