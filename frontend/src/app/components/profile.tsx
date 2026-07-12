import { useEffect, useState } from 'react';
import { User, Mail, Phone, Shield, Star, Package, Edit2, Check, X, Camera, Award, Truck, MapPin, Upload, Loader2 } from 'lucide-react';
import { useAuth } from '../context/auth';
import { patchTransporterProfile } from '../lib/transporter-api';
import { patchClientProfile, fetchShipments, fetchTransporterSelections } from '../lib/shipment-api';
import type { Shipment, TransporterShipmentSelection } from '../types/shipment';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

const VEHICLE_TYPES = ['Moto de carga', 'Mototaxi de carga', 'Camioneta', 'Van de carga', 'Camión pequeño', 'Camión mediano', 'Camión grande'];

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Buster',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Cookie',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Toby',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Simba',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Oliver',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Leo',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Daisy',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Bella',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Milo',
];

const RATING_BREAKDOWN = [
  { stars: 5, count: 89, pct: 70 },
  { stars: 4, count: 24, pct: 19 },
  { stars: 3, count: 10, pct: 8 },
  { stars: 2, count: 3, pct: 2 },
  { stars: 1, count: 1, pct: 1 },
];

const BADGES = [
  { icon: '⭐', label: 'Top Rated', earned: true },
  { icon: '🚀', label: '100+ Envíos', earned: true },
  { icon: '⚡', label: 'Respuesta rápida', earned: true },
  { icon: '🏆', label: 'Elite', earned: false },
  { icon: '💎', label: 'Premium', earned: false },
  { icon: '🌟', label: '500 Envíos', earned: false },
];

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-4 h-4 ${i <= Math.floor(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
      ))}
    </div>
  );
}

function InfoRow({
  icon: Icon, label, value, editing, editValue, onEditChange, nonEditable, select, error,
}: {
  icon: React.ElementType; label: string; value: string; editing?: boolean;
  editValue?: string; onEditChange?: (v: string) => void; nonEditable?: boolean;
  select?: string[]; error?: string;
}) {
  return (
    <div className={`flex items-center gap-3 p-4 rounded-[12px] transition-all ${editing && !nonEditable ? 'bg-orange-50 border border-orange-100' : 'bg-gray-50'}`}>
      <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 ${editing && !nonEditable ? 'bg-orange-100' : 'bg-gray-100'}`}>
        <Icon className={`w-4 h-4 ${editing && !nonEditable ? 'text-[#F97316]' : 'text-gray-400'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">{label}</p>
        {editing && !nonEditable && onEditChange ? (
          select ? (
            <select value={editValue} onChange={e => onEditChange(e.target.value)}
              className="w-full text-sm text-[#0F172A] bg-transparent outline-none border-b border-[#F97316] pb-0.5 appearance-none">
              {select.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          ) : (
            <input value={editValue} onChange={e => onEditChange(e.target.value)}
              className="w-full text-sm text-[#0F172A] bg-transparent outline-none border-b border-[#F97316] pb-0.5" />
          )
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-[#0F172A] truncate">{value}</p>
            {label.toLowerCase().includes('correo') && (
              <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 font-bold flex-shrink-0">
                <Check className="w-2.5 h-2.5" /> Verificado
              </span>
            )}
          </div>
        )}
        {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
      </div>
      {nonEditable && (
        <span className="text-[10px] text-gray-300 italic flex-shrink-0">No editable</span>
      )}
    </div>
  );
}

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selections, setSelections] = useState<TransporterShipmentSelection[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState('');

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    vehicleType: user?.vehicleType || '',
    dni: user?.dni || '',
    address: user?.address || '',
    ruc: user?.ruc || '',
    licenseNumber: user?.licenseNumber || '',
  });

  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatar]);

  useEffect(() => {
    let active = true;
    const loadStatsData = async () => {
      if (!user) return;
      try {
        setStatsLoading(true);
        if (user.role === 'client') {
          const data = await fetchShipments();
          if (active) setShipments(data);
        } else if (user.role === 'transporter') {
          const data = await fetchTransporterSelections();
          if (active) setSelections(data);
        }
      } catch (err) {
        console.error('Error loading stats for profile:', err);
      } finally {
        if (active) setStatsLoading(false);
      }
    };

    loadStatsData();
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        vehicleType: user.vehicleType || '',
        dni: user.dni || '',
        address: user.address || '',
        ruc: user.ruc || '',
        licenseNumber: user.licenseNumber || '',
      });
    }
  }, [user]);

  const save = async () => {
    if (!user) return;
    setLoading(true);
    setErrors({});
    setErrorMsg('');
    setSuccessMsg('');
    try {
      if (user.role === 'transporter') {
        const updated = await patchTransporterProfile(user.id, {
          full_name: form.name,
          phone: form.phone || null,
          ruc: form.ruc || null,
          license_number: form.licenseNumber || null,
          vehicle_description: form.vehicleType || null,
        });
        updateUser({
          name: updated.full_name,
          phone: updated.phone || undefined,
          ruc: updated.ruc || undefined,
          licenseNumber: updated.license_number || undefined,
          vehicleType: updated.vehicle_description || undefined,
          document: updated.ruc ? `RUC: ${updated.ruc}` : undefined,
        });
      } else {
        const updated = await patchClientProfile(user.id, {
          full_name: form.name,
          phone: form.phone || null,
          dni: form.dni || null,
          address: form.address || null,
        });
        updateUser({
          name: updated.full_name,
          phone: updated.phone || undefined,
          dni: updated.dni || undefined,
          address: updated.address || undefined,
          document: updated.dni ? `DNI: ${updated.dni}` : undefined,
        });
      }
      setSuccessMsg('Perfil actualizado correctamente.');
      setEditing(false);
    } catch (err: any) {
      console.error(err);
      if (err.data && typeof err.data === 'object') {
        const fieldErrors: Record<string, string> = {};
        for (const [key, val] of Object.entries(err.data)) {
          let formKey = key;
          if (key === 'full_name') formKey = 'name';
          if (key === 'license_number') formKey = 'licenseNumber';
          if (key === 'vehicle_description') formKey = 'vehicleType';

          if (Array.isArray(val) && val.length > 0) {
            fieldErrors[formKey] = val[0];
          } else if (typeof val === 'string') {
            fieldErrors[formKey] = val;
          }
        }
        setErrors(fieldErrors);
        setErrorMsg('Por favor corrige los errores del formulario.');
      } else {
        setErrorMsg(err.message || 'Ocurrió un error al actualizar el perfil.');
      }
    } finally {
      setLoading(false);
    }
  };

  const cancel = () => {
    if (user) {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        vehicleType: user.vehicleType || '',
        dni: user.dni || '',
        address: user.address || '',
        ruc: user.ruc || '',
        licenseNumber: user.licenseNumber || '',
      });
    }
    setErrors({});
    setErrorMsg('');
    setSuccessMsg('');
    setEditing(false);
  };

  const clientStats = (() => {
    if (statsLoading) {
      return [
        { label: 'Envíos realizados', value: 'Cargando...' },
        { label: 'Transportistas usados', value: 'Cargando...' },
        { label: 'Tiempo promedio', value: 'Cargando...' },
        { label: 'Total invertido', value: 'Cargando...' },
      ];
    }

    const totalCount = shipments.length;

    const uniqueTransporters = new Set(
      shipments
        .flatMap(s => s.selections || [])
        .filter(sel => sel.status === 'ACEPTADO')
        .map(sel => sel.transporter?.id)
        .filter(Boolean)
    );
    const transportersUsedCount = uniqueTransporters.size;

    const completed = shipments.filter(s => s.status === 'ENTREGADO');
    let avgHours = 0;
    if (completed.length > 0) {
      const totalMs = completed.reduce((sum, s) => {
        const deliveredEntry = s.tracking_entries?.find(t => t.status === 'ENTREGADO');
        const startMs = new Date(s.created_at).getTime();
        const endMs = deliveredEntry ? new Date(deliveredEntry.created_at).getTime() : new Date(s.updated_at).getTime();
        return sum + (endMs - startMs);
      }, 0);
      avgHours = totalMs / completed.length / (1000 * 60 * 60);
    }
    const timeAverageStr = avgHours > 0 ? `${avgHours.toFixed(1)} hrs` : '0 hrs';

    const totalSpent = shipments
      .filter(s => s.status !== 'CANCELADO')
      .reduce((sum, s) => sum + parseFloat(s.price || '0'), 0);
    const totalSpentStr = `S/. ${totalSpent.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

    return [
      { label: 'Envíos realizados', value: String(totalCount) },
      { label: 'Transportistas usados', value: String(transportersUsedCount) },
      { label: 'Tiempo promedio', value: timeAverageStr },
      { label: 'Total invertido', value: totalSpentStr },
    ];
  })();

  const transporterStats = (() => {
    if (statsLoading) {
      return [
        { label: 'Envíos completados', value: 'Cargando...' },
        { label: 'Tasa de aceptación', value: 'Cargando...' },
        { label: 'Tiempo promedio', value: 'Cargando...' },
        { label: 'Clientes recurrentes', value: 'Cargando...' },
      ];
    }

    const completedSels = selections.filter(sel => sel.shipment?.status === 'ENTREGADO');
    const completedCount = completedSels.length;

    const acceptedCount = selections.filter(sel => sel.status === 'ACEPTADO').length;
    const rejectedCount = selections.filter(sel => sel.status === 'RECHAZADO').length;
    const totalResponded = acceptedCount + rejectedCount;
    const acceptanceRate = totalResponded > 0 ? Math.round((acceptedCount / totalResponded) * 100) : 100;
    const acceptanceRateStr = `${acceptanceRate}%`;

    let avgHours = 0;
    if (completedSels.length > 0) {
      const totalMs = completedSels.reduce((sum, sel) => {
        const s = sel.shipment;
        const startEntry = s.tracking_entries?.find(t => t.status === 'EN_TRANSITO') || s.tracking_entries?.find(t => t.status === 'ACEPTADO');
        const startMs = startEntry ? new Date(startEntry.created_at).getTime() : new Date(sel.created_at).getTime();
        const deliveredEntry = s.tracking_entries?.find(t => t.status === 'ENTREGADO');
        const endMs = deliveredEntry ? new Date(deliveredEntry.created_at).getTime() : new Date(s.updated_at).getTime();
        return sum + (endMs - startMs);
      }, 0);
      avgHours = totalMs / completedSels.length / (1000 * 60 * 60);
    }
    const timeAverageStr = avgHours > 0 ? `${avgHours.toFixed(1)} hrs` : '0 hrs';

    const clientCounts: Record<string, number> = {};
    selections.forEach(sel => {
      const clientId = sel.shipment?.client?.id;
      if (clientId) {
        clientCounts[clientId] = (clientCounts[clientId] || 0) + 1;
      }
    });
    const recurrentClientsCount = Object.values(clientCounts).filter(count => count > 1).length;

    return [
      { label: 'Envíos completados', value: String(Math.max(user?.completedShipments || 0, completedCount)) },
      { label: 'Tasa de aceptación', value: acceptanceRateStr },
      { label: 'Tiempo promedio', value: timeAverageStr },
      { label: 'Clientes recurrentes', value: String(recurrentClientsCount) },
    ];
  })();

  const now = new Date();
  const shipmentsThisMonthCount = shipments.filter(s => {
    const d = new Date(s.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const completedCount = shipments.filter(s => s.status === 'ENTREGADO').length;
  const inProgressCount = shipments.filter(s => s.status !== 'ENTREGADO' && s.status !== 'CANCELADO').length;

  const ratingCount = Math.max(user?.completedShipments || 0, selections.filter(sel => sel.shipment?.status === 'ENTREGADO').length);
  const ratingValue = user?.rating || 0;

  const ratingBreakdown = (() => {
    if (ratingCount === 0) {
      return [
        { stars: 5, count: 0, pct: 0 },
        { stars: 4, count: 0, pct: 0 },
        { stars: 3, count: 0, pct: 0 },
        { stars: 2, count: 0, pct: 0 },
        { stars: 1, count: 0, pct: 0 },
      ];
    }
    const breakdown = [0, 0, 0, 0, 0];
    let remainingRatings = ratingCount;
    let targetSum = ratingValue * ratingCount;

    for (let i = 4; i >= 0; i--) {
      const star = i + 1;
      if (i === 0) {
        breakdown[i] = remainingRatings;
      } else {
        const maxForStar = Math.min(
          remainingRatings,
          Math.floor((targetSum - remainingRatings + 1) / star)
        );
        const allocated = Math.max(0, maxForStar);
        breakdown[i] = allocated;
        remainingRatings -= allocated;
        targetSum -= allocated * star;
      }
    }

    return [5, 4, 3, 2, 1].map(stars => {
      const count = breakdown[stars - 1];
      const pct = ratingCount > 0 ? Math.round((count / ratingCount) * 100) : 0;
      return { stars, count, pct };
    });
  })();



  const handleApplyAvatar = async () => {
    if (!user) return;
    setLoading(true);
    setErrorMsg('');
    try {
      if (user.role === 'transporter') {
        const updated = await patchTransporterProfile(user.id, {
          avatar_url: selectedAvatarUrl || null,
        });
        updateUser({
          avatar: updated.avatar_url || undefined,
        });
      } else {
        const updated = await patchClientProfile(user.id, {
          avatar_url: selectedAvatarUrl || null,
        });
        updateUser({
          avatar: updated.avatar_url || undefined,
        });
      }
      setSuccessMsg('Foto de perfil actualizada correctamente.');
      setShowAvatarModal(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al actualizar la foto de perfil en el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 lg:p-7 max-w-5xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#0F172A]">Mi Perfil</h1>
        <p className="text-gray-400 text-sm mt-0.5">Gestiona tu información personal y preferencias</p>
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        {/* Main profile card */}
        <div className="xl:col-span-2 space-y-5">
          <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-6">
            {/* Avatar + header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#0F172A] to-[#334155] flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                    {user?.avatar && !avatarError ? (
                      <img
                        src={user.avatar}
                        alt=""
                        className="w-full h-full object-cover"
                        width={80}
                        height={80}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <span className="text-white text-2xl font-extrabold">{user?.name?.charAt(0)}</span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedAvatarUrl(user?.avatar || '');
                      setErrorMsg('');
                      setShowAvatarModal(true);
                    }}
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#F97316] rounded-full flex items-center justify-center border-2 border-white hover:bg-[#ea6b0e] transition-colors shadow-md"
                  >
                    <Camera className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-[#0F172A]">{editing ? form.name : user?.name}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${user?.role === 'transporter' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-[#F97316]'}`}>
                      {user?.role === 'transporter' ? '🚚 Transportista' : '🏢 Cliente'}
                    </span>
                    {user?.googleLinked && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-100 rounded-full">
                        <GoogleIcon />
                        <span className="text-xs text-blue-600 font-semibold">Cuenta Google</span>
                      </span>
                    )}
                  </div>
                  {user?.role === 'transporter' && (
                    <div className="flex items-center gap-2 mt-2">
                      <StarRow rating={user.rating || 0} />
                      <span className="text-sm font-extrabold text-[#0F172A]">{user.rating}</span>
                      <span className="text-xs text-gray-400">({user.completedShipments} envíos)</span>
                    </div>
                  )}
                </div>
              </div>

              {!editing ? (
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-[10px] text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all flex-shrink-0">
                  <Edit2 className="w-4 h-4" /> Editar
                </button>
              ) : (
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={save} disabled={loading}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-[#F97316] text-white rounded-[10px] text-sm font-bold hover:bg-[#ea6b0e] transition-all hover:scale-[1.02] shadow-md shadow-orange-200 disabled:opacity-50 disabled:pointer-events-none">
                    <Check className="w-4 h-4" /> {loading ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button onClick={cancel} disabled={loading}
                    className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 rounded-[10px] text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-50">
                    <X className="w-4 h-4" /> Cancelar
                  </button>
                </div>
              )}
            </div>

            {successMsg && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-[10px] text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-[10px] text-xs font-semibold flex items-center gap-2">
                <X className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Info fields */}
            <div className="space-y-3">
              <InfoRow icon={User} label="Nombre completo" value={user?.name || ''} editing={editing}
                editValue={form.name} onEditChange={v => setForm(f => ({ ...f, name: v }))} error={errors.name} />
              <InfoRow icon={Mail} label="Correo electrónico" value={user?.email || ''} nonEditable />
              <InfoRow icon={Phone} label="Teléfono" value={user?.phone || ''} editing={editing}
                editValue={form.phone} onEditChange={v => setForm(f => ({ ...f, phone: v }))} error={errors.phone} />
              {user?.role === 'client' && (
                <>
                  <InfoRow icon={Shield} label="DNI" value={user?.dni || ''} editing={editing}
                    editValue={form.dni} onEditChange={v => setForm(f => ({ ...f, dni: v }))} error={errors.dni} />
                  <InfoRow icon={MapPin} label="Dirección" value={user?.address || ''} editing={editing}
                    editValue={form.address} onEditChange={v => setForm(f => ({ ...f, address: v }))} error={errors.address} />
                </>
              )}
              {user?.role === 'transporter' && (
                <>
                  <InfoRow icon={Shield} label="RUC" value={user?.ruc || ''} editing={editing}
                    editValue={form.ruc} onEditChange={v => setForm(f => ({ ...f, ruc: v }))} error={errors.ruc} />
                  <InfoRow icon={Award} label="Brevete / Licencia" value={user?.licenseNumber || ''} editing={editing}
                    editValue={form.licenseNumber} onEditChange={v => setForm(f => ({ ...f, licenseNumber: v }))} error={errors.licenseNumber} />
                  <InfoRow icon={Truck} label="Vehículo / Tipo de transporte" value={user?.vehicleType || ''}
                    editing={editing} editValue={form.vehicleType}
                    onEditChange={v => setForm(f => ({ ...f, vehicleType: v }))} select={VEHICLE_TYPES} error={errors.vehicleType} />
                </>
              )}
            </div>
          </div>

          {/* Security */}
          <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-5">
            <h3 className="text-[#0F172A] font-bold text-sm mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#F97316]" /> Seguridad de la cuenta
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {user?.googleLinked ? (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-[10px] border border-blue-100">
                  <GoogleIcon />
                  <div>
                    <p className="text-xs font-bold text-blue-700">Vinculado con Google</p>
                    <p className="text-[10px] text-blue-400">Inicio de sesión seguro con OAuth</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-[10px] border border-gray-100">
                  <Shield className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs font-bold text-gray-600">Contraseña establecida</p>
                    <button className="text-[10px] text-[#F97316] hover:underline">Cambiar contraseña</button>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-[10px] border border-green-100">
                <Check className="w-4 h-4 text-green-500" />
                <div>
                  <p className="text-xs font-bold text-green-700">Correo verificado</p>
                  <p className="text-[10px] text-green-500">{user?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Stats */}
          <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-5">
            <h3 className="text-[#0F172A] font-bold text-sm mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-[#F97316]" /> Estadísticas
            </h3>
            <div className="space-y-3">
              {(user?.role === 'transporter' ? transporterStats : clientStats).map(item => (
                <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-500">{item.label}</span>
                  <span className="text-sm font-extrabold text-[#0F172A]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rating breakdown (transporter) */}
          {user?.role === 'transporter' && (
            <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-5">
              <h3 className="text-[#0F172A] font-bold text-sm mb-4 flex items-center gap-2">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> Calificaciones
              </h3>
              <div className="text-center mb-5">
                <div className="text-4xl font-extrabold text-[#0F172A] mb-1">{user.rating}</div>
                <StarRow rating={user.rating || 0} />
                <p className="text-xs text-gray-400 mt-1.5">{user.completedShipments} evaluaciones en total</p>
              </div>
              <div className="space-y-2">
                {ratingBreakdown.map(r => (
                  <div key={r.stars} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-3 text-right">{r.stars}</span>
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" />
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full transition-all duration-700" style={{ width: `${r.pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-6 text-right font-medium">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Badges (transporter) */}
          {user?.role === 'transporter' && (
            <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-5">
              <h3 className="text-[#0F172A] font-bold text-sm mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-[#F97316]" /> Logros y distinciones
              </h3>
              <div className="grid grid-cols-3 gap-2.5">
                {BADGES.map(b => (
                  <div key={b.label} className={`text-center p-3 rounded-[10px] transition-all ${b.earned ? 'bg-amber-50 border border-amber-100' : 'bg-gray-50 opacity-40 grayscale'}`}>
                    <div className="text-2xl mb-1.5">{b.icon}</div>
                    <p className="text-[10px] text-gray-600 leading-tight font-medium">{b.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Client history summary */}
          {user?.role === 'client' && (
            <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-[16px] p-5 text-white">
              <Package className="w-7 h-7 text-[#F97316] mb-3" />
              <h3 className="font-bold text-sm mb-1">Historial de envíos</h3>
              <p className="text-3xl font-extrabold mb-0.5">{statsLoading ? '...' : shipments.length}</p>
              <p className="text-slate-400 text-xs mb-4">Envíos registrados en total</p>
              <div className="space-y-2">
                {[
                  { label: 'Este mes', value: statsLoading ? '...' : String(shipmentsThisMonthCount) },
                  { label: 'Completados', value: statsLoading ? '...' : String(completedCount) },
                  { label: 'En proceso', value: statsLoading ? '...' : String(inProgressCount) },
                ].map(item => (
                  <div key={item.label} className="flex justify-between text-xs">
                    <span className="text-slate-400">{item.label}</span>
                    <span className="text-white font-bold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Avatar Selection Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-extrabold text-[#0F172A]">Cambiar Foto de Perfil</h3>
                <p className="text-xs text-gray-400 mt-0.5">Elige una de nuestras ilustraciones predeterminadas</p>
              </div>
              <button
                onClick={() => setShowAvatarModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Preview */}
              <div className="flex flex-col items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#0F172A] to-[#334155] flex items-center justify-center overflow-hidden border-4 border-orange-100 shadow-md">
                  {selectedAvatarUrl ? (
                    <img src={selectedAvatarUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-3xl font-extrabold">{user?.name?.charAt(0)}</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-2 font-semibold">Vista previa de tu perfil</p>
              </div>

              {/* Presets section */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">Ilustraciones predeterminadas</h4>
                <div className="grid grid-cols-3 gap-3">
                  {PRESET_AVATARS.map((url, idx) => {
                    const isSelected = selectedAvatarUrl === url;
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedAvatarUrl(url)}
                        className={`relative aspect-square rounded-[12px] overflow-hidden border-2 transition-all hover:scale-105 ${isSelected ? 'border-[#F97316] shadow-md shadow-orange-100 ring-2 ring-orange-500/20' : 'border-gray-150 hover:border-gray-300'}`}
                      >
                        <img src={url} alt={`Avatar predeterminado ${idx + 1}`} className="w-full h-full object-cover" />
                        {isSelected && (
                          <div className="absolute inset-0 bg-[#F97316]/10 flex items-center justify-center">
                            <div className="w-5 h-5 bg-[#F97316] rounded-full flex items-center justify-center border-2 border-white shadow">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-gray-50/80 border-t border-gray-100 flex gap-3 justify-end rounded-b-[24px]">
              <button
                onClick={() => setShowAvatarModal(false)}
                disabled={loading}
                className="px-4 py-2 border border-gray-200 rounded-[10px] text-sm font-semibold text-gray-500 hover:bg-white transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleApplyAvatar}
                disabled={loading || !selectedAvatarUrl}
                className="px-5 py-2 bg-[#F97316] text-white rounded-[10px] text-sm font-bold hover:bg-[#ea6b0e] transition-all hover:scale-[1.02] shadow-md shadow-orange-200 disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? 'Guardando...' : 'Aplicar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
