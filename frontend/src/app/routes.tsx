import { createBrowserRouter, Navigate } from 'react-router';
import { LandingPage } from './components/landing-page';
import { AuthPage } from './components/auth-page';
import { AppLayout } from './components/layout/app-layout';
import { ClientDashboard } from './components/client/client-dashboard';
import { ClientShipmentsSection } from './components/client/client-shipments-section';
import { ClientTransportersSection } from './components/client/client-transporters-section';
import { ClientTrackingSection } from './components/client/client-tracking-section';
import { ClientProfileSection } from './components/client/client-profile-section';
import { NewShipment } from './components/client/new-shipment';
import { TrackingPage } from './components/client/tracking';
import { TransporterDashboard } from './components/transporter/transporter-dashboard';
import { TransporterRequestsSection } from './components/transporter/transporter-requests-section';
import { TransporterActiveRoutesSection } from './components/transporter/transporter-active-routes-section';
import { TransporterHistorySection } from './components/transporter/transporter-history-section';
import { TransporterProfileSection } from './components/transporter/transporter-profile-section';
import { useAuth } from './context/auth';

function ProfileRedirect() {
  const { user } = useAuth();
  if (user?.role === 'transporter') {
    return <Navigate to="/app/transporter/profile" replace />;
  }
  return <Navigate to="/app/client/profile" replace />;
}

export const router = createBrowserRouter([
  { path: '/', Component: LandingPage },
  { path: '/auth', Component: AuthPage },
  {
    path: '/app',
    Component: AppLayout,
    children: [
      { index: true, element: <Navigate to="client/dashboard" replace /> },
      
      // Client Routes
      { path: 'client/dashboard', Component: ClientDashboard },
      { path: 'client/shipments', Component: ClientShipmentsSection },
      { path: 'client/transporters', Component: ClientTransportersSection },
      { path: 'client/tracking', Component: ClientTrackingSection },
      { path: 'client/tracking/:id', Component: TrackingPage },
      { path: 'client/profile', Component: ClientProfileSection },
      { path: 'client/new-shipment', Component: NewShipment },
      
      // Transporter Routes
      { path: 'transporter/dashboard', Component: TransporterDashboard },
      { path: 'transporter/requests', Component: TransporterRequestsSection },
      { path: 'transporter/active-routes', Component: TransporterActiveRoutesSection },
      { path: 'transporter/history', Component: TransporterHistorySection },
      { path: 'transporter/profile', Component: TransporterProfileSection },
      
      // Legacy/Shared
      { path: 'profile', Component: ProfileRedirect },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
