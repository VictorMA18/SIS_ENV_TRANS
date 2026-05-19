import { useNavigate } from 'react-router';
import {
  Package, CheckCircle, Users, Star, Plus, TrendingUp, Eye, ArrowRight, MoreHorizontal,
} from 'lucide-react';
import { useAuth } from '../../context/auth';

const SHIPMENTS = [
  { id: 'ENV-2024-001', origin: 'Miraflores', destination: 'San Isidro', status: 'En tránsito', transporter: 'Carlos Rodríguez', weight: '15 kg', date: '03/05/2026', amount: 'S/. 45' },
  { id: 'ENV-2024-002', origin: 'Barranco', destination: 'Surco', status: 'Entregado', transporter: 'Miguel Quispe', weight: '8 kg', date: '02/05/2026', amount: 'S/. 30' },
  { id: 'ENV-2024-003', origin: 'Lince', destination: 'Magdalena', status: 'Aceptado', transporter: 'Luis Vargas', weight: '22 kg', date: '04/05/2026', amount: 'S/. 65' },
  { id: 'ENV-2024-004', origin: 'Jesús María', destination: 'Pueblo Libre', status: 'Registrado', transporter: '—', weight: '5 kg', date: '05/05/2026', amount: 'S/. 20' },
  { id: 'ENV-2024-005', origin: 'La Molina', destination: 'Ate', status: 'Seleccionado', transporter: 'Rosa Huanca', weight: '30 kg', date: '01/05/2026', amount: 'S/. 80' },
];

const STATUS_CFG: Record<string, { bg: string; dot: string; text: string }> = {
  'Registrado': { bg: 'bg-gray-100', dot: 'bg-gray-400', text: 'text-gray-600' },
  'Seleccionado': { bg: 'bg-blue-50', dot: 'bg-blue-500', text: 'text-blue-600' },
  'Aceptado': { bg: 'bg-indigo-50', dot: 'bg-indigo-500', text: 'text-indigo-600' },
  'En tránsito': { bg: 'bg-amber-50', dot: 'bg-amber-500', text: 'text-amber-600' },
  'Entregado': { bg: 'bg-green-50', dot: 'bg-green-500', text: 'text-green-600' },
};

function Badge({ status }: { status: string }) {
  const c = STATUS_CFG[status] || STATUS_CFG['Registrado'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
}

export function ClientDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const stats = [
    { label: 'Envíos activos', value: '3', icon: Package, color: '#F97316', bg: 'bg-orange-50', iconBg: 'bg-orange-100', trend: '+2 esta semana' },
    { label: 'Entregados', value: '24', icon: CheckCircle, color: '#10B981', bg: 'bg-green-50', iconBg: 'bg-green-100', trend: '+5 este mes' },
    { label: 'Disponibles', value: '47', icon: Users, color: '#3B82F6', bg: 'bg-blue-50', iconBg: 'bg-blue-100', trend: 'En tu zona' },
    { label: 'Calificación prom.', value: '4.8', icon: Star, color: '#F59E0B', bg: 'bg-amber-50', iconBg: 'bg-amber-100', trend: 'Excelente' },
  ];

  return (
    <div className="p-5 lg:p-7">
      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] mb-0.5">
            Hola, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-400 text-sm">Aquí está el resumen de tus envíos distritales</p>
        </div>
        <button
          onClick={() => navigate('/app/client/new-shipment')}
          className="flex items-center gap-2 bg-[#F97316] text-white px-4 py-2.5 rounded-[10px] font-semibold text-sm hover:bg-[#ea6b0e] transition-all hover:scale-[1.02] shadow-md shadow-orange-200/80 flex-shrink-0 ml-4">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo Envío</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-[16px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.1)] transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-11 h-11 ${s.iconBg} rounded-[12px] flex items-center justify-center`}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-3xl font-extrabold text-[#0F172A] mb-1">{s.value}</div>
            <div className="text-xs text-gray-500 mb-1.5 font-medium">{s.label}</div>
            <div className="text-xs text-green-500 font-medium">{s.trend}</div>
          </div>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid xl:grid-cols-3 gap-6">
        {/* Shipments table */}
        <div className="xl:col-span-2 bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-[#0F172A] font-bold text-base">Envíos Recientes</h2>
              <p className="text-gray-400 text-xs mt-0.5">Últimas solicitudes de envío</p>
            </div>
            <button className="text-xs text-[#F97316] hover:underline flex items-center gap-1 font-medium">
              Ver todos <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Table header */}
          <div className="hidden md:grid grid-cols-[1.5fr_1.2fr_1fr_0.6fr] gap-4 px-5 py-2.5 bg-gray-50 border-b border-gray-100">
            {['ID / Ruta', 'Transportista', 'Estado', 'Acción'].map(h => (
              <span key={h} className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{h}</span>
            ))}
          </div>

          <div className="divide-y divide-gray-50">
            {SHIPMENTS.map(s => (
              <div key={s.id} className="px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center justify-between md:grid md:grid-cols-[1.5fr_1.2fr_1fr_0.6fr] gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#0F172A]">{s.id}</div>
                    <div className="text-xs text-gray-500 mt-0.5 truncate">
                      <span className="text-green-600">●</span> {s.origin} → <span className="text-red-500">●</span> {s.destination}
                    </div>
                    <div className="text-[10px] text-gray-300 mt-0.5">{s.date} · {s.weight}</div>
                  </div>
                  <div className="hidden md:block min-w-0">
                    <div className="text-sm text-[#0F172A] truncate">{s.transporter}</div>
                    <div className="text-xs text-[#F97316] font-semibold">{s.amount}</div>
                  </div>
                  <div className="hidden md:flex items-center">
                    <Badge status={s.status} />
                  </div>
                  <div className="hidden md:flex items-center gap-1.5">
                    <button
                      onClick={() => navigate(`/app/client/tracking/${s.id}`)}
                      className="p-2 rounded-[8px] hover:bg-orange-50 text-gray-400 hover:text-[#F97316] transition-colors"
                      title="Ver seguimiento">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-[8px] hover:bg-gray-100 text-gray-400 transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Mobile view */}
                  <div className="md:hidden flex flex-col items-end gap-1.5">
                    <Badge status={s.status} />
                    <button onClick={() => navigate(`/app/client/tracking/${s.id}`)}
                      className="text-xs text-[#F97316] font-medium">Ver →</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Monthly summary */}
          <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-5">
            <h3 className="text-[#0F172A] font-bold text-sm mb-4">Resumen del mes</h3>
            <div className="space-y-3">
              {[
                { label: 'Total gastado', value: 'S/. 340', color: 'text-[#0F172A]' },
                { label: 'Completados', value: '8', color: 'text-green-600' },
                { label: 'En proceso', value: '3', color: 'text-amber-600' },
                { label: 'Tiempo promedio', value: '2.3 hrs', color: 'text-blue-600' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-500">{item.label}</span>
                  <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity */}
          <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-5">
            <h3 className="text-[#0F172A] font-bold text-sm mb-4">Actividad reciente</h3>
            <div className="space-y-3">
              {[
                { text: 'Carlos aceptó tu envío ENV-001', time: '5 min', color: 'bg-green-400' },
                { text: 'Nuevo envío registrado ENV-004', time: '2 hrs', color: 'bg-blue-400' },
                { text: 'ENV-002 entregado exitosamente', time: '1 día', color: 'bg-green-400' },
                { text: 'ENV-005 en tránsito hacia destino', time: '2 días', color: 'bg-amber-400' },
              ].map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${a.color}`} />
                  <div>
                    <p className="text-xs text-[#0F172A] leading-relaxed">{a.text}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Hace {a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA card */}
          <div className="bg-gradient-to-br from-[#F97316] to-[#ea6b0e] rounded-[16px] p-5 text-white shadow-lg shadow-orange-200">
            <Package className="w-8 h-8 mb-3 opacity-90" />
            <h3 className="font-bold mb-1.5 text-base">¿Necesitas enviar algo?</h3>
            <p className="text-sm opacity-85 mb-4 leading-relaxed">Crea un envío en segundos y encuentra al transportista ideal en tu distrito.</p>
            <button
              onClick={() => navigate('/app/client/new-shipment')}
              className="flex items-center gap-2 bg-white text-[#F97316] text-sm font-bold px-4 py-2.5 rounded-[8px] hover:bg-orange-50 transition-all hover:scale-[1.02]">
              <Plus className="w-4 h-4" />
              Nuevo Envío
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
