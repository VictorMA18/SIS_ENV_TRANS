import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  MapPin, Package, Calendar, Check, Star, ChevronRight, Truck,
  CheckCircle, Scale, ArrowLeft, AlertCircle, Loader2, Box, StickyNote,
} from 'lucide-react';
import { useShipmentStore, type Step1Data } from '../../stores/useShipmentStore';
import { getInitials, getAvatarColor, formatShipmentDate } from '../../lib/shipment-utils';
import type { AvailableTransporter } from '../../types/shipment';
import { useState } from 'react';

const STEPS = ['Datos del envío', 'Seleccionar transportista', 'Confirmación'];

// ─── Sub-components ─────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number | null }) {
  const value = rating ?? 0;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-3 h-3 ${i <= Math.floor(value) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
      ))}
      <span className="text-xs text-gray-500 ml-1 font-medium">{value.toFixed(1)}</span>
    </div>
  );
}

function Field({
  label, icon: Icon, type = 'text', placeholder, value, onChange, error,
}: {
  label: string; icon: React.ElementType; type?: string;
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
          step={type === 'number' ? 'any' : undefined}
          className="flex-1 px-3 py-3 bg-transparent outline-none text-sm text-[#0F172A] placeholder-gray-300"
        />
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function TransporterCard({
  t, isSelected, onSelect,
}: {
  t: AvailableTransporter; isSelected: boolean; onSelect: () => void;
}) {
  const initials = getInitials(t.user.full_name);
  const color = getAvatarColor(t.user.full_name);

  return (
    <div
      onClick={onSelect}
      className={`border-2 rounded-[12px] p-4 transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'border-[#F97316] bg-orange-50 shadow-lg shadow-orange-100'
          : 'border-gray-200 hover:border-orange-200 hover:shadow-md bg-white'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: color }}>
          {initials}
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full font-bold bg-green-100 text-green-700">
          ● Disponible
        </span>
      </div>
      <h3 className="text-sm font-bold text-[#0F172A] mb-0.5">{t.user.full_name}</h3>
      <p className="text-xs text-gray-400 mb-2">{t.vehicle_description || 'Vehículo no especificado'}</p>
      <Stars rating={t.average_rating} />
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-400">{t.completed_shipments} envíos</span>
        {t.license_number && <span className="text-[10px] text-gray-400">Lic: {t.license_number}</span>}
      </div>
      {isSelected && (
        <div className="mt-2 flex items-center gap-1 text-[#F97316] text-xs font-bold">
          <CheckCircle className="w-3.5 h-3.5" /> Seleccionado
        </div>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function NewShipment() {
  const navigate = useNavigate();

  const {
    currentStep, step1Data, availableTransporters, selectedTransporterId,
    createdShipment, isLoading, error,
    goToStep, setStep1Data, fetchAvailableTransporters, selectTransporter,
    submitShipment, resetStore, clearError,
  } = useShipmentStore();

  const [form, setForm] = useState({
    origin_address: step1Data?.origin_address ?? '',
    destination_address: step1Data?.destination_address ?? '',
    description: step1Data?.description ?? '',
    weight_kg: step1Data?.weight_kg?.toString() ?? '',
    volume_m3: step1Data?.volume_m3?.toString() ?? '',
    notes: step1Data?.notes ?? '',
    scheduled_delivery_at: step1Data?.scheduled_delivery_at?.split('T')[0] ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load transporters when entering step 2
  useEffect(() => {
    if (currentStep === 2 && availableTransporters.length === 0 && !isLoading) {
      fetchAvailableTransporters(
        step1Data?.origin_address,
        step1Data?.destination_address,
      );
    }
  }, [currentStep, availableTransporters.length, isLoading, fetchAvailableTransporters, step1Data]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetStore();
    };
  }, [resetStore]);

  const upd = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
    clearError();
  };

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.origin_address.trim()) errs.origin_address = 'Ingresa la dirección de origen';
    if (!form.destination_address.trim()) errs.destination_address = 'Ingresa la dirección de destino';
    if (form.weight_kg && (isNaN(Number(form.weight_kg)) || Number(form.weight_kg) <= 0)) {
      errs.weight_kg = 'Ingresa un peso válido';
    }
    if (form.volume_m3 && (isNaN(Number(form.volume_m3)) || Number(form.volume_m3) <= 0)) {
      errs.volume_m3 = 'Ingresa un volumen válido';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!validateStep1()) return;
      const data: Step1Data = {
        origin_address: form.origin_address.trim(),
        destination_address: form.destination_address.trim(),
      };
      if (form.description.trim()) data.description = form.description.trim();
      if (form.weight_kg) data.weight_kg = Number(form.weight_kg);
      if (form.volume_m3) data.volume_m3 = Number(form.volume_m3);
      if (form.notes.trim()) data.notes = form.notes.trim();
      if (form.scheduled_delivery_at) {
        data.scheduled_delivery_at = new Date(form.scheduled_delivery_at).toISOString();
      }
      setStep1Data(data);
    }
  };

  const handleConfirm = async () => {
    await submitShipment();
  };

  const handleBack = () => {
    if (currentStep > 1) {
      goToStep((currentStep - 1) as 1 | 2 | 3);
    } else {
      navigate('/app/client/dashboard');
    }
  };

  const selectedTransporter = availableTransporters.find(
    t => t.user.id === selectedTransporterId,
  );

  // ── Success screen ──────────────────────────────────────────────────────
  if (createdShipment) {
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
          <p className="text-gray-400 text-sm mb-1">Tu envío ha sido registrado exitosamente.</p>
          <p className="text-xs text-gray-300 mb-4">ID: {createdShipment.id}</p>
          <p className="text-xs text-gray-400 mb-6">
            Estado: <span className="font-semibold text-blue-600">{createdShipment.status}</span>
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { resetStore(); navigate('/app/client/dashboard'); }}
              className="px-5 py-2.5 border border-gray-200 rounded-[8px] text-sm font-semibold text-gray-500 hover:bg-white hover:border-gray-300 transition-all"
            >
              Ir al Dashboard
            </button>
            <button
              onClick={() => resetStore()}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#F97316] text-white rounded-[8px] text-sm font-bold hover:bg-[#ea6b0e] transition-all shadow-md shadow-orange-200"
            >
              Nuevo Envío
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-7 max-w-3xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Back */}
      <button onClick={handleBack}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 group transition-colors">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        {currentStep > 1 ? 'Paso anterior' : 'Volver al dashboard'}
      </button>

      {/* Stepper */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3;
          const done = currentStep > n;
          const active = currentStep === n;
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

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-[10px] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-700 font-medium">{error}</p>
            <button onClick={clearError} className="text-xs text-red-500 hover:underline mt-1">Cerrar</button>
          </div>
        </div>
      )}

      {/* Card */}
      <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
        {/* Step 1 */}
        {currentStep === 1 && (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-extrabold text-[#0F172A]">Datos del envío</h2>
              <p className="text-gray-400 text-sm mt-1">Completa los detalles de tu envío</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Dirección de origen" icon={MapPin} value={form.origin_address} onChange={v => upd('origin_address', v)} error={errors.origin_address} placeholder="Ej: Av. Larco 123, Miraflores" />
              <Field label="Dirección de destino" icon={MapPin} value={form.destination_address} onChange={v => upd('destination_address', v)} error={errors.destination_address} placeholder="Ej: Calle Las Flores 456, San Isidro" />
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
              <Field label="Peso estimado (kg)" icon={Scale} type="number" value={form.weight_kg} onChange={v => upd('weight_kg', v)} error={errors.weight_kg} placeholder="Ej: 20" />
              <Field label="Volumen (m³)" icon={Box} type="number" value={form.volume_m3} onChange={v => upd('volume_m3', v)} error={errors.volume_m3} placeholder="Ej: 0.5" />
              <Field label="Fecha de entrega requerida" icon={Calendar} type="date" value={form.scheduled_delivery_at} onChange={v => upd('scheduled_delivery_at', v)} error={errors.scheduled_delivery_at} />
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Notas adicionales</label>
                <div className="flex border rounded-[8px] transition-all border-gray-200 hover:border-gray-300 focus-within:border-[#F97316] focus-within:shadow-[0_0_0_3px_rgba(249,115,22,0.1)]">
                  <StickyNote className="w-4 h-4 text-gray-400 ml-3 mt-3.5 flex-shrink-0" />
                  <textarea placeholder="Instrucciones especiales..."
                    value={form.notes} onChange={e => upd('notes', e.target.value)}
                    className="flex-1 px-3 py-3 bg-transparent outline-none text-sm text-[#0F172A] placeholder-gray-300 resize-none" rows={2} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {currentStep === 2 && (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-extrabold text-[#0F172A]">Seleccionar transportista</h2>
              <p className="text-gray-400 text-sm mt-1">Elige el transportista más adecuado para tu envío</p>
            </div>

            {isLoading && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-[#F97316] mb-3" />
                <p className="text-sm font-medium">Cargando transportistas disponibles...</p>
              </div>
            )}

            {!isLoading && availableTransporters.length === 0 && !error && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Truck className="w-12 h-12 mb-3 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">No hay transportistas disponibles</p>
                <p className="text-xs text-gray-400 mt-1">Intenta más tarde o cambia los datos del envío</p>
                <button onClick={() => fetchAvailableTransporters(step1Data?.origin_address, step1Data?.destination_address)}
                  className="mt-4 px-4 py-2 text-sm text-[#F97316] border border-orange-200 rounded-[8px] hover:bg-orange-50 transition-all font-medium">
                  Reintentar
                </button>
              </div>
            )}

            {!isLoading && availableTransporters.length > 0 && (
              <>
                {!selectedTransporterId && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-[8px] px-3 py-2 mb-4">
                    Selecciona un transportista disponible para continuar
                  </p>
                )}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableTransporters.map(t => (
                    <TransporterCard
                      key={t.user.id}
                      t={t}
                      isSelected={selectedTransporterId === t.user.id}
                      onSelect={() => selectTransporter(t.user.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 3 */}
        {currentStep === 3 && (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-extrabold text-[#0F172A]">Confirmación del envío</h2>
              <p className="text-gray-400 text-sm mt-1">Revisa los detalles antes de confirmar</p>
            </div>
            <div className="space-y-4">
              {/* Route */}
              <div className="bg-gray-50 rounded-[12px] p-4 border border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#F97316]" /> Ruta del envío
                </h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-400 mb-0.5">ORIGEN</p>
                    <p className="text-sm font-bold text-[#0F172A]">{step1Data?.origin_address}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#F97316] flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-400 mb-0.5">DESTINO</p>
                    <p className="text-sm font-bold text-[#0F172A]">{step1Data?.destination_address}</p>
                  </div>
                </div>
              </div>

              {/* Cargo details */}
              <div className="bg-gray-50 rounded-[12px] p-4 border border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-[#F97316]" /> Detalles de la carga
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {step1Data?.description && (
                    <div>
                      <p className="text-[10px] text-gray-400 mb-0.5">DESCRIPCIÓN</p>
                      <p className="text-sm font-semibold text-[#0F172A]">{step1Data.description}</p>
                    </div>
                  )}
                  {step1Data?.weight_kg && (
                    <div>
                      <p className="text-[10px] text-gray-400 mb-0.5">PESO</p>
                      <p className="text-sm font-semibold text-[#0F172A]">{step1Data.weight_kg} kg</p>
                    </div>
                  )}
                  {step1Data?.volume_m3 && (
                    <div>
                      <p className="text-[10px] text-gray-400 mb-0.5">VOLUMEN</p>
                      <p className="text-sm font-semibold text-[#0F172A]">{step1Data.volume_m3} m³</p>
                    </div>
                  )}
                  {step1Data?.scheduled_delivery_at && (
                    <div>
                      <p className="text-[10px] text-gray-400 mb-0.5">FECHA ENTREGA</p>
                      <p className="text-sm font-semibold text-[#0F172A]">{formatShipmentDate(step1Data.scheduled_delivery_at)}</p>
                    </div>
                  )}
                  {step1Data?.notes && (
                    <div className="col-span-2 sm:col-span-3">
                      <p className="text-[10px] text-gray-400 mb-0.5">NOTAS</p>
                      <p className="text-sm font-semibold text-[#0F172A]">{step1Data.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Transporter */}
              {selectedTransporter && (
                <div className="bg-gray-50 rounded-[12px] p-4 border border-gray-100">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Truck className="w-3.5 h-3.5 text-[#F97316]" /> Transportista seleccionado
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: getAvatarColor(selectedTransporter.user.full_name) }}>
                      {getInitials(selectedTransporter.user.full_name)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-[#0F172A]">{selectedTransporter.user.full_name}</p>
                      <Stars rating={selectedTransporter.average_rating} />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">{selectedTransporter.vehicle_description || 'Vehículo'}</p>
                      <p className="text-xs text-gray-400">{selectedTransporter.completed_shipments} envíos completados</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between rounded-b-[16px]">
          <button onClick={handleBack}
            className="px-5 py-2.5 border border-gray-200 rounded-[8px] text-sm font-semibold text-gray-500 hover:bg-white hover:border-gray-300 transition-all">
            {currentStep > 1 ? '← Atrás' : 'Cancelar'}
          </button>
          {currentStep < 3 ? (
            <button onClick={handleNext}
              disabled={currentStep === 2 && !selectedTransporterId}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#F97316] text-white rounded-[8px] text-sm font-bold hover:bg-[#ea6b0e] transition-all hover:scale-[1.02] shadow-md shadow-orange-200 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed">
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleConfirm}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#F97316] text-white rounded-[8px] text-sm font-bold hover:bg-[#ea6b0e] transition-all hover:scale-[1.02] shadow-md shadow-orange-200 disabled:opacity-50">
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creando...</>
              ) : (
                <><Check className="w-4 h-4" /> Confirmar Envío</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
