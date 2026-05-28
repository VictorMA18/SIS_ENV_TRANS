import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  MapPin, Truck, Package, CheckCircle, Clock, Star, ArrowLeft,
  Phone, MessageSquare, Loader2, AlertCircle, Coins, Upload, X,
  Image as ImageIcon, Edit, Trash2, Camera, Save, AlertTriangle, Calendar
} from 'lucide-react';
import { useShipmentListStore } from '../../stores/useShipmentListStore';
import {
  getStatusConfig, getStatusTimeline, getStatusIndex,
  formatShipmentDate, formatRelativeTime, getInitials, getAvatarColor,
  buildPeruIsoString
} from '../../lib/shipment-utils';
import type { ShipmentTracking, UpdateShipmentPayload } from '../../types/shipment';
import { fetchCloudinarySignature } from '../../lib/shipment-api';

// ─── Icon mapping for timeline ──────────────────────────────────────────────

const STATUS_ICONS: Record<string, React.ElementType> = {
  REGISTRADO: Package,
  SELECCIONADO: Package,
  ACEPTADO: CheckCircle,
  EN_TRANSITO: Truck,
  ENTREGADO: CheckCircle,
};

// Helper to extract Peru date and time from ISO string
const parseScheduledDelivery = (isoString: string | null) => {
  if (!isoString) return { date: '', time: '' };
  const parts = isoString.split('T');
  if (parts.length === 2) {
    const date = parts[0];
    const time = parts[1].substring(0, 5); // "HH:MM"
    return { date, time };
  }
  return { date: '', time: '' };
};

// ─── Sub-components ─────────────────────────────────────────────────────────

function TrackingEvent({ entry, isLast }: { entry: ShipmentTracking; isLast: boolean }) {
  const cfg = getStatusConfig(entry.status);
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-0.5 ${cfg.dot}`} />
        {!isLast && <div className="w-0.5 flex-1 bg-gray-100 mt-1 mb-0" style={{ minHeight: '32px' }} />}
      </div>
      <div className={!isLast ? 'pb-4' : ''}>
        <p className="text-sm text-[#0F172A] leading-relaxed">
          {cfg.label}{entry.location ? ` — ${entry.location}` : ''}
        </p>
        {entry.notes && <p className="text-xs text-gray-500 mt-0.5">{entry.notes}</p>}
        <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
          {formatShipmentDate(entry.created_at)}
        </p>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function TrackingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    currentShipment, isLoading, error,
    fetchShipmentById, updateShipment, cancelClientShipment, clearCurrentShipment
  } = useShipmentListStore();

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    origin_address: '',
    destination_address: '',
    description: '',
    weight_kg: '',
    volume_m3: '',
    price: '',
    delivery_date: '',
    delivery_time: '',
    notes: '',
  });
  const [editUrls, setEditUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Cancel states
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    if (id) fetchShipmentById(id);
    return () => { clearCurrentShipment(); };
  }, [id, fetchShipmentById, clearCurrentShipment]);

  // Sync form states with shipment when entering edit mode
  const startEdit = () => {
    if (!currentShipment) return;
    const { date, time } = parseScheduledDelivery(currentShipment.scheduled_delivery_at);
    setEditForm({
      origin_address: currentShipment.origin_address,
      destination_address: currentShipment.destination_address,
      description: currentShipment.description ?? '',
      weight_kg: currentShipment.weight_kg?.toString() ?? '',
      volume_m3: currentShipment.volume_m3?.toString() ?? '',
      price: currentShipment.price ?? '',
      delivery_date: date,
      delivery_time: time,
      notes: currentShipment.notes ?? '',
    });
    setEditUrls(currentShipment.url_images ?? []);
    setFormErrors({});
    setIsEditing(true);
  };

  const timeline = useMemo(() => getStatusTimeline(), []);

  const currentStatusIndex = currentShipment
    ? getStatusIndex(currentShipment.status)
    : -1;

  const isCancelled = currentShipment?.status === 'CANCELADO';

  const assignedTransporter = useMemo(() => {
    if (!currentShipment) return null;
    const accepted = currentShipment.selections.find(s => s.status === 'ACEPTADO');
    return accepted?.transporter ?? currentShipment.selections[0]?.transporter ?? null;
  }, [currentShipment]);

  const sortedTrackingEntries = useMemo(() => {
    if (!currentShipment) return [];
    return [...currentShipment.tracking_entries].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [currentShipment]);

  // Image upload in edit mode
  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = 3 - editUrls.length;
    if (remaining <= 0) {
      setUploadError('Máximo 3 imágenes permitidas.');
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    setUploadError(null);

    try {
      const updatedUrls = [...editUrls];
      for (const file of filesToUpload) {
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
        const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
        if (!allowedExtensions.includes(fileExt)) {
          throw new Error(`El archivo ${file.name} no es una imagen válida (jpg, jpeg, png, webp).`);
        }

        const sig = await fetchCloudinarySignature();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', sig.api_key);
        formData.append('timestamp', sig.timestamp.toString());
        formData.append('signature', sig.signature);
        formData.append('folder', sig.folder);

        const uploadUrl = `https://api.cloudinary.com/v1_1/${sig.cloud_name}/image/upload`;
        const res = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`Error en subida de ${file.name} a Cloudinary.`);
        }

        const data = await res.json();
        if (data.secure_url) {
          updatedUrls.push(data.secure_url);
        }
      }
      setEditUrls(updatedUrls);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error desconocido al subir.');
    } finally {
      setUploading(false);
    }
  };

  const handleEditRemoveImage = (index: number) => {
    setEditUrls(prev => prev.filter((_, i) => i !== index));
    setUploadError(null);
  };

  // Submit edits
  const handleSaveEdit = async () => {
    if (!currentShipment) return;

    // Validate
    const errs: Record<string, string> = {};
    if (!editForm.origin_address.trim()) errs.origin_address = 'Origen es requerido';
    if (!editForm.destination_address.trim()) errs.destination_address = 'Destino es requerido';
    const p = Number(editForm.price);
    if (!editForm.price.trim() || isNaN(p) || p <= 0) {
      errs.price = 'Precio debe ser mayor a 0';
    }
    if (!editForm.delivery_date) errs.delivery_date = 'Fecha es requerida';
    if (!editForm.delivery_time) errs.delivery_time = 'Hora es requerida';

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    try {
      const payload: UpdateShipmentPayload = {
        origin_address: editForm.origin_address.trim(),
        destination_address: editForm.destination_address.trim(),
        description: editForm.description.trim() || undefined,
        weight_kg: editForm.weight_kg ? Number(editForm.weight_kg) : undefined,
        volume_m3: editForm.volume_m3 ? Number(editForm.volume_m3) : undefined,
        price: Number(editForm.price),
        url_images: editUrls,
        notes: editForm.notes.trim() || undefined,
        scheduled_delivery_at: buildPeruIsoString(editForm.delivery_date, editForm.delivery_time),
      };

      await updateShipment(currentShipment.id, payload);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    }
  };

  // Submit cancellation
  const handleCancelShipment = async () => {
    if (!currentShipment) return;
    try {
      await cancelClientShipment(currentShipment.id, cancelReason.trim());
      setIsCancelling(false);
      setCancelReason('');
    } catch (e) {
      console.error(e);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading && !currentShipment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full py-20">
        <Loader2 className="w-10 h-10 animate-spin text-[#F97316] mb-4" />
        <p className="text-sm text-gray-500 font-medium">Cargando envío...</p>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error && !currentShipment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full py-20">
        <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
        <p className="text-sm text-red-600 font-medium mb-2">{error}</p>
        <button onClick={() => navigate('/app/client/dashboard')}
          className="px-4 py-2 text-sm text-[#F97316] border border-orange-200 rounded-[8px] hover:bg-orange-50 transition-all">
          Volver al Dashboard
        </button>
      </div>
    );
  }

  if (!currentShipment) return null;

  const statusCfg = getStatusConfig(currentShipment.status);

  // States check for edit and cancel button visibility
  const canEdit = currentShipment.status === 'REGISTRADO' || currentShipment.status === 'SELECCIONADO';
  const canCancel = currentShipment.status === 'REGISTRADO' || currentShipment.status === 'SELECCIONADO' || currentShipment.status === 'ACEPTADO';

  return (
    <div className="p-5 lg:p-7" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button onClick={() => navigate('/app/client/dashboard')}
          className="p-2.5 rounded-[10px] hover:bg-gray-100 transition-colors text-gray-500 border border-gray-200">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-[#0F172A]">Seguimiento de envío</h1>
          <p className="text-gray-400 text-xs mt-0.5">
            {currentShipment.origin_address} → {currentShipment.destination_address}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {canEdit && !isEditing && (
            <button
              onClick={startEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-orange-200 text-[#F97316] hover:bg-orange-50 rounded-[10px] text-xs font-bold transition-all"
            >
              <Edit className="w-3.5 h-3.5" /> Editar
            </button>
          )}
          {canCancel && !isEditing && (
            <button
              onClick={() => setIsCancelling(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-650 hover:bg-red-50 rounded-[10px] text-xs font-bold transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" /> Cancelar
            </button>
          )}
          <div className={`flex items-center gap-1.5 border rounded-full px-3 py-1.5 ${statusCfg.bg} ${statusCfg.text}`}
            style={{ borderColor: statusCfg.color + '40' }}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${statusCfg.dot}`} />
            <span className="text-xs font-bold">{statusCfg.label}</span>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-[10px] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Cancelled banner */}
      {isCancelled && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[12px] flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-700">Envío cancelado</p>
            <p className="text-xs text-red-550">Este envío ha sido cancelado y no puede ser modificado.</p>
          </div>
        </div>
      )}

      {/* Timeline */}
      {!isCancelled && (
        <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[#0F172A] font-bold text-sm">Estado del envío</h2>
            <span className="text-xs text-gray-400">
              Actualizado: {formatShipmentDate(currentShipment.updated_at)}
            </span>
          </div>

          {/* Desktop horizontal */}
          <div className="hidden md:flex items-start">
            {timeline.map((s, i) => {
              const done = i < currentStatusIndex;
              const active = i === currentStatusIndex;
              const Icon = STATUS_ICONS[s.status] || Package;
              const trackingEntry = currentShipment.tracking_entries.find(t => t.status === s.status);

              return (
                <div key={s.status} className="flex-1 flex flex-col items-center relative">
                  {i < timeline.length - 1 && (
                    <div className={`absolute top-[18px] left-1/2 w-full h-0.5 transition-all duration-700 ${i < currentStatusIndex ? 'bg-[#F97316]' : 'bg-gray-200'}`} />
                  )}
                  <div className={`relative z-10 w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                    done ? 'bg-[#F97316] border-[#F97316]'
                      : active ? 'bg-[#F97316] border-[#F97316] shadow-[0_0_0_8px_rgba(249,115,22,0.15)]'
                        : 'bg-white border-gray-200'
                  }`}>
                    {done ? <CheckCircle className="w-4 h-4 text-white" /> : <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-gray-300'}`} />}
                    {active && <div className="absolute inset-0 rounded-full border-2 border-[#F97316] animate-ping opacity-25" />}
                  </div>
                  <p className={`mt-2.5 text-xs font-bold text-center ${active ? 'text-[#F97316]' : done ? 'text-gray-500' : 'text-gray-300'}`}>{s.label}</p>
                  {trackingEntry && (
                    <p className="text-[10px] text-gray-400 mt-0.5 text-center">
                      {formatShipmentDate(trackingEntry.created_at)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile vertical */}
          <div className="md:hidden space-y-3">
            {timeline.map((s, i) => {
              const done = i < currentStatusIndex;
              const active = i === currentStatusIndex;
              const Icon = STATUS_ICONS[s.status] || Package;

              return (
                <div key={s.status} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    done ? 'bg-[#F97316] border-[#F97316]'
                      : active ? 'bg-[#F97316] border-[#F97316] shadow-[0_0_0_5px_rgba(249,115,22,0.15)]'
                        : 'bg-white border-gray-200'
                  }`}>
                    {done ? <CheckCircle className="w-4 h-4 text-white" /> : <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-gray-300'}`} />}
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${active ? 'text-[#F97316]' : done ? 'text-gray-600' : 'text-gray-400'}`}>{s.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="grid xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-5">
          {/* Details & Edit Form */}
          <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 p-5">
            <h3 className="text-[#0F172A] font-bold text-sm mb-4">
              {isEditing ? 'Editar Detalles del envío' : 'Detalles del envío'}
            </h3>

            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">DIRECCIÓN DE ORIGEN</label>
                    <input
                      type="text"
                      value={editForm.origin_address}
                      onChange={e => setEditForm({ ...editForm, origin_address: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-[8px] text-sm ${formErrors.origin_address ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                    />
                    {formErrors.origin_address && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.origin_address}</p>}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">DIRECCIÓN DE DESTINO</label>
                    <input
                      type="text"
                      value={editForm.destination_address}
                      onChange={e => setEditForm({ ...editForm, destination_address: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-[8px] text-sm ${formErrors.destination_address ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                    />
                    {formErrors.destination_address && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.destination_address}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">DESCRIPCIÓN DE LA CARGA</label>
                    <textarea
                      value={editForm.description}
                      onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-[8px] text-sm resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">PESO ESTIMADO (KG)</label>
                    <input
                      type="number"
                      value={editForm.weight_kg}
                      onChange={e => setEditForm({ ...editForm, weight_kg: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-[8px] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">VOLUMEN (M³)</label>
                    <input
                      type="number"
                      value={editForm.volume_m3}
                      onChange={e => setEditForm({ ...editForm, volume_m3: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-[8px] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">PRECIO PROPUESTO (S/.)</label>
                    <input
                      type="number"
                      value={editForm.price}
                      onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-[8px] text-sm ${formErrors.price ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                    />
                    {formErrors.price && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.price}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">FECHA ENTREGA</label>
                      <input
                        type="date"
                        value={editForm.delivery_date}
                        onChange={e => setEditForm({ ...editForm, delivery_date: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                        className={`w-full px-3 py-2 border rounded-[8px] text-sm ${formErrors.delivery_date ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                      />
                      {formErrors.delivery_date && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.delivery_date}</p>}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">HORA ENTREGA</label>
                      <input
                        type="time"
                        value={editForm.delivery_time}
                        onChange={e => setEditForm({ ...editForm, delivery_time: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-[8px] text-sm ${formErrors.delivery_time ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                      />
                      {formErrors.delivery_time && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.delivery_time}</p>}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">NOTAS</label>
                    <textarea
                      value={editForm.notes}
                      onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-[8px] text-sm resize-none"
                    />
                  </div>
                </div>

                {/* Edit Images */}
                <div className="border-t border-gray-100 pt-3">
                  <label className="block text-[10px] font-bold text-gray-500 mb-2">IMÁGENES DE LA CARGA (MÁX 3)</label>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {editUrls.map((url, idx) => (
                      <div key={url} className="relative aspect-video rounded-[8px] overflow-hidden border border-gray-250 bg-gray-50">
                        <img src={url} alt="Carga" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleEditRemoveImage(idx)}
                          className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full hover:scale-105"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {editUrls.length < 3 && (
                      <label className={`flex flex-col items-center justify-center aspect-video border border-dashed rounded-[8px] cursor-pointer transition-colors ${uploading ? 'bg-gray-50' : 'border-gray-300 hover:border-[#F97316]'}`}>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleEditImageUpload}
                          disabled={uploading}
                          className="hidden"
                        />
                        {uploading ? (
                          <Loader2 className="w-4 h-4 text-[#F97316] animate-spin" />
                        ) : (
                          <>
                            <Camera className="w-4 h-4 text-gray-400 mb-0.5" />
                            <span className="text-[9px] text-gray-500 font-bold">Subir</span>
                          </>
                        )}
                      </label>
                    )}
                  </div>
                  {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
                </div>

                {/* Edit Buttons */}
                <div className="flex gap-2 justify-end pt-3">
                  <button
                    onClick={() => setIsEditing(false)}
                    disabled={isLoading}
                    className="px-4 py-2 border border-gray-200 rounded-[8px] text-xs font-bold text-gray-500 hover:bg-gray-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={isLoading || uploading}
                    className="flex items-center gap-1 px-4 py-2 bg-[#F97316] text-white rounded-[8px] text-xs font-bold hover:bg-[#ea6b0e] transition-all shadow-md shadow-orange-200"
                  >
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Guardar Cambios
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-5">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-green-50 rounded-[10px] flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">ORIGEN</p>
                      <p className="text-sm font-bold text-[#0F172A]">{currentShipment.origin_address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-red-50 rounded-[10px] flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">DESTINO</p>
                      <p className="text-sm font-bold text-[#0F172A]">{currentShipment.destination_address}</p>
                    </div>
                  </div>
                  {currentShipment.description && (
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">DESCRIPCIÓN</p>
                      <p className="text-sm font-semibold text-[#0F172A]">{currentShipment.description}</p>
                    </div>
                  )}
                  {currentShipment.weight_kg && (
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">PESO</p>
                      <p className="text-sm font-semibold text-[#0F172A]">{currentShipment.weight_kg} kg</p>
                    </div>
                  )}
                  {currentShipment.volume_m3 && (
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">VOLUMEN</p>
                      <p className="text-sm font-semibold text-[#0F172A]">{currentShipment.volume_m3} m³</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">PRECIO PROPUESTO</p>
                    <p className="text-sm font-bold text-[#0F172A] flex items-center gap-1">
                      <Coins className="w-4 h-4 text-amber-500" /> S/. {Number(currentShipment.price).toFixed(2)}
                    </p>
                  </div>
                  {currentShipment.scheduled_delivery_at && (
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">ENTREGA PROGRAMADA</p>
                      <p className="text-sm font-semibold text-[#0F172A]">{formatShipmentDate(currentShipment.scheduled_delivery_at)}</p>
                    </div>
                  )}
                </div>

                {/* Images gallery display */}
                {currentShipment.url_images && currentShipment.url_images.length > 0 && (
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">IMÁGENES DE LA CARGA</p>
                    <div className="flex flex-wrap gap-2">
                      {currentShipment.url_images.map((url, idx) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer" className="w-24 h-16 rounded-[8px] overflow-hidden border border-gray-200 hover:scale-[1.03] transition-all bg-gray-50 flex-shrink-0">
                          <img src={url} alt={`Imagen ${idx}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Transporter */}
          {assignedTransporter && (
            <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 p-5">
              <h3 className="text-[#0F172A] font-bold text-sm mb-4">Transportista asignado</h3>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: getAvatarColor(assignedTransporter.full_name) }}>
                  <span className="text-white font-extrabold text-xl">
                    {getInitials(assignedTransporter.full_name)}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-[#0F172A] text-base">{assignedTransporter.full_name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i <= Math.floor(assignedTransporter.average_rating ?? 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                    ))}
                    <span className="text-xs text-gray-500 ml-1">
                      {assignedTransporter.average_rating?.toFixed(1) ?? '—'}
                    </span>
                  </div>
                  {assignedTransporter.license_number && (
                    <p className="text-xs text-gray-400 mt-0.5">Licencia: {assignedTransporter.license_number}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <a href={`tel:${assignedTransporter.id}`} className="w-10 h-10 bg-green-50 border border-green-100 rounded-[10px] flex items-center justify-center hover:bg-green-100 transition-colors">
                    <Phone className="w-4 h-4 text-green-600" />
                  </a>
                  <button className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-[10px] flex items-center justify-center hover:bg-blue-100 transition-colors">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Activity log */}
        <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 p-5 h-fit">
          <h3 className="text-[#0F172A] font-bold text-sm mb-5 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#F97316]" />
            Historial de eventos
          </h3>

          {sortedTrackingEntries.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">Sin eventos registrados</p>
          ) : (
            <div className="space-y-0">
              {sortedTrackingEntries.map((entry, i) => (
                <TrackingEvent
                  key={entry.id}
                  entry={entry}
                  isLast={i === sortedTrackingEntries.length - 1}
                />
              ))}
            </div>
          )}

          {currentShipment.scheduled_delivery_at && (
            <div className="mt-5 p-4 bg-orange-50 rounded-[12px] border border-orange-100">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-[#F97316]" />
                <p className="text-xs font-bold text-[#F97316]">Entrega programada</p>
              </div>
              <p className="text-base font-extrabold text-[#0F172A]">
                {formatShipmentDate(currentShipment.scheduled_delivery_at)}
              </p>
            </div>
          )}

          {currentShipment.notes && (
            <div className="mt-4 p-4 bg-blue-50 rounded-[12px] border border-blue-100">
              <p className="text-xs font-bold text-blue-600 mb-1">Notas del envío</p>
              <p className="text-sm text-[#0F172A]">{currentShipment.notes}</p>
            </div>
          )}

          <div className="mt-4 text-center">
            <p className="text-[10px] text-gray-400">
              Creado: {formatShipmentDate(currentShipment.created_at)}
            </p>
            <p className="text-[10px] text-gray-400">
              Última actualización: {formatRelativeTime(currentShipment.updated_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Cancellation Dialog/Modal */}
      {isCancelling && (
        <div className="fixed inset-0 bg-[#0F172A]/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-[20px] shadow-2xl max-w-md w-full p-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <h3 className="text-lg font-extrabold text-[#0F172A]">Cancelar envío</h3>
            </div>
            <p className="text-gray-450 text-sm mb-4">
              ¿Estás seguro de que deseas cancelar este envío? Esta acción no se puede deshacer.
            </p>
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Motivo de cancelación (opcional)
              </label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Indica el motivo por el cual estás cancelando este envío..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-205 rounded-[10px] text-sm resize-none focus:border-red-400 focus:outline-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setIsCancelling(false); setCancelReason(''); }}
                className="px-4 py-2 border border-gray-200 rounded-[10px] text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all"
              >
                Volver
              </button>
              <button
                onClick={handleCancelShipment}
                disabled={isLoading}
                className="px-4 py-2 bg-red-500 text-white rounded-[10px] text-sm font-bold hover:bg-red-600 transition-all shadow-md shadow-red-200"
              >
                {isLoading ? 'Cancelando...' : 'Confirmar Cancelación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
