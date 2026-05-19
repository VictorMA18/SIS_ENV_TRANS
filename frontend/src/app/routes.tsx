import { createBrowserRouter, Navigate } from 'react-router';
import { LandingPage } from './components/landing-page';
import { AuthPage } from './components/auth-page';
import { AppLayout } from './components/layout/app-layout';
import { ClientDashboard } from './components/client/client-dashboard';
import { NewShipment } from './components/client/new-shipment';
import { TrackingPage } from './components/client/tracking';
import { TransporterDashboard } from './components/transporter/transporter-dashboard';
import { ProfilePage } from './components/profile';

export const router = createBrowserRouter([
  { path: '/', Component: LandingPage },
  { path: '/auth', Component: AuthPage },
  {
    path: '/app',
    Component: AppLayout,
    children: [
      { index: true, element: <Navigate to="client/dashboard" replace /> },
      { path: 'client/dashboard', Component: ClientDashboard },
      { path: 'client/new-shipment', Component: NewShipment },
      { path: 'client/tracking/:id', Component: TrackingPage },
      { path: 'transporter/dashboard', Component: TransporterDashboard },
      { path: 'profile', Component: ProfilePage },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
