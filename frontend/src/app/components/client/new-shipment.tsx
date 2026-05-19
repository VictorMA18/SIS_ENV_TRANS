import { useState } from 'react';
import { useNavigate } from 'react-router';
import { MapPin, Package, Calendar, Check, Star, ChevronRight, Truck, CheckCircle, Scale, ArrowLeft } from 'lucide-react';

const TRANSPORTERS = [
  { id: 1, name: 'Carlos Rodríguez', rating: 4.9, completed: 152, available: true, vehicle: 'Camión mediano', price: 'S/. 45', initials: 'CR', color: '#0F172A' },
  { id: 2, name: 'Miguel Quispe', rating: 4.7, completed: 98, available: true, vehicle: 'Van de carga', price: 'S/. 38', initials: 'MQ', color: '#1E40AF' },
  { id: 3, name: 'Luis Vargas', rating: 4.6, completed: 75, available: false, vehicle: 'Camioneta', price: 'S/. 35', initials: 'LV', color: '#065F46' },
  { id: 4, name: 'Rosa Huanca', rating: 4.8, completed: 134, available: true, vehicle: 'Camión pequeño', price: 'S/. 42', initials: 'RH', color: '#7C2D12' },
  { id: 5, name: 'Pedro Torres', rating: 4.5, completed: 61, available: true, vehicle: 'Moto de carga', price: 'S/. 25', initials: 'PT', color: '#4C1D95' },
  { id: 6, name: 'Ana Mendoza', rating: 4.9, completed: 189, available: false, vehicle: 'Camión grande', price: 'S/. 70', initials: 'AM', color: '#831843' },
];

const STEPS = ['Datos del envío', 'Seleccionar transportista', 'Confirmación'];

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-3 h-3 ${i <= Math.floor(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
      ))}
      <span className="text-xs text-gray-500 ml-1 font-medium">{rating}</span>
    </div>
  );
}

function Field({
  label, icon: Icon, field, type = 'text', placeholder, value, onChange, error,
}: {
  label: string; icon: React.ElementType; field: string; type?: string;
  placeholder?: string; value: string; onChange: (v: string) => void; error?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      <div className={`flex items-center border rounded-[8px] transition-all ${error ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300 focus-within:border-[#F97316] focus-within:shadow-[0_0_0_3px_rgba(249,115,22,0.1)]'}`}>
        <Icon className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" />
        <input
          type={type}
          placeholder={placeholder || label}
          value={value}
          onChange={e => onChange(e.target.value)}
          min={type === 'date' ? new Date().toISOString().split('T')[0] : undefined}
          className="flex-1 px-3 py-3 bg-transparent outline-none text-sm text-[#0F172A] placeholder-gray-300"
        />
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export function NewShipment() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const [form, setForm] = useState({ origin: '', destination: '', description: '', weight: '', date: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const upd = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
  };

  const validate1 = () => {
    const errs: Record<string, string> = {};
    if (!form.origin) errs.origin = 'Ingresa el origen';
    if (!form.destination) errs.destination = 'Ingresa el destino';
    if (!form.description) errs.description = 'Describe la carga';
    if (!form.weight) errs.weight = 'Ingresa el peso estimado';
    if (!form.date) errs.date = 'Selecciona una fecha';
    setErrors(errs);
    return !Object.keys(errs).length;
  };

  const next = () => {
    if (step === 1 && !validate1()) return;
    if (step === 2 && !selected) return;
    setStep(s => Math.min(s + 1, 3));
  };

  const confirm = () => {
    setConfirmed(true);
    setTimeout(() => navigate('/app/client/dashboard'), 2500);
  };

  const transporter = TRANSPORTERS.find(t => t.id === selected);

  if (confirmed) {
    return (
      <div className="flex items-center justify-center min-h-full p-8">
        <div className="text-center max-w-sm">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-green-200 animate-ping opacity-20" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#0F172A] mb-2">¡Envío confirmado!</h2>
          <p className="text-gray-400 text-sm">Tu envío ha sido registrado exitosamente. Redirigiendo al dashboard...</p>
          <div className="mt-4 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-[#F97316] rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-7 max-w-3xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Back */}
      <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/app/client/dashboard')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 group transition-colors">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        {step > 1 ? 'Paso anterior' : 'Volver al dashboard'}
      </button>

      {/* Stepper */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = step > n;
          const active = step === n;
          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${done ? 'bg-green-500 text-white shadow-md shadow-green-200' : active ? 'bg-[#F97316] text-white shadow-md shadow-orange-200' : 'bg-gray-100 text-gray-400'}`}>
                  {done ? <Check className="w-4 h-4" /> : n}
                </div>
                <div className="hidden sm:block">
                  <p className={`text-xs font-bold ${active ? 'text-[#0F172A]' : done ? 'text-green-600' : 'text-gray-400'}`}>{label}</p>
                  <p className="text-[10px] text-gray-400">
                    {active ? 'Ahora' : done ? 'Completado' : 'Pendiente'}
                  </p>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-3 rounded-full transition-all duration-500 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Card */}
      <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
        {/* Step 1 */}
        {step === 1 && (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-extrabold text-[#0F172A]">Datos del envío</h2>
              <p className="text-gray-400 text-sm mt-1">Completa los detalles de tu envío</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Origen" icon={MapPin} field="origin" value={form.origin} onChange={v => upd('origin', v)} error={errors.origin} placeholder="Ej: Miraflores" />
              <Field label="Destino" icon={MapPin} field="destination" value={form.destination} onChange={v => upd('destination', v)} error={errors.destination} placeholder="Ej: San Isidro" />
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Descripción de la carga</label>
                <div className={`flex border rounded-[8px] transition-all ${errors.description ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300 focus-within:border-[#F97316] focus-within:shadow-[0_0_0_3px_rgba(249,115,22,0.1)]'}`}>
                  <Package className="w-4 h-4 text-gray-400 ml-3 mt-3.5 flex-shrink-0" />
                  <textarea placeholder="Describe el tipo y contenido de tu carga..."
                    value={form.description} onChange={e => upd('description', e.target.value)}
                    className="flex-1 px-3 py-3 bg-transparent outline-none text-sm text-[#0F172A] placeholder-gray-300 resize-none" rows={3} />
                </div>
                {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
              </div>
              <Field label="Peso estimado (kg)" icon={Scale} field="weight" value={form.weight} onChange={v => upd('weight', v)} error={errors.weight} placeholder="Ej: 20" />
              <Field label="Fecha requerida" icon={Calendar} field="date" type="date" value={form.date} onChange={v => upd('date', v)} error={errors.date} />
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-extrabold text-[#0F172A]">Seleccionar transportista</h2>
              <p className="text-gray-400 text-sm mt-1">Elige el transportista más adecuado para tu envío</p>
            </div>
            {!selected && <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-[8px] px-3 py-2 mb-4">Selecciona un transportista disponible para continuar</p>}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TRANSPORTERS.map(t => (
                <div key={t.id}
                  onClick={() => t.available && setSelected(t.id)}
                  className={`border-2 rounded-[12px] p-4 transition-all duration-200 ${!t.available
                    ? 'opacity-50 cursor-not-allowed border-gray-100 bg-gray-50'
                    : selected === t.id
                      ? 'border-[#F97316] bg-orange-50 shadow-lg shadow-orange-100 cursor-pointer'
                      : 'border-gray-150 hover:border-orange-200 hover:shadow-md cursor-pointer bg-white'
                    }`}
                  style={{ borderColor: !t.available ? undefined : selected === t.id ? '#F97316' : '#E5E7EB' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: t.color }}>
                      {t.initials}
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${t.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {t.available ? '● Disponible' : '● No disponible'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#0F172A] mb-0.5">{t.name}</h3>
                  <p className="text-xs text-gray-400 mb-2">{t.vehicle}</p>
                  <Stars rating={t.rating} />
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400">{t.completed} envíos</span>
                    <span className="text-base font-extrabold text-[#F97316]">{t.price}</span>
                  </div>
                  {selected === t.id && (
                    <div className="mt-2 flex items-center gap-1 text-[#F97316] text-xs font-bold">
                      <CheckCircle className="w-3.5 h-3.5" /> Seleccionado
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-extrabold text-[#0F172A]">Confirmación del envío</h2>
              <p className="text-gray-400 text-sm mt-1">Revisa los detalles antes de confirmar</p>
            </div>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-[12px] p-4 border border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#F97316]" /> Ruta del envío
                </h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-400 mb-0.5">ORIGEN</p>
                    <p className="text-sm font-bold text-[#0F172A]">{form.origin}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#F97316] flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-400 mb-0.5">DESTINO</p>
                    <p className="text-sm font-bold text-[#0F172A]">{form.destination}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-[12px] p-4 border border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-[#F97316]" /> Detalles de la carga
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] text-gray-400 mb-0.5">DESCRIPCIÓN</p>
                    <p className="text-sm font-semibold text-[#0F172A]">{form.description}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 mb-0.5">PESO</p>
                    <p className="text-sm font-semibold text-[#0F172A]">{form.weight} kg</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 mb-0.5">FECHA</p>
                    <p className="text-sm font-semibold text-[#0F172A]">{form.date}</p>
                  </div>
                </div>
              </div>

              {transporter && (
                <div className="bg-gray-50 rounded-[12px] p-4 border border-gray-100">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Truck className="w-3.5 h-3.5 text-[#F97316]" /> Transportista seleccionado
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: transporter.color }}>
                      {transporter.initials}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-[#0F172A]">{transporter.name}</p>
                      <Stars rating={transporter.rating} />
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-extrabold text-[#F97316]">{transporter.price}</p>
                      <p className="text-xs text-gray-400">{transporter.vehicle}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-2 border-[#F97316] rounded-[12px] p-4 bg-orange-50">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-[#0F172A]">Total estimado</span>
                    <p className="text-xs text-gray-500 mt-0.5">Precio acordado con el transportista</p>
                  </div>
                  <span className="text-2xl font-extrabold text-[#F97316]">{transporter?.price}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between rounded-b-[16px]">
          <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/app/client/dashboard')}
            className="px-5 py-2.5 border border-gray-200 rounded-[8px] text-sm font-semibold text-gray-500 hover:bg-white hover:border-gray-300 transition-all">
            {step > 1 ? '← Atrás' : 'Cancelar'}
          </button>
          {step < 3 ? (
            <button onClick={next}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#F97316] text-white rounded-[8px] text-sm font-bold hover:bg-[#ea6b0e] transition-all hover:scale-[1.02] shadow-md shadow-orange-200">
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={confirm}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#F97316] text-white rounded-[8px] text-sm font-bold hover:bg-[#ea6b0e] transition-all hover:scale-[1.02] shadow-md shadow-orange-200">
              <Check className="w-4 h-4" /> Confirmar Envío
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
