import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import {
  LayoutDashboard, Package, Users, MapPin, User, Bell, LogOut,
  Menu, X, Truck, ChevronDown, Home, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/auth';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useNotifications } from '../../hooks/useNotifications';
import { formatRelativeTime } from '../../lib/shipment-utils';
import type { AppNotification } from '../../types/shipment';

const clientNav = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/app/client/dashboard' },
  { icon: Package, label: 'Mis Envíos', path: '/app/client/dashboard' },
  { icon: Users, label: 'Transportistas', path: '/app/client/dashboard' },
  { icon: MapPin, label: 'Seguimiento', path: '/app/client/tracking/ENV-2024-001' },
  { icon: User, label: 'Perfil', path: '/app/profile' },
];

const transporterNav = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/app/transporter/dashboard' },
  { icon: Package, label: 'Mis Envíos', path: '/app/transporter/dashboard' },
  { icon: MapPin, label: 'Seguimiento', path: '/app/client/tracking/ENV-2024-001' },
  { icon: User, label: 'Perfil', path: '/app/profile' },
];

export function AppLayout() {
  const { user, logout, isAuthenticated, isInitializing } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Hook unificado de notificaciones: REST (carga inicial) + WebSocket (push)
  useNotifications({ enabled: isAuthenticated && !isInitializing });

  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    openRatingModal,
  } = useNotificationStore();

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, isInitializing, navigate]);

  if (isInitializing || !isAuthenticated) {
    return null;
  }


  const navItems = user?.role === 'transporter' ? transporterNav : clientNav;

  const handleLogout = () => { logout(); navigate('/'); };

  const isActive = (path: string) => location.pathname === path;

  const pageTitle = (() => {
    const p = location.pathname;
    if (p.includes('new-shipment')) return 'Nuevo Envío';
    if (p.includes('tracking')) return 'Seguimiento de Envío';
    if (p.includes('profile')) return 'Mi Perfil';
    if (p.includes('dashboard')) return 'Dashboard';
    return 'CargoDistrict';
  })();

  const breadcrumb = (() => {
    const p = location.pathname;
    if (p.includes('new-shipment')) return ['Envíos', 'Nuevo Envío'];
    if (p.includes('tracking')) return ['Envíos', 'Seguimiento'];
    if (p.includes('profile')) return ['Perfil'];
    return [];
  })();

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#0F172A] flex flex-col transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#F97316] rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-extrabold text-lg tracking-tight">CargoDistrict</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/50 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User info */}
        <div className="p-4 mx-3 mt-3 rounded-[12px] bg-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F97316] to-[#ea6b0e] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">{user?.name?.charAt(0)}</span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">{user?.name?.split(' ').slice(0, 2).join(' ')}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user?.role === 'transporter' ? 'bg-blue-500/25 text-blue-300' : 'bg-[#F97316]/25 text-orange-300'}`}>
                {user?.role === 'transporter' ? 'Transportista' : 'Cliente'}
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 mt-3 overflow-y-auto">
          <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">Menú principal</p>
          {navItems.map(item => (
            <button key={`${item.path}-${item.label}`}
              onClick={() => { navigate(item.path); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-all group text-left ${isActive(item.path) ? 'bg-[#F97316] text-white shadow-md shadow-orange-900/20' : 'text-slate-400 hover:bg-white/8 hover:text-white'}`}
              style={{ backgroundColor: isActive(item.path) ? '#F97316' : undefined }}>
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
              {isActive(item.path) && <ChevronRight className="w-4 h-4 ml-auto opacity-70" />}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-white/10 space-y-0.5 flex-shrink-0">
          <button onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-slate-400 hover:bg-white/8 hover:text-white transition-all">
            <Home className="w-5 h-5" />
            <span className="text-sm">Inicio</span>
          </button>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-slate-400 hover:bg-red-500/15 hover:text-red-300 transition-all">
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between flex-shrink-0 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-[8px] hover:bg-gray-100 transition-colors text-gray-500">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-0.5">
                <span>CargoDistrict</span>
                {breadcrumb.map(b => (<span key={b} className="flex items-center gap-1.5"><ChevronRight className="w-3 h-3" />{b}</span>))}
              </div>
              <h1 className="text-[#0F172A] font-bold text-base leading-tight">{pageTitle}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setNotifOpen(o => !o)}
                className="relative p-2.5 rounded-[8px] hover:bg-gray-100 transition-colors"
                aria-label="Notificaciones">
                <Bell className="w-5 h-5 text-gray-500" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#F97316] rounded-full border border-white" />
                )}
                {/* Indicador de conexión WebSocket */}
                <span
                  className={`absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full border border-white transition-colors ${
                    isConnected ? 'bg-green-500' : 'bg-red-400'
                  }`}
                  title={isConnected ? 'Conectado en tiempo real' : 'Desconectado'}
                />
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-12 w-80 bg-white rounded-[16px] shadow-[0_8px_40px_rgba(0,0,0,0.15)] border border-gray-100 z-50">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-bold text-[#0F172A] text-sm">Notificaciones</h3>
                      <span className="text-xs bg-orange-100 text-[#F97316] px-2 py-0.5 rounded-full font-semibold">
                        {unreadCount} nuevas
                      </span>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-gray-400">
                          No tienes notificaciones
                        </div>
                      ) : (
                        notifications.map(n => (
                          <button
                            key={n.id}
                            onClick={async () => {
                              if (!n.is_read) {
                                await markAsRead(n.id);
                              }
                              setNotifOpen(false);
                              if (n.metadata?.type === 'RATING_REQUEST' && user?.role === 'client') {
                                openRatingModal();
                              } else if (n.metadata?.action_url) {
                                navigate(n.metadata.action_url as string);
                              }
                            }}
                            className={`w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50/80 cursor-pointer transition-colors block ${!n.is_read ? 'bg-orange-50/40' : ''}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? 'bg-[#F97316]' : 'bg-gray-300'}`} />
                              <div>
                                <p className="text-xs font-bold text-[#0F172A]">{n.title}</p>
                                <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{n.message}</p>
                                <p className="text-[10px] text-gray-400 mt-1">{formatRelativeTime(n.created_at)}</p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <div className="p-3 text-center border-t border-gray-50">
                        <button
                          onClick={async () => {
                            await markAllAsRead();
                            setNotifOpen(false);
                          }}
                          className="text-xs text-[#F97316] hover:underline font-medium"
                        >
                          Marcar todas como leídas
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* User menu */}
            <button
              onClick={() => navigate('/app/profile')}
              className="flex items-center gap-2.5 pl-3 border-l border-gray-200 cursor-pointer hover:bg-gray-50 rounded-[8px] px-3 py-2 transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F97316] to-[#ea6b0e] flex items-center justify-center">
                <span className="text-white font-bold text-xs">{user?.name?.charAt(0)}</span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-[#0F172A] leading-tight">{user?.name?.split(' ')[0]}</p>
                <p className="text-[10px] text-gray-400">{user?.role === 'transporter' ? 'Transportista' : 'Cliente'}</p>
              </div>
              <ChevronDown className="hidden md:block w-4 h-4 text-gray-400" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-30 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
          {navItems.slice(0, 4).map(item => (
            <button key={`mob-${item.label}`} onClick={() => navigate(item.path)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${isActive(item.path) ? 'text-[#F97316]' : 'text-gray-400 hover:text-gray-600'}`}>
              <item.icon className="w-5 h-5" />
              <span className="text-[9px] font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
