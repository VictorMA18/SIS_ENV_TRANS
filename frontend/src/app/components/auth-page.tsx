import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { GoogleLogin } from '@react-oauth/google';
import { Mail, Lock, Eye, EyeOff, User, Truck, Check, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/auth';
import type { UserRole } from '../context/auth';
import { ApiError } from '../lib/api';

type AuthMode = 'login' | 'register' | 'forgot-password' | 'success';
type FieldErrors = Record<string, string>;

function PasswordStrength({ password }: { password: string }) {
  const score = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const color = score <= 1 ? '#EF4444' : score === 2 ? '#F59E0B' : '#10B981';
  const label = score <= 1 ? 'Débil' : score === 2 ? 'Media' : score <= 3 ? 'Fuerte' : 'Muy fuerte';
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300" style={{ backgroundColor: i <= score ? color : '#E2E8F0' }} />
        ))}
      </div>
      {password && <span className="text-xs mt-0.5 block" style={{ color }}>{label}</span>}
    </div>
  );
}

const getErrorMessage = (value: unknown) => {
  if (Array.isArray(value)) return value[0] ? String(value[0]) : undefined;
  if (typeof value === 'string') return value;
  return undefined;
};

const extractErrorData = (error: unknown) => {
  if (error instanceof ApiError && error.data && typeof error.data === 'object') {
    return error.data as Record<string, unknown>;
  }
  return null;
};

const mapLoginErrors = (error: unknown): FieldErrors => {
  const errors: FieldErrors = {};
  const data = extractErrorData(error);

  if (data) {
    const email = getErrorMessage(data.email);
    const password = getErrorMessage(data.password);
    const fallback = getErrorMessage(data.non_field_errors) || getErrorMessage(data.detail);

    if (email) errors.email = email;
    if (password) errors.password = password;
    if (fallback && !errors.email && !errors.password) {
      errors.password = fallback;
    }
  }

  if (!Object.keys(errors).length && error instanceof ApiError && error.status === 401) {
    errors.password = 'Credenciales inválidas.';
  }

  if (!Object.keys(errors).length) {
    errors.email = 'No se pudo conectar. Intenta de nuevo.';
  }

  return errors;
};

const mapRegisterErrors = (error: unknown): FieldErrors => {
  const errors: FieldErrors = {};
  const data = extractErrorData(error);

  if (data) {
    const name = getErrorMessage(data.full_name);
    const email = getErrorMessage(data.email);
    const password = getErrorMessage(data.password);
    const confirm = getErrorMessage(data.confirm_password);
    const fallback = getErrorMessage(data.non_field_errors) || getErrorMessage(data.detail);

    if (name) errors.name = name;
    if (email) errors.email = email;
    if (password) errors.password = password;
    if (confirm) errors.confirm = confirm;
    if (fallback && !errors.name && !errors.email && !errors.password && !errors.confirm) {
      errors.email = fallback;
    }
  }

  if (!Object.keys(errors).length) {
    errors.email = 'No se pudo conectar. Intenta de nuevo.';
  }

  return errors;
};

interface FloatingInputProps {
  label: string;
  type?: string;
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  rightElement?: React.ReactNode;
  error?: string;
  hideCheck?: boolean;
}

function FloatingInput({ label, type = 'text', icon: Icon, value, onChange, rightElement, error, hideCheck }: FloatingInputProps) {
  const [focused, setFocused] = useState(false);
  const hasValue = value.length > 0;

  return (
    <div>
      <div className={`relative flex items-center border rounded-[8px] transition-all duration-200 ${error
        ? 'border-red-400 bg-red-50/60'
        : focused
          ? 'border-[#F97316] bg-white shadow-[0_0_0_3px_rgba(249,115,22,0.12)]'
          : hasValue
            ? 'border-green-400 bg-white'
            : 'border-gray-200 bg-gray-50/80 hover:border-gray-300'
        }`}>
        <Icon className={`w-4 h-4 ml-3 flex-shrink-0 transition-colors ${focused ? 'text-[#F97316]' : 'text-gray-400'}`} />
        <div className="flex-1 relative px-3 py-3">
          <label className={`absolute transition-all duration-200 pointer-events-none select-none ${focused || hasValue
            ? `text-[10px] top-1.5 font-medium ${error ? 'text-red-500' : focused ? 'text-[#F97316]' : hasValue ? 'text-green-600' : 'text-gray-400'}`
            : 'text-sm top-1/2 -translate-y-1/2 text-gray-400 font-normal'
            }`}>
            {label}
          </label>
          <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={`w-full bg-transparent outline-none text-sm text-[#0F172A] transition-opacity ${focused || hasValue ? 'opacity-100 pt-3' : 'opacity-0 pt-0'}`}
          />
        </div>
        {rightElement && <div className="pr-3">{rightElement}</div>}
        {!error && hasValue && !rightElement && !hideCheck && (
          <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1 ml-1">{error}</p>}
    </div>
  );
}

function AuthHero() {
  return (
    <div className="hidden lg:flex lg:w-[55%] relative bg-[#0F172A] flex-col justify-between p-12 overflow-hidden">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice">
        <rect width="800" height="900" fill="#0F172A" />
        {[80, 160, 240, 320, 400, 480, 560, 640, 720].map(x => (
          <line key={`vx${x}`} x1={x} y1="0" x2={x} y2="900" stroke="#1E293B" strokeWidth="1" />
        ))}
        {[90, 180, 270, 360, 450, 540, 630, 720, 810].map(y => (
          <line key={`hy${y}`} x1="0" y1={y} x2="800" y2={y} stroke="#1E293B" strokeWidth="1" />
        ))}
        <path d="M50 600 Q200 400 400 480 Q580 560 750 380" stroke="#F97316" strokeWidth="2.5" fill="none" strokeDasharray="12,6" opacity="0.8" />
        <path d="M100 750 Q300 580 500 640 Q650 700 780 560" stroke="#3B82F6" strokeWidth="2" fill="none" strokeDasharray="8,4" opacity="0.7" />
        <path d="M0 300 Q200 150 400 280 Q600 400 800 260" stroke="#F97316" strokeWidth="1.5" fill="none" strokeDasharray="6,4" opacity="0.35" />
        <circle cx="400" cy="480" r="14" fill="#F97316" />
        <circle cx="400" cy="480" r="28" fill="#F97316" opacity="0.2" />
        <circle cx="400" cy="480" r="44" fill="#F97316" opacity="0.08" />
        <circle cx="200" cy="600" r="11" fill="#3B82F6" />
        <circle cx="200" cy="600" r="22" fill="#3B82F6" opacity="0.2" />
        <circle cx="650" cy="380" r="11" fill="#F97316" />
        <circle cx="650" cy="380" r="22" fill="#F97316" opacity="0.2" />
        <rect x="500" y="448" width="40" height="24" rx="4" fill="#F97316" opacity="0.95" />
        <rect x="490" y="456" width="16" height="16" rx="3" fill="#F97316" opacity="0.75" />
        <circle cx="500" cy="474" r="5" fill="#0F172A" /><circle cx="526" cy="474" r="5" fill="#0F172A" />
        <circle cx="150" cy="250" r="5" fill="#F97316" opacity="0.6" />
        <circle cx="600" cy="650" r="5" fill="#3B82F6" opacity="0.6" />
        <circle cx="700" cy="200" r="4" fill="#F97316" opacity="0.4" />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/60 via-transparent to-[#0F172A]/80" />

      <div className="relative z-10 flex items-center gap-3">
        <div className="w-10 h-10 bg-[#F97316] rounded-xl flex items-center justify-center">
          <Truck className="w-6 h-6 text-white" />
        </div>
        <span className="text-white font-extrabold text-2xl tracking-tight">CargoDistrict</span>
      </div>

      <div className="relative z-10">
        <h2 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-5 tracking-tight">
          Coordina y rastrea<br />tus{' '}
          <span className="text-[#F97316]">envíos distritales</span><br />
          en tiempo real
        </h2>
        <p className="text-slate-400 text-base max-w-sm leading-relaxed">
          Plataforma de logística distrital para pequeñas y medianas empresas. Eficiente, confiable y transparente.
        </p>
        <div className="flex items-center gap-8 mt-10 pt-8 border-t border-white/10">
          {[{ value: '12K+', label: 'Envíos' }, { value: '850+', label: 'Transportistas' }, { value: '4.8★', label: 'Calificación' }].map(s => (
            <div key={s.label}>
              <div className="text-2xl font-extrabold text-white">{s.value}</div>
              <div className="text-slate-400 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register, loginWithGoogle } = useAuth();
  const googleEnabled = Boolean(
    (import.meta as ImportMeta & { env?: { VITE_GOOGLE_CLIENT_ID?: string } }).env
      ?.VITE_GOOGLE_CLIENT_ID,
  );

  const [mode, setMode] = useState<AuthMode>((searchParams.get('mode') as AuthMode) || 'login');
  const [role, setRole] = useState<UserRole>((searchParams.get('role') as UserRole) || 'client');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [loginErrors, setLoginErrors] = useState<FieldErrors>({});
  const [loginLoading, setLoginLoading] = useState(false);

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [regErrors, setRegErrors] = useState<FieldErrors>({});
  const [registerLoading, setRegisterLoading] = useState(false);

  const [googleLoading, setGoogleLoading] = useState(false);

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');

  const dest = (r: UserRole) => r === 'client' ? '/app/client/dashboard' : '/app/transporter/dashboard';

  const handleLogin = async () => {
    if (loginLoading) return;
    const errs: Record<string, string> = {};
    if (!loginEmail) errs.email = 'El correo es requerido';
    else if (!/\S+@\S+\.\S+/.test(loginEmail)) errs.email = 'Correo inválido';
    if (!loginPassword) errs.password = 'La contraseña es requerida';
    if (Object.keys(errs).length) { setLoginErrors(errs); return; }
    setLoginErrors({});
    setLoginLoading(true);
    try {
      await login(loginEmail, loginPassword, role);
      navigate(dest(role));
    } catch (error) {
      setLoginErrors(mapLoginErrors(error));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async () => {
    if (registerLoading) return;
    const errs: Record<string, string> = {};
    if (!regName) errs.name = 'El nombre es requerido';
    if (!regEmail) errs.email = 'El correo es requerido';
    else if (!/\S+@\S+\.\S+/.test(regEmail)) errs.email = 'Correo inválido';
    if (!regPassword) errs.password = 'La contraseña es requerida';
    else if (regPassword.length < 6) errs.password = 'Mínimo 6 caracteres';
    if (regPassword !== regConfirm) errs.confirm = 'Las contraseñas no coinciden';
    if (!acceptedTerms) errs.terms = 'Debes aceptar los términos';
    if (Object.keys(errs).length) { setRegErrors(errs); return; }
    setRegErrors({});
    setRegisterLoading(true);
    try {
      await register(regName, regEmail, regPassword, regConfirm, role);
      navigate(dest(role));
    } catch (error) {
      setRegErrors(mapRegisterErrors(error));
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleForgot = () => {
    if (!forgotEmail) { setForgotError('El correo es requerido'); return; }
    if (!/\S+@\S+\.\S+/.test(forgotEmail)) { setForgotError('Ingresa un correo válido'); return; }
    setMode('success');
  };

  const setModeErrors = (errors: FieldErrors) => {
    if (mode === 'register') {
      setRegErrors(errors);
    } else {
      setLoginErrors(errors);
    }
  };

  const clearModeErrors = () => {
    if (mode === 'register') {
      setRegErrors({});
    } else {
      setLoginErrors({});
    }
  };

  const handleGoogleSuccess = async (credential?: string | null) => {
    if (!credential) {
      setModeErrors({ email: 'No se pudo validar tu cuenta de Google.' });
      return;
    }

    if (googleLoading) return;
    clearModeErrors();
    setGoogleLoading(true);

    try {
      await loginWithGoogle(credential, role);
      navigate(dest(role));
    } catch (error) {
      const errors = mode === 'register' ? mapRegisterErrors(error) : mapLoginErrors(error);
      setModeErrors(errors);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setModeErrors({ email: 'No se pudo iniciar sesión con Google.' });
  };

  const RoleToggle = () => (
    <div className="flex gap-1.5 p-1 bg-gray-100 rounded-[10px] mb-5">
      {(['client', 'transporter'] as UserRole[]).map(r => (
        <button key={r} onClick={() => setRole(r)}
          className={`flex-1 py-2 px-3 rounded-[8px] text-xs font-semibold transition-all duration-200 ${role === r ? 'bg-[#F97316] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          {r === 'client' ? '🏢 Cliente' : '🚚 Transportista'}
        </button>
      ))}
    </div>
  );

  const Divider = ({ text }: { text: string }) => (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-gray-150" style={{ backgroundColor: '#E5E7EB' }} />
      <span className="text-xs text-gray-400">{text}</span>
      <div className="flex-1 h-px" style={{ backgroundColor: '#E5E7EB' }} />
    </div>
  );

  const GoogleAuth = ({ modeLabel }: { modeLabel: 'login' | 'register' }) => {
    if (!googleEnabled) {
      return (
        <button
          disabled
          className="w-full flex items-center justify-center gap-3 py-3 px-4 border-[1.5px] border-gray-200 rounded-[10px] bg-gray-50 text-gray-400 font-medium text-sm cursor-not-allowed"
        >
          Google no configurado
        </button>
      );
    }

    const wrapperClass = googleLoading ? 'opacity-70 pointer-events-none' : '';

    return (
      <div className={`w-full flex justify-center ${wrapperClass}`} aria-busy={googleLoading}>
        <GoogleLogin
          onSuccess={response => handleGoogleSuccess(response.credential)}
          onError={handleGoogleError}
          text={modeLabel === 'register' ? 'signup_with' : 'signin_with'}
          theme="outline"
          shape="rectangular"
          size="large"
          width={360}
          useOneTap={false}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <AuthHero />

      <div className="flex-1 flex items-center justify-center p-6 bg-[#F8FAFC] min-h-screen">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-9 h-9 bg-[#F97316] rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <span className="text-[#0F172A] font-extrabold text-xl tracking-tight">CargoDistrict</span>
          </div>

          <div className="bg-white rounded-[20px] shadow-[0_8px_40px_rgba(0,0,0,0.12)] p-7">
            {/* LOGIN */}
            {mode === 'login' && (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-[#0F172A] mb-1 text-xl font-bold">Inicia sesión en tu cuenta</h2>
                  <p className="text-gray-400 text-sm">Bienvenido de vuelta a CargoDistrict</p>
                </div>
                <RoleToggle />
                <div className="space-y-3">
                  <FloatingInput label="Correo electrónico" type="email" icon={Mail} value={loginEmail}
                    onChange={v => { setLoginEmail(v); setLoginErrors(e => ({ ...e, email: '' })); }} error={loginErrors.email} />
                  <div>
                    <FloatingInput label="Contraseña" type={showLoginPwd ? 'text' : 'password'} icon={Lock} value={loginPassword}
                      onChange={v => { setLoginPassword(v); setLoginErrors(e => ({ ...e, password: '' })); }} error={loginErrors.password}
                      hideCheck
                      rightElement={
                        <button onClick={() => setShowLoginPwd(s => !s)} className="text-gray-400 hover:text-gray-600 transition-colors">
                          {showLoginPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      } />
                    <div className="text-right mt-1.5">
                      <button onClick={() => setMode('forgot-password')} className="text-xs text-[#F97316] hover:underline">¿Olvidaste tu contraseña?</button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleLogin}
                  disabled={loginLoading}
                  className={`w-full mt-5 bg-[#F97316] text-white py-3 rounded-[10px] font-semibold text-sm transition-all shadow-md shadow-orange-200 ${loginLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#ea6b0e] hover:scale-[1.02] active:scale-[0.99]'}`}
                >
                  {loginLoading ? 'Ingresando...' : 'Iniciar Sesión'}
                </button>
                <Divider text="o continúa con" />
                <GoogleAuth modeLabel="login" />
                <p className="text-center text-sm text-gray-500 mt-5">
                  ¿No tienes cuenta?{' '}
                  <button onClick={() => setMode('register')} className="text-[#F97316] font-semibold hover:underline">Regístrate aquí</button>
                </p>
              </>
            )}

            {/* REGISTER */}
            {mode === 'register' && (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-[#0F172A] mb-1 text-xl font-bold">Crea tu cuenta</h2>
                  <p className="text-gray-400 text-sm">Únete a CargoDistrict hoy</p>
                </div>
                <RoleToggle />
                <div className="space-y-3">
                  <FloatingInput label="Nombre completo" icon={User} value={regName}
                    onChange={v => { setRegName(v); setRegErrors(e => ({ ...e, name: '' })); }} error={regErrors.name} />
                  <FloatingInput label="Correo electrónico" type="email" icon={Mail} value={regEmail}
                    onChange={v => { setRegEmail(v); setRegErrors(e => ({ ...e, email: '' })); }} error={regErrors.email} />
                  <div>
                    <FloatingInput label="Contraseña" type={showRegPwd ? 'text' : 'password'} icon={Lock} value={regPassword}
                      onChange={v => { setRegPassword(v); setRegErrors(e => ({ ...e, password: '' })); }} error={regErrors.password}
                      hideCheck
                      rightElement={
                        <button onClick={() => setShowRegPwd(s => !s)} className="text-gray-400 hover:text-gray-600">
                          {showRegPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      } />
                    {regPassword && <PasswordStrength password={regPassword} />}
                  </div>
                  <FloatingInput label="Confirmar contraseña" type="password" icon={Lock} value={regConfirm}
                    onChange={v => { setRegConfirm(v); setRegErrors(e => ({ ...e, confirm: '' })); }} error={regErrors.confirm} hideCheck />

                  <div>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={acceptedTerms}
                        onChange={e => { setAcceptedTerms(e.target.checked); setRegErrors(r => ({ ...r, terms: '' })); }}
                        className="mt-0.5 w-4 h-4 accent-[#F97316] cursor-pointer" />
                      <span className="text-xs text-gray-500 leading-relaxed">
                        Acepto los{' '}
                        <a href="#" className="text-[#F97316] hover:underline font-medium">Términos y condiciones</a>
                        {' '}y la Política de privacidad
                      </span>
                    </label>
                    {regErrors.terms && <p className="text-xs text-red-500 mt-1 ml-6">{regErrors.terms}</p>}
                  </div>
                </div>
                <button
                  onClick={handleRegister}
                  disabled={registerLoading}
                  className={`w-full mt-5 bg-[#F97316] text-white py-3 rounded-[10px] font-semibold text-sm transition-all shadow-md shadow-orange-200 ${registerLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#ea6b0e] hover:scale-[1.02]'}`}
                >
                  {registerLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
                </button>
                <Divider text="o regístrate con" />
                <GoogleAuth modeLabel="register" />
                <p className="text-center text-sm text-gray-500 mt-5">
                  ¿Ya tienes cuenta?{' '}
                  <button onClick={() => setMode('login')} className="text-[#F97316] font-semibold hover:underline">Inicia sesión</button>
                </p>
              </>
            )}

            {/* FORGOT PASSWORD */}
            {mode === 'forgot-password' && (
              <>
                <div className="text-center mb-6">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center">
                      <Mail className="w-8 h-8 text-[#F97316]" />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-7 h-7 bg-white rounded-full border-2 border-orange-100 flex items-center justify-center shadow-sm">
                      <Lock className="w-3.5 h-3.5 text-[#F97316]" />
                    </div>
                  </div>
                  <h2 className="text-[#0F172A] text-xl font-bold mb-1">¿Olvidaste tu contraseña?</h2>
                  <p className="text-gray-400 text-sm leading-relaxed">Ingresa tu correo y te enviaremos un enlace para restablecerla</p>
                </div>
                <FloatingInput label="Correo electrónico" type="email" icon={Mail} value={forgotEmail}
                  onChange={v => { setForgotEmail(v); setForgotError(''); }} error={forgotError} />
                <button onClick={handleForgot}
                  className="w-full mt-5 bg-[#F97316] text-white py-3 rounded-[10px] font-semibold text-sm hover:bg-[#ea6b0e] transition-all hover:scale-[1.02] shadow-md shadow-orange-200">
                  Enviar enlace de recuperación
                </button>
                <button onClick={() => setMode('login')}
                  className="w-full mt-3 flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors py-2">
                  <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
                </button>
              </>
            )}

            {/* SUCCESS */}
            {mode === 'success' && (
              <div className="text-center py-4">
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-4 border-green-200 animate-ping opacity-20" />
                </div>
                <h2 className="text-[#0F172A] text-xl font-bold mb-2">¡Correo enviado!</h2>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                  Revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contraseña
                </p>
                <button className="w-full border-2 border-[#F97316] text-[#F97316] py-3 rounded-[10px] font-semibold text-sm hover:bg-orange-50 transition-all hover:scale-[1.02] mb-3">
                  Reenviar correo
                </button>
                <button onClick={() => setMode('login')}
                  className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors py-2">
                  <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
