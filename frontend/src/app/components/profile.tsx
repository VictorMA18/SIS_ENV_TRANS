import { useEffect, useState } from 'react';
import { User, Mail, Phone, Shield, Star, Package, Edit2, Check, X, Camera, Award, Truck } from 'lucide-react';
import { useAuth } from '../context/auth';

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
  const [avatarError, setAvatarError] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    vehicleType: user?.vehicleType || '',
  });

  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatar]);

  const save = () => {
    updateUser(form);
    setEditing(false);
  };

  const cancel = () => {
    setForm({ name: user?.name || '', phone: user?.phone || '', vehicleType: user?.vehicleType || '' });
    setEditing(false);
  };

  const clientStats = [
    { label: 'Envíos realizados', value: '24' },
    { label: 'Transportistas usados', value: '8' },
    { label: 'Tiempo promedio', value: '2.5 hrs' },
    { label: 'Total invertido', value: 'S/. 1,240' },
  ];

  const transporterStats = [
    { label: 'Envíos completados', value: String(user?.completedShipments || 0) },
    { label: 'Tasa de aceptación', value: '94%' },
    { label: 'Tiempo promedio', value: '2.1 hrs' },
    { label: 'Clientes recurrentes', value: '28' },
  ];

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
                  <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#F97316] rounded-full flex items-center justify-center border-2 border-white hover:bg-[#ea6b0e] transition-colors shadow-md">
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
                  <button onClick={save}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-[#F97316] text-white rounded-[10px] text-sm font-bold hover:bg-[#ea6b0e] transition-all hover:scale-[1.02] shadow-md shadow-orange-200">
                    <Check className="w-4 h-4" /> Guardar
                  </button>
                  <button onClick={cancel}
                    className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 rounded-[10px] text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-all">
                    <X className="w-4 h-4" /> Cancelar
                  </button>
                </div>
              )}
            </div>

            {/* Info fields */}
            <div className="space-y-3">
              <InfoRow icon={User} label="Nombre completo" value={user?.name || ''} editing={editing}
                editValue={form.name} onEditChange={v => setForm(f => ({ ...f, name: v }))} />
              <InfoRow icon={Mail} label="Correo electrónico" value={user?.email || ''} nonEditable />
              <InfoRow icon={Phone} label="Teléfono" value={user?.phone || ''} editing={editing}
                editValue={form.phone} onEditChange={v => setForm(f => ({ ...f, phone: v }))} />
              <InfoRow icon={Shield} label="Documento de identidad" value={user?.document || ''} nonEditable />
              {user?.role === 'transporter' && (
                <InfoRow icon={Truck} label="Vehículo / Tipo de transporte" value={user?.vehicleType || ''}
                  editing={editing} editValue={form.vehicleType}
                  onEditChange={v => setForm(f => ({ ...f, vehicleType: v }))} select={VEHICLE_TYPES} />
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
                {RATING_BREAKDOWN.map(r => (
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
              <p className="text-3xl font-extrabold mb-0.5">24</p>
              <p className="text-slate-400 text-xs mb-4">Envíos realizados desde mayo 2025</p>
              <div className="space-y-2">
                {[
                  { label: 'Este mes', value: '8' },
                  { label: 'Completados', value: '22' },
                  { label: 'En proceso', value: '2' },
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
    </div>
  );
}
