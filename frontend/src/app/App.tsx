import { RouterProvider } from 'react-router';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { router } from './routes';
import { AuthProvider } from './context/auth';

export default function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  const content = (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );

  if (!googleClientId) return content;

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      {content}
    </GoogleOAuthProvider>
  );
}
