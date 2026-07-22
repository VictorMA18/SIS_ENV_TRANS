import { useEffect, useState, useMemo } from 'react';
import {
  User, Mail, Phone, Star, Truck, Edit2, Check, X, Shield,
  Loader2, AlertCircle, Package, MapPin, FileText, Trash2, Plus,
} from 'lucide-react';
import { useAuth } from '../../context/auth';
import {
  fetchTransporterProfile,
  patchTransporterProfile,
  type TransporterProfile,
  fetchTransporterZones,
  createTransporterZone,
  updateTransporterZone,
  deleteTransporterZone,
  type TransporterZone,
} from '../../lib/transporter-api';
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

export function TransporterProfileSection() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<TransporterProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    vehicle_description: '',
    license_number: '',
    ruc: '',
  });

  // Zonas de cobertura state
  const [zones, setZones] = useState<TransporterZone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [newDistrict, setNewDistrict] = useState('');
  const [zoneError, setZoneError] = useState('');

  // Fetch transporter selections to compute real completed count
  const { transporterSelections, fetchTransporterSelections } = useShipmentListStore();

  useEffect(() => {
    if (user?.id) {
      loadProfile();
      fetchTransporterSelections();
      loadZones();
    }
  }, [user?.id, fetchTransporterSelections]);

  const loadProfile = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchTransporterProfile(user.id);
      setProfile(data);
      setForm({
        full_name: data.full_name || '',
        phone: data.phone || '',
        vehicle_description: data.vehicle_description || '',
        license_number: data.license_number || '',
        ruc: data.ruc || '',
      });
    } catch {
      setError('Error al cargar el perfil del transportista.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await patchTransporterProfile(profile.id, {
        full_name: form.full_name,
        phone: form.phone || null,
        vehicle_description: form.vehicle_description || null,
        license_number: form.license_number || null,
        ruc: form.ruc || null,
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

  const loadZones = async () => {
    if (!user?.id) return;
    try {
      setZonesLoading(true);
      const data = await fetchTransporterZones();
      setZones(data);
    } catch (err) {
      console.error('Error loading zones:', err);
    } finally {
      setZonesLoading(false);
    }
  };

  const handleAddZone = async () => {
    const district = newDistrict.trim();
    if (!district) return;
    setZoneError('');
    try {
      const created = await createTransporterZone(district);
      setZones(prev => [...prev, created].sort((a, b) => a.district.localeCompare(b.district)));
      setNewDistrict('');
    } catch (err: any) {
      console.error(err);
      setZoneError(err?.data?.district?.[0] || 'No se pudo agregar la zona.');
    }
  };

  const handleToggleZone = async (zone: TransporterZone) => {
    try {
      const updated = await updateTransporterZone(zone.id, { is_active: !zone.is_active });
      setZones(prev => prev.map(z => (z.id === zone.id ? updated : z)));
    } catch (err) {
      console.error(err);
      setZoneError('No se pudo actualizar la zona.');
    }
  };

  const handleDeleteZone = async (zone: TransporterZone) => {
    try {
      await deleteTransporterZone(zone.id);
      setZones(prev => prev.filter(z => z.id !== zone.id));
    } catch (err) {
      console.error(err);
      setZoneError('No se pudo eliminar la zona.');
    }
  };

  const handleToggleAvailability = async () => {
    if (!profile) return;
    setError(null);
    try {
      const updated = await patchTransporterProfile(profile.id, {
        is_available: !profile.is_available,
      });
      setProfile(updated);
    } catch (err: unknown) {
      const data = err instanceof ApiError ? err.data : null;
      const msg = data && typeof data === 'object' && 'is_available' in data
        ? (data as Record<string, unknown>).is_available
        : 'Error al actualizar disponibilidad.';
      setError(Array.isArray(msg) ? msg[0] : String(msg));
    }
  };

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
        {/* Banner — Blue for transporter */}
        <div className="h-32 bg-gradient-to-r from-[#0F172A] to-[#1E293B] relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        </div>

        {/* Profile info */}
        <div className="px-6 pt-14 pb-6 relative">
          {/* Floating avatar */}
          <div className="absolute -top-10 left-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex items-center justify-center border-4 border-white shadow-lg">
              <span className="text-white font-extrabold text-2xl">{user?.name?.charAt(0)}</span>
            </div>
          </div>
          {/* Info below avatar */}
          <div>
            <h1 className="text-xl font-extrabold text-[#0F172A]">{profile?.full_name || user?.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{profile?.email || user?.email}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-500/15 text-blue-600">
                Transportista
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
        {/* Left: Info + Vehicle */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info */}
          <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[#0F172A] font-bold text-sm">Información Personal</h2>
              {!isEditing ? (
                <button
                  onClick={() => {
                    setForm({
                      full_name: profile?.full_name || '',
                      phone: profile?.phone || '',
                      vehicle_description: profile?.vehicle_description || '',
                      license_number: profile?.license_number || '',
                      ruc: profile?.ruc || '',
                    });
                    setIsEditing(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-[8px] text-xs font-bold text-gray-500 hover:bg-gray-50 transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Editar Perfil
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
            </div>
          </div>

          {/* Vehicle & Documents */}
          <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-5">
            <h2 className="text-[#0F172A] font-bold text-sm mb-4">Vehículo & Documentos</h2>
            <div className="space-y-2.5">
              <InfoRow
                icon={Truck}
                label="Vehículo"
                value={profile?.vehicle_description || 'No registrado'}
                editing={isEditing}
                editValue={form.vehicle_description}
                onEditChange={v => setForm(f => ({ ...f, vehicle_description: v }))}
              />
              <InfoRow
                icon={Shield}
                label="Número de Brevete"
                value={profile?.license_number || 'No registrado'}
                editing={isEditing}
                editValue={form.license_number}
                onEditChange={v => setForm(f => ({ ...f, license_number: v }))}
              />
              <InfoRow
                icon={FileText}
                label="RUC"
                value={profile?.ruc || 'No registrado'}
                editing={isEditing}
                editValue={form.ruc}
                onEditChange={v => setForm(f => ({ ...f, ruc: v }))}
              />
            </div>
          </div>

          {/* Availability Toggle */}
          <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-5">
            <h2 className="text-[#0F172A] font-bold text-sm mb-4">Estado de Disponibilidad</h2>
            <div className="flex items-center justify-between p-4 rounded-[12px] bg-gray-50">
              <div>
                <p className="text-sm font-bold text-[#0F172A]">
                  {profile?.is_available ? '🟢 Disponible para asignaciones' : '🔴 No disponible'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Los clientes {profile?.is_available ? 'pueden' : 'no pueden'} solicitarte envíos
                </p>
              </div>
              <button
                onClick={handleToggleAvailability}
                className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                  profile?.is_available ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                    profile?.is_available ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Zonas de cobertura */}
          <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-5">
            <h2 className="text-[#0F172A] font-bold text-sm mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#F97316]" /> Zonas de Cobertura
            </h2>
            <p className="text-xs text-gray-400 mb-3">
              Define los distritos donde puedes recoger o entregar mercancías.
            </p>

            <div className="flex gap-2 mb-3">
              <input
                value={newDistrict}
                onChange={e => setNewDistrict(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddZone()}
                placeholder="Ej: Cercado, Yanahuara, Cayma..."
                className="flex-1 text-sm px-3 py-2.5 border border-gray-200 rounded-[10px] outline-none focus:border-[#F97316] transition-all"
              />
              <button
                onClick={handleAddZone}
                className="w-10 h-10 flex items-center justify-center bg-[#F97316] text-white rounded-[10px] hover:bg-[#ea6b0e] transition-all flex-shrink-0 shadow-md shadow-orange-200"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {zoneError && <p className="text-xs text-red-500 mb-3 font-semibold">{zoneError}</p>}

            {zonesLoading ? (
              <div className="flex items-center gap-2 py-4 text-xs text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin text-[#F97316]" />
                Cargando zonas de cobertura...
              </div>
            ) : zones.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">Aún no registras distritos de cobertura.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {zones.map(zone => (
                  <div key={zone.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-[10px] border border-gray-100">
                    <button
                      onClick={() => handleToggleZone(zone)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-full transition-all ${
                        zone.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                      }`}
                      title={zone.is_active ? 'Zona Activa (haz clic para desactivar)' : 'Zona Inactiva (haz clic para activar)'}
                    >
                      {zone.district}
                    </button>
                    <button
                      onClick={() => handleDeleteZone(zone)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                      title="Eliminar zona"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Stats & Rating */}
        <div className="space-y-5">
          {/* Stats */}
          <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-5">
            <h3 className="text-[#0F172A] font-bold text-sm mb-4">Estadísticas</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-green-500" /> Entregas completadas
                </span>
                <span className="text-sm font-extrabold text-[#0F172A]">
                  {(() => {
                    // Use real count from selections if backend field is 0
                    const backendCount = profile?.completed_shipments ?? 0;
                    const realCount = transporterSelections.filter(
                      sel => sel.status === 'ACEPTADO' && sel.shipment.status === 'ENTREGADO'
                    ).length;
                    return Math.max(backendCount, realCount);
                  })()}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500" /> Rating promedio
                </span>
                <span className="text-sm font-extrabold text-amber-600">
                  {profile?.average_rating !== null && profile?.average_rating !== undefined
                    ? Number(profile.average_rating).toFixed(2)
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-blue-500" /> Estado
                </span>
                <span className={`text-sm font-extrabold ${profile?.is_available ? 'text-green-600' : 'text-gray-400'}`}>
                  {profile?.is_available ? 'Disponible' : 'No disponible'}
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
              <p className="text-[10px] text-gray-400 mt-2">Basada en calificaciones de clientes</p>
            </div>
          )}

          {/* Dark CTA */}
          <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-[16px] p-5 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            <Truck className="w-7 h-7 text-blue-400 mb-2" />
            <h3 className="font-bold text-sm mb-1">Mejora tu perfil</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Completa tu información de vehículo y documentos para recibir más solicitudes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
