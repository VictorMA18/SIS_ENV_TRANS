import { useNavigate } from 'react-router';
import {
  Package, MapPin, Truck, Star, Shield, Zap, ChevronRight, ArrowRight,
} from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#F97316] rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <span className="text-[#0F172A] font-extrabold text-xl tracking-tight">CargoDistrict</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <button
                onClick={() => navigate('/auth?mode=login')}
                className="text-[#0F172A] hover:text-[#F97316] transition-colors font-medium text-sm"
              >
                Iniciar Sesión
              </button>
              <button
                onClick={() => navigate('/auth?mode=register')}
                className="bg-[#F97316] text-white px-5 py-2.5 rounded-[10px] font-semibold text-sm hover:bg-[#ea6b0e] transition-all hover:scale-[1.02] shadow-md shadow-orange-200"
              >
                Registrarse gratis
              </button>
            </div>
            <div className="md:hidden">
              <button
                onClick={() => navigate('/auth')}
                className="bg-[#F97316] text-white px-4 py-2 rounded-[10px] font-semibold text-sm"
              >
                Comenzar
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-[#0F172A]">
          <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
            {[100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400].map(x => (
              <line key={`v${x}`} x1={x} y1="0" x2={x} y2="900" stroke="#334155" strokeWidth="0.5" />
            ))}
            {[90, 180, 270, 360, 450, 540, 630, 720, 810].map(y => (
              <line key={`h${y}`} x1="0" y1={y} x2="1440" y2={y} stroke="#334155" strokeWidth="0.5" />
            ))}
            <path d="M0 500 Q300 250 600 420 Q900 590 1200 380 Q1350 270 1440 300" stroke="#F97316" strokeWidth="3" fill="none" strokeDasharray="12,6" />
            <path d="M0 650 Q400 450 700 560 Q1000 670 1300 480 Q1380 440 1440 430" stroke="#3B82F6" strokeWidth="2" fill="none" strokeDasharray="8,4" />
            <path d="M200 0 Q350 150 250 350 Q150 550 300 750 Q420 900 380 900" stroke="#F97316" strokeWidth="1.5" fill="none" strokeDasharray="6,4" opacity="0.5" />
            <path d="M1100 0 Q1000 200 1150 400 Q1300 600 1150 800" stroke="#3B82F6" strokeWidth="1.5" fill="none" strokeDasharray="6,4" opacity="0.5" />
            <circle cx="600" cy="420" r="14" fill="#F97316" /><circle cx="600" cy="420" r="28" fill="#F97316" opacity="0.2" /><circle cx="600" cy="420" r="42" fill="#F97316" opacity="0.08" />
            <circle cx="1200" cy="380" r="12" fill="#F97316" /><circle cx="1200" cy="380" r="24" fill="#F97316" opacity="0.2" />
            <circle cx="300" cy="500" r="10" fill="#3B82F6" /><circle cx="300" cy="500" r="20" fill="#3B82F6" opacity="0.2" />
            <circle cx="900" cy="560" r="10" fill="#3B82F6" /><circle cx="900" cy="560" r="20" fill="#3B82F6" opacity="0.2" />
            <circle cx="400" cy="200" r="6" fill="#F97316" opacity="0.7" />
            <circle cx="1000" cy="700" r="6" fill="#3B82F6" opacity="0.7" />
            <rect x="750" y="390" width="36" height="22" rx="4" fill="#F97316" opacity="0.9" />
            <rect x="740" y="398" width="15" height="14" rx="2" fill="#F97316" opacity="0.7" />
            <circle cx="749" cy="414" r="5" fill="#0F172A" /><circle cx="774" cy="414" r="5" fill="#0F172A" />
            <rect x="1050" y="350" width="36" height="22" rx="4" fill="#3B82F6" opacity="0.9" />
            <rect x="1040" y="358" width="15" height="14" rx="2" fill="#3B82F6" opacity="0.7" />
            <circle cx="1049" cy="374" r="5" fill="#0F172A" /><circle cx="1074" cy="374" r="5" fill="#0F172A" />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0F172A] via-[#0F172A]/95 to-[#0F172A]/50" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-[#F97316]/20 border border-[#F97316]/30 rounded-full px-4 py-1.5 mb-8">
              <Zap className="w-4 h-4 text-[#F97316]" />
              <span className="text-[#F97316] text-sm font-medium">Plataforma distrital de logística</span>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.08] tracking-tight mb-6">
              Coordina tus<br />
              <span className="text-[#F97316]">envíos</span> en<br />
              segundos
            </h1>
            <p className="text-lg text-slate-300 mb-10 max-w-lg leading-relaxed">
              Conectamos empresas con transportistas de confianza para envíos distritales rápidos y seguros. Rastrea en tiempo real.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate('/auth?role=client&mode=register')}
                className="flex items-center justify-center gap-2.5 bg-[#F97316] text-white px-8 py-4 rounded-[12px] font-semibold text-base hover:bg-[#ea6b0e] transition-all hover:scale-[1.02] shadow-xl shadow-orange-500/30"
              >
                <Package className="w-5 h-5" />
                Soy Cliente
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/auth?role=transporter&mode=register')}
                className="flex items-center justify-center gap-2.5 bg-white/10 backdrop-blur-sm border border-white/25 text-white px-8 py-4 rounded-[12px] font-semibold text-base hover:bg-white/20 transition-all hover:scale-[1.02]"
              >
                <Truck className="w-5 h-5" />
                Soy Transportista
              </button>
            </div>
            <div className="flex items-center gap-10 mt-14 pt-8 border-t border-white/10">
              {[
                { label: 'Envíos completados', value: '12,400+' },
                { label: 'Transportistas', value: '850+' },
                { label: 'Distritos cubiertos', value: '43' },
              ].map(stat => (
                <div key={stat.label}>
                  <div className="text-2xl font-extrabold text-white">{stat.value}</div>
                  <div className="text-slate-400 text-xs mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-[#0F172A] mb-4">
              Todo lo que necesitas para<br />gestionar tus envíos
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Una plataforma completa para coordinar, rastrear y gestionar envíos distritales con total transparencia.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: MapPin, title: 'Rastreo en tiempo real', desc: 'Sigue tu envío en cada etapa, desde la recogida hasta la entrega final con actualizaciones instantáneas.', color: '#F97316' },
              { icon: Shield, title: 'Transportistas verificados', desc: 'Todos pasan por un proceso de verificación de identidad y vehículo para tu total seguridad.', color: '#3B82F6' },
              { icon: Star, title: 'Sistema de calificaciones', desc: 'Evalúa a los transportistas después de cada envío y construye confianza en la comunidad distrital.', color: '#10B981' },
              { icon: Zap, title: 'Coordinación instantánea', desc: 'Publica tu envío y recibe respuestas de transportistas disponibles en tu zona en minutos.', color: '#F97316' },
              { icon: Package, title: 'Gestión de carga', desc: 'Describe tipo y peso de tu carga para encontrar el transporte más adecuado y el precio justo.', color: '#8B5CF6' },
              { icon: Truck, title: 'Múltiples vehículos', desc: 'Desde motos hasta camiones de carga. El vehículo perfecto para cada tipo de envío.', color: '#EC4899' },
            ].map(feature => (
              <div
                key={feature.title}
                className="bg-white rounded-[16px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] transition-all hover:-translate-y-0.5"
              >
                <div className="w-12 h-12 rounded-[12px] flex items-center justify-center mb-5" style={{ backgroundColor: `${feature.color}15` }}>
                  <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
                </div>
                <h3 className="text-[#0F172A] font-bold text-base mb-2">{feature.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-[#0F172A] mb-4">¿Cómo funciona?</h2>
            <p className="text-slate-500 text-lg">Proceso simple en 4 pasos</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Regístrate', desc: 'Crea tu cuenta como Cliente o Transportista en menos de 2 minutos, gratis.' },
              { step: '02', title: 'Publica tu envío', desc: 'Describe tu carga, indica origen, destino y la fecha en que lo necesitas.' },
              { step: '03', title: 'Elige transportista', desc: 'Revisa perfiles, calificaciones y elige al mejor transportista disponible.' },
              { step: '04', title: 'Rastrea en vivo', desc: 'Sigue cada etapa de tu envío en tiempo real hasta la entrega exitosa.' },
            ].map((item, i) => (
              <div key={item.step} className="relative text-center">
                {i < 3 && (
                  <div className="hidden md:block absolute top-6 left-[55%] w-[90%] h-0.5 bg-gradient-to-r from-[#F97316]/60 to-orange-100" />
                )}
                <div className="relative z-10 w-12 h-12 rounded-full bg-[#F97316] text-white font-extrabold text-sm flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200">
                  {item.step}
                </div>
                <h3 className="text-[#0F172A] font-bold text-base mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-[#0F172A]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-extrabold text-white mb-4">¿Listo para optimizar tus envíos?</h2>
          <p className="text-slate-300 text-lg mb-10">Únete a miles de empresas que ya confían en CargoDistrict</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/auth?mode=register&role=client')}
              className="bg-[#F97316] text-white px-8 py-4 rounded-[12px] font-semibold text-base hover:bg-[#ea6b0e] transition-all hover:scale-[1.02] flex items-center gap-2 justify-center shadow-lg shadow-orange-900/40"
            >
              Comenzar gratis
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="border border-white/20 text-white px-8 py-4 rounded-[12px] font-semibold text-base hover:bg-white/10 transition-all"
            >
              Iniciar sesión
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0F172A] border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#F97316] rounded-lg flex items-center justify-center">
              <Truck className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-extrabold tracking-tight">CargoDistrict</span>
          </div>
          <p className="text-slate-400 text-sm">© 2026 CargoDistrict. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            {['Términos', 'Privacidad', 'Soporte'].map(link => (
              <a key={link} href="#" className="text-slate-400 hover:text-white text-sm transition-colors">{link}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
