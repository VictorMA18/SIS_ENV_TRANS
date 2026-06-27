import { useState } from 'react';
import { Star, X, Loader2, CheckCircle, MessageSquare, Send } from 'lucide-react';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useShipmentListStore } from '../../stores/useShipmentListStore';

// ─── Star Rating Input ───────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);

  const labels: Record<number, string> = {
    1: 'Muy malo 😞',
    2: 'Malo 😐',
    3: 'Regular 🙂',
    4: 'Bueno 😊',
    5: 'Excelente 🤩',
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="transition-all duration-150 hover:scale-125 focus:outline-none"
          >
            <Star
              className={`w-10 h-10 transition-colors duration-150 ${
                star <= (hovered || value)
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-gray-200'
              }`}
            />
          </button>
        ))}
      </div>
      <p
        className={`text-sm font-bold transition-all duration-200 ${
          (hovered || value) > 0 ? 'text-amber-500 opacity-100' : 'text-gray-300 opacity-60'
        }`}
      >
        {labels[hovered || value] ?? 'Toca una estrella para calificar'}
      </p>
    </div>
  );
}

// ─── Success View ────────────────────────────────────────────────────────────

function SuccessView({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-6 animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
        <CheckCircle className="w-10 h-10 text-green-500" />
      </div>
      <div className="text-center">
        <h3 className="text-xl font-extrabold text-[#0F172A] mb-1">
          ¡Gracias por calificar! 🙌
        </h3>
        <p className="text-sm text-gray-400">
          Tu opinión ayuda a mejorar el servicio de transporte.
        </p>
      </div>
      <button
        onClick={onClose}
        className="mt-2 px-6 py-2.5 bg-[#F97316] text-white rounded-[10px] font-bold text-sm hover:bg-[#ea6b0e] transition-all shadow-md shadow-orange-200"
      >
        Cerrar
      </button>
    </div>
  );
}

// ─── Main Modal ──────────────────────────────────────────────────────────────

export function RatingModal() {
  const {
    ratingModalOpen,
    pendingRatingNotification,
    isSubmitting,
    error,
    closeRatingModal,
    submitRating,
    clearError,
  } = useNotificationStore();

  const { fetchShipments } = useShipmentListStore();

  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!ratingModalOpen || !pendingRatingNotification) return null;

  const shipmentId = pendingRatingNotification.metadata?.shipment_id ?? '';
  const transporterName = String(
    pendingRatingNotification.metadata?.transporter_name ?? 'el transportista'
  );

  const handleSubmit = async () => {
    if (score === 0) {
      setLocalError('Por favor selecciona una calificación.');
      return;
    }
    setLocalError(null);
    clearError();

    try {
      await submitRating({
        shipment_id: shipmentId,
        score,
        comment: comment.trim() || undefined,
      });
      setSubmitted(true);
      // Refrescar la lista de envíos para que el dashboard refleje el nuevo estado
      fetchShipments();
    } catch {
      // El error ya está en el store
    }
  };

  const handleClose = () => {
    setScore(0);
    setComment('');
    setSubmitted(false);
    setLocalError(null);
    clearError();
    closeRatingModal();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="bg-white rounded-[24px] shadow-2xl w-full max-w-md border border-gray-100 overflow-hidden"
        style={{ animation: 'slideUpFade 0.3s ease' }}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-[#F97316] to-[#fb923c] p-6 text-white">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Star className="w-6 h-6 text-white fill-white" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold">Califica el servicio</h2>
              <p className="text-sm text-white/80">Tu envío ha sido entregado</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {submitted ? (
            <SuccessView onClose={handleClose} />
          ) : (
            <div className="space-y-5">
              {/* Transporter info */}
              <div className="flex items-center gap-3 p-3.5 bg-orange-50 rounded-[12px] border border-orange-100">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-extrabold text-sm"
                  style={{ backgroundColor: '#F97316' }}
                >
                  {transporterName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Transportista</p>
                  <p className="text-sm font-bold text-[#0F172A]">{transporterName}</p>
                </div>
              </div>

              {/* Stars */}
              <div className="py-2">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider text-center mb-4">
                  ¿Cómo fue tu experiencia?
                </p>
                <StarRating value={score} onChange={setScore} />
              </div>

              {/* Comment */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Comentario (opcional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Cuéntanos tu experiencia con el servicio de entrega..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-[10px] text-sm resize-none focus:outline-none focus:border-[#F97316] transition-colors placeholder:text-gray-300"
                />
                <p className="text-[10px] text-gray-300 text-right mt-0.5">{comment.length}/500</p>
              </div>

              {/* Errors */}
              {(localError || error) && (
                <p className="text-xs text-red-500 font-medium text-center">
                  {localError ?? error}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 py-2.5 border border-gray-200 rounded-[10px] text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all"
                >
                  Ahora no
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#F97316] text-white rounded-[10px] text-sm font-bold hover:bg-[#ea6b0e] transition-all shadow-md shadow-orange-200 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Enviar calificación
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </div>
  );
}
