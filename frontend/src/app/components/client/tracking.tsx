import { useParams, useNavigate } from 'react-router';
import { MapPin, Truck, Package, CheckCircle, Clock, Star, ArrowLeft, Phone, MessageSquare } from 'lucide-react';

const STATUSES = [
  { key: 'registered', label: 'Registrado', icon: Package },
  { key: 'selected', label: 'Seleccionado', icon: Package },
  { key: 'accepted', label: 'Aceptado', icon: CheckCircle },
  { key: 'transit', label: 'En tránsito', icon: Truck },
  { key: 'delivered', label: 'Entregado', icon: CheckCircle },
];

const STATUS_TIMES = ['03/05 09:15', '03/05 09:32', '03/05 10:05', 'Hoy 11:30', null];

const EVENTS = [
  { text: 'Envío en camino hacia el destino final', time: '11:30', date: 'Hoy', type: 'transit', color: 'bg-amber-500' },
  { text: 'Carlos Rodríguez aceptó el servicio y se desplaza al origen', time: '10:05', date: 'Hoy', type: 'accepted', color: 'bg-green-500' },
  { text: 'Transportista seleccionado por el cliente', time: '09:32', date: 'Hoy', type: 'selected', color: 'bg-blue-500' },
  { text: 'Envío registrado en el sistema CargoDistrict', time: '09:15', date: 'Hoy', type: 'registered', color: 'bg-gray-400' },
];

const CURRENT = 3;

export function TrackingPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="p-5 lg:p-7" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/app/client/dashboard')}
          className="p-2.5 rounded-[10px] hover:bg-gray-100 transition-colors text-gray-500 border border-gray-200">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-[#0F172A]">{id}</h1>
          <p className="text-gray-400 text-xs mt-0.5">Seguimiento en tiempo real</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold text-amber-700">En tránsito</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[#0F172A] font-bold text-sm">Estado del envío</h2>
          <span className="text-xs text-gray-400">Actualizado: Hoy, 11:30</span>
        </div>

        {/* Desktop horizontal */}
        <div className="hidden md:flex items-start">
          {STATUSES.map((s, i) => {
            const done = i < CURRENT;
            const active = i === CURRENT;
            return (
              <div key={s.key} className="flex-1 flex flex-col items-center relative">
                {i < STATUSES.length - 1 && (
                  <div className={`absolute top-[18px] left-1/2 w-full h-0.5 transition-all duration-700 ${i < CURRENT ? 'bg-[#F97316]' : 'bg-gray-200'}`} />
                )}
                <div className={`relative z-10 w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${done
                  ? 'bg-[#F97316] border-[#F97316]'
                  : active
                    ? 'bg-[#F97316] border-[#F97316] shadow-[0_0_0_8px_rgba(249,115,22,0.15)]'
                    : 'bg-white border-gray-200'
                  }`}>
                  {done ? <CheckCircle className="w-4 h-4 text-white" /> : <s.icon className={`w-4 h-4 ${active ? 'text-white' : 'text-gray-300'}`} />}
                  {active && <div className="absolute inset-0 rounded-full border-2 border-[#F97316] animate-ping opacity-25" />}
                </div>
                <p className={`mt-2.5 text-xs font-bold text-center ${active ? 'text-[#F97316]' : done ? 'text-gray-500' : 'text-gray-300'}`}>{s.label}</p>
                {STATUS_TIMES[i] && (
                  <p className="text-[10px] text-gray-400 mt-0.5 text-center">{STATUS_TIMES[i]}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile vertical */}
        <div className="md:hidden space-y-3">
          {STATUSES.map((s, i) => {
            const done = i < CURRENT;
            const active = i === CURRENT;
            return (
              <div key={s.key} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${done ? 'bg-[#F97316] border-[#F97316]' : active ? 'bg-[#F97316] border-[#F97316] shadow-[0_0_0_5px_rgba(249,115,22,0.15)]' : 'bg-white border-gray-200'}`}>
                  {done ? <CheckCircle className="w-4 h-4 text-white" /> : <s.icon className={`w-4 h-4 ${active ? 'text-white' : 'text-gray-300'}`} />}
                </div>
                <div>
                  <p className={`text-sm font-bold ${active ? 'text-[#F97316]' : done ? 'text-gray-600' : 'text-gray-400'}`}>{s.label}</p>
                  {STATUS_TIMES[i] && <p className="text-xs text-gray-400">{STATUS_TIMES[i]}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="grid xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-5">
          {/* Details */}
          <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-5">
            <h3 className="text-[#0F172A] font-bold text-sm mb-4">Detalles del envío</h3>
            <div className="grid grid-cols-2 gap-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-green-50 rounded-[10px] flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">ORIGEN</p>
                  <p className="text-sm font-bold text-[#0F172A]">Miraflores, Lima</p>
                  <p className="text-xs text-gray-400">Av. Larco 123</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-red-50 rounded-[10px] flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">DESTINO</p>
                  <p className="text-sm font-bold text-[#0F172A]">San Isidro, Lima</p>
                  <p className="text-xs text-gray-400">Calle Las Flores 456</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">DESCRIPCIÓN</p>
                <p className="text-sm font-semibold text-[#0F172A]">Cajas de materiales</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">PESO</p>
                <p className="text-sm font-semibold text-[#0F172A]">15 kg</p>
              </div>
            </div>
          </div>

          {/* Transporter */}
          <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-5">
            <h3 className="text-[#0F172A] font-bold text-sm mb-4">Transportista asignado</h3>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#0F172A] flex items-center justify-center flex-shrink-0">
                <span className="text-white font-extrabold text-xl">CR</span>
              </div>
              <div className="flex-1">
                <p className="font-bold text-[#0F172A] text-base">Carlos Rodríguez</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i <= 4 ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                  ))}
                  <span className="text-xs text-gray-500 ml-1">4.9 · 152 envíos</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Camión mediano · Placa: ABC-123</p>
              </div>
              <div className="flex gap-2">
                <button className="w-10 h-10 bg-green-50 border border-green-100 rounded-[10px] flex items-center justify-center hover:bg-green-100 transition-colors">
                  <Phone className="w-4 h-4 text-green-600" />
                </button>
                <button className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-[10px] flex items-center justify-center hover:bg-blue-100 transition-colors">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-[#0F172A] font-bold text-sm">Mapa de seguimiento</h3>
              <span className="text-xs text-green-600 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> En ruta activa
              </span>
            </div>
            <div className="relative h-72 bg-slate-100">
              <svg viewBox="0 0 600 280" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
                <rect width="600" height="280" fill="#E8EFF5" />
                {[40, 80, 120, 160, 200, 240, 280, 320, 360, 400, 440, 480, 520, 560].map(x => (
                  <line key={`v${x}`} x1={x} y1="0" x2={x} y2="280" stroke="#D1DBE7" strokeWidth="1" />
                ))}
                {[40, 80, 120, 160, 200, 240].map(y => (
                  <line key={`h${y}`} x1="0" y1={y} x2="600" y2={y} stroke="#D1DBE7" strokeWidth="1" />
                ))}
                <line x1="0" y1="140" x2="600" y2="140" stroke="#C0CDD9" strokeWidth="3" />
                <line x1="300" y1="0" x2="300" y2="280" stroke="#C0CDD9" strokeWidth="3" />
                <line x1="0" y1="80" x2="600" y2="80" stroke="#C0CDD9" strokeWidth="2" />
                <line x1="0" y1="200" x2="600" y2="200" stroke="#C0CDD9" strokeWidth="2" />
                <line x1="150" y1="0" x2="150" y2="280" stroke="#C0CDD9" strokeWidth="2" />
                <line x1="450" y1="0" x2="450" y2="280" stroke="#C0CDD9" strokeWidth="2" />
                {[[62, 42, 76, 36], [62, 90, 76, 36], [62, 160, 76, 36], [62, 212, 76, 36],
                  [212, 42, 76, 36], [212, 90, 76, 36], [212, 160, 76, 36], [212, 212, 76, 36],
                  [324, 42, 76, 36], [324, 90, 76, 36], [324, 160, 76, 36], [324, 212, 76, 36],
                  [464, 42, 76, 36], [464, 90, 76, 36], [464, 160, 76, 36], [464, 212, 76, 36]].map(([x, y, w, h], i) => (
                  <rect key={i} x={x} y={y} width={w} height={h} rx="2" fill="#F1F5F9" stroke="#DCE7F0" />
                ))}
                <path d="M 130 200 Q 210 160 300 140 Q 390 120 470 100" stroke="#F97316" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 130 200 Q 210 160 300 140 Q 390 120 470 100" stroke="#FED7AA" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
                <circle cx="130" cy="200" r="8" fill="#10B981" />
                <circle cx="130" cy="200" r="14" fill="#10B981" opacity="0.2" />
                <circle cx="130" cy="200" r="4" fill="white" />
                <path d="M 470 88 Q 480 88 480 100 Q 480 112 470 118 Q 460 112 460 100 Q 460 88 470 88" fill="#EF4444" />
                <circle cx="470" cy="100" r="4" fill="white" />
                <rect x="285" y="128" width="30" height="18" rx="3" fill="#F97316" />
                <rect x="274" y="134" width="13" height="12" rx="2" fill="#F97316" />
                <circle cx="282" cy="148" r="4" fill="#1E293B" />
                <circle cx="304" cy="148" r="4" fill="#1E293B" />
                <text x="110" y="220" fontSize="9" fill="#047857" fontWeight="700">Origen</text>
                <text x="450" y="82" fontSize="9" fill="#DC2626" fontWeight="700">Destino</text>
                <text x="4" y="274" fontSize="8" fill="#94A3B8">Lima, Perú · Mapa de seguimiento · CargoDistrict</text>
              </svg>
            </div>
          </div>
        </div>

        {/* Activity log */}
        <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-5 h-fit">
          <h3 className="text-[#0F172A] font-bold text-sm mb-5 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#F97316]" />
            Historial de eventos
          </h3>

          <div className="space-y-0">
            {EVENTS.map((event, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-0.5 ${event.color}`} />
                  {i < EVENTS.length - 1 && <div className="w-0.5 flex-1 bg-gray-100 mt-1 mb-0" style={{ minHeight: '32px' }} />}
                </div>
                <div className={`${i < EVENTS.length - 1 ? 'pb-4' : ''}`}>
                  <p className="text-sm text-[#0F172A] leading-relaxed">{event.text}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 font-medium">{event.date} · {event.time}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 p-4 bg-orange-50 rounded-[12px] border border-orange-100">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-[#F97316]" />
              <p className="text-xs font-bold text-[#F97316]">Llegada estimada</p>
            </div>
            <p className="text-base font-extrabold text-[#0F172A]">Hoy, 13:45</p>
            <p className="text-xs text-gray-500 mt-0.5">En aprox. 2 horas 15 minutos</p>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-[12px] border border-blue-100">
            <p className="text-xs font-bold text-blue-600 mb-1">Distancia restante</p>
            <p className="text-base font-extrabold text-[#0F172A]">4.2 km</p>
            <div className="w-full bg-blue-100 rounded-full h-1.5 mt-2">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: '65%' }} />
            </div>
            <p className="text-[10px] text-blue-400 mt-1">65% del trayecto completado</p>
          </div>
        </div>
      </div>
    </div>
  );
}
