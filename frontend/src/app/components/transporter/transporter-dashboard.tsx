import { useState } from 'react';
import { CheckCircle, Star, Package, Truck, TrendingUp, Check, X, ChevronDown, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/auth';

const INIT_REQUESTS = [
  { id: 'ENV-2024-006', client: 'Empresa XYZ S.A.C.', origin: 'Lince', destination: 'San Borja', weight: '18 kg', date: '05/05/2026', description: 'Equipos electrónicos', price: 'S/. 55', urgent: false },
  { id: 'ENV-2024-007', client: 'Comercial Ramos EIRL', origin: 'Breña', destination: 'Jesús María', weight: '35 kg', date: '05/05/2026', description: 'Mercadería textil', price: 'S/. 70', urgent: true },
  { id: 'ENV-2024-008', client: 'Distribuidora Lima SAC', origin: 'Rímac', destination: 'Cercado de Lima', weight: '12 kg', date: '06/05/2026', description: 'Productos farmacéuticos', price: 'S/. 40', urgent: false },
];

const INIT_ACTIVE = [
  { id: 'ENV-2024-003', client: 'María García López', origin: 'Miraflores', destination: 'San Isidro', status: 'En tránsito', price: 'S/. 45' },
  { id: 'ENV-2024-001', client: 'Pedro Ramírez Castro', origin: 'Barranco', destination: 'Surco', status: 'Aceptado', price: 'S/. 38' },
];

const STATUS_CFG: Record<string, { bg: string; text: string; dot: string }> = {
  'Aceptado': { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  'En tránsito': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  'Entregado': { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
};

export function TransporterDashboard() {
  const { user } = useAuth();
  const [available, setAvailable] = useState(true);
  const [requests, setRequests] = useState(INIT_REQUESTS);
  const [active, setActive] = useState(INIT_ACTIVE);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const accept = (id: string) => {
    const req = requests.find(r => r.id === id);
    if (req) setActive(p => [{ id: req.id, client: req.client, origin: req.origin, destination: req.destination, status: 'Aceptado', price: req.price }, ...p]);
    setRequests(p => p.filter(r => r.id !== id));
  };

  const reject = (id: string) => setRequests(p => p.filter(r => r.id !== id));

  const updateStatus = (id: string, status: string) => {
    setActive(p => p.map(s => s.id === id ? { ...s, status } : s));
    setOpenDropdown(null);
  };

  return (
    <div className="p-5 lg:p-7" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] mb-0.5">
            Hola, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-400 text-sm">Panel de transportista · {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>

        {/* Availability toggle */}
        <button
          onClick={() => setAvailable(a => !a)}
          className={`flex items-center gap-3 px-4 py-3 rounded-[12px] border-2 transition-all hover:scale-[1.02] ${available ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'}`}>
          <div className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${available ? 'bg-green-500' : 'bg-gray-200'}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${available ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
          <div className="text-left">
            <p className={`text-xs font-bold leading-tight ${available ? 'text-green-700' : 'text-gray-500'}`}>
              {available ? 'Disponible' : 'No disponible'}
            </p>
            <p className="text-[10px] text-gray-400">Estado actual</p>
          </div>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
        {[
          { label: 'Envíos completados', value: user?.completedShipments || 127, icon: CheckCircle, color: '#10B981', iconBg: 'bg-green-100', trend: '+12 este mes', sub: null },
          { label: 'Calificación promedio', value: user?.rating || 4.8, icon: Star, color: '#F59E0B', iconBg: 'bg-amber-100', trend: 'Excelente reputación', sub: '★★★★★' },
          { label: 'Solicitudes pendientes', value: requests.length, icon: Package, color: '#F97316', iconBg: 'bg-orange-100', trend: 'Nuevas hoy', sub: null },
          { label: 'Ingresos del mes', value: 'S/. 1,250', icon: TrendingUp, color: '#3B82F6', iconBg: 'bg-blue-100', trend: '+15% vs anterior', sub: null },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-[16px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.10)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-11 h-11 ${s.iconBg} rounded-[12px] flex items-center justify-center`}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              {s.sub && <span className="text-xs text-amber-500 font-bold">{s.sub}</span>}
            </div>
            <div className="text-3xl font-extrabold text-[#0F172A] mb-1">{s.value}</div>
            <div className="text-xs text-gray-500 mb-1.5 font-medium">{s.label}</div>
            <div className="text-xs text-green-500 font-medium">{s.trend}</div>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        {/* Pending requests */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-[#0F172A] font-bold text-base">Solicitudes Pendientes</h2>
                <p className="text-gray-400 text-xs mt-0.5">{requests.length} solicitudes esperando respuesta</p>
              </div>
              {requests.length > 0 && (
                <span className="bg-orange-100 text-[#F97316] text-xs font-bold px-2.5 py-1.5 rounded-full">
                  {requests.length} nuevas
                </span>
              )}
            </div>

            {requests.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium text-sm">No hay solicitudes pendientes</p>
                <p className="text-gray-400 text-xs mt-1">Las nuevas solicitudes aparecerán aquí automáticamente</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {requests.map(req => (
                  <div key={req.id} className="p-5 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-extrabold text-[#0F172A]">{req.id}</span>
                          {req.urgent && (
                            <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">🔴 Urgente</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">Cliente: <span className="text-[#0F172A] font-medium">{req.client}</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-extrabold text-[#F97316]">{req.price}</p>
                        <p className="text-[10px] text-gray-400">Precio estimado</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 mb-5">
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Origen</p>
                        <p className="text-sm text-[#0F172A] font-semibold mt-0.5">{req.origin}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Destino</p>
                        <p className="text-sm text-[#0F172A] font-semibold mt-0.5 flex items-center gap-1.5">
                          <ArrowRight className="w-3 h-3 text-[#F97316]" />{req.destination}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Carga</p>
                        <p className="text-sm text-[#0F172A] mt-0.5">{req.description} <span className="text-gray-400">({req.weight})</span></p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Fecha requerida</p>
                        <p className="text-sm text-[#0F172A] mt-0.5">{req.date}</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button onClick={() => accept(req.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white rounded-[8px] text-sm font-bold hover:bg-green-600 transition-all hover:scale-[1.02] shadow-md shadow-green-200">
                        <Check className="w-4 h-4" /> Aceptar
                      </button>
                      <button onClick={() => reject(req.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border-2 border-red-200 text-red-600 rounded-[8px] text-sm font-bold hover:bg-red-50 transition-all hover:scale-[1.02]">
                        <X className="w-4 h-4" /> Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Active shipments */}
          <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-[#0F172A] font-bold text-sm">Mis Envíos Activos</h2>
              <p className="text-gray-400 text-xs mt-0.5">{active.length} envíos en proceso</p>
            </div>

            {active.length === 0 ? (
              <div className="p-10 text-center">
                <Truck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-xs font-medium">Sin envíos activos</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {active.map(s => {
                  const cfg = STATUS_CFG[s.status] || STATUS_CFG['Aceptado'];
                  const isOpen = openDropdown === s.id;
                  return (
                    <div key={s.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-extrabold text-[#0F172A]">{s.id}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{s.client}</p>
                        </div>
                        <span className="text-sm font-extrabold text-[#F97316]">{s.price}</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                        <span className="text-green-500">●</span> {s.origin}
                        <ArrowRight className="w-3 h-3 text-gray-300" />
                        <span className="text-red-400">●</span> {s.destination}
                      </p>
                      <div className="relative">
                        <button onClick={() => setOpenDropdown(isOpen ? null : s.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-[8px] border text-xs font-bold transition-all ${cfg.bg} ${cfg.text}`}
                          style={{ borderColor: 'transparent' }}>
                          <span className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /> {s.status}
                          </span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-[10px] shadow-[0_8px_24px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden z-20">
                              {['Aceptado', 'En tránsito', 'Entregado'].map(st => (
                                <button key={st} onClick={() => updateStatus(s.id, st)}
                                  className="w-full text-left px-3 py-2.5 text-xs text-[#0F172A] hover:bg-gray-50 transition-colors flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${st === 'Aceptado' ? 'bg-indigo-500' : st === 'En tránsito' ? 'bg-amber-500' : 'bg-green-500'}`} />
                                  {st}
                                  {s.status === st && <Check className="w-3 h-3 text-[#F97316] ml-auto" />}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Earnings card */}
          <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-[16px] p-5 text-white shadow-lg">
            <TrendingUp className="w-7 h-7 text-[#F97316] mb-3" />
            <h3 className="font-bold text-sm mb-1">Ingresos del mes</h3>
            <p className="text-3xl font-extrabold mb-0.5">S/. 1,250</p>
            <p className="text-slate-400 text-xs mb-5">+15% vs. mes anterior</p>
            <div className="space-y-2.5">
              {[
                { label: 'Envíos completados', value: '12' },
                { label: 'Tarifa promedio', value: 'S/. 104' },
                { label: 'Bonos obtenidos', value: 'S/. 85' },
                { label: 'Calificación mes', value: '4.9 ★' },
              ].map(item => (
                <div key={item.label} className="flex justify-between text-xs items-center">
                  <span className="text-slate-400">{item.label}</span>
                  <span className="text-white font-bold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
