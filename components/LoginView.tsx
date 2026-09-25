import { useEffect, useRef, useState } from 'react';
import { GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, authPersistenceReady, localReviewAuthEnabled } from '../firebase';
import './login-google.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
  || '953735305510-q625m0nrcom4hpeni4b9r92i4pnohvof.apps.googleusercontent.com';

type GoogleCredentialResponse = { credential?: string };

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (configuration: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, string | number>) => void;
        };
      };
    };
  }
}

export default function LoginView({ error }: { error?: string }) {
  const buttonHost = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [localError, setLocalError] = useState('');
  const enterLocalReview = async (role: 'tens' | 'nurse' | 'doctor' | 'general_surgeon' | 'vascular_surgeon') => {
    if (!localReviewAuthEnabled) return;
    setBusy(true); setLocalError('');
    const email = ({ tens: 'tens@ejemplo.test', nurse: 'enfermeria@ejemplo.test', doctor: 'medicina@ejemplo.test', general_surgeon: 'cirugia@ejemplo.test', vascular_surgeon: 'vascular@ejemplo.test' } as const)[role];
    try { await authPersistenceReady; await signInWithEmailAndPassword(auth, email, 'SyntheticOnly-PD-Review!'); }
    catch { setLocalError('No se pudo entrar al entorno local. Inicia los emuladores y carga los datos de prueba.'); }
    finally { setBusy(false); }
  };

  const reportError = (code = '') => {
    const message = code === 'auth/unauthorized-domain'
      ? 'Este sitio todavía no está autorizado para iniciar sesión. Contacta al administrador de la plataforma.'
      : 'No pudimos completar el acceso con Google. Inténtalo nuevamente.';
    window.dispatchEvent(new CustomEvent('auth-error', { detail: message }));
  };

  useEffect(() => {
    if (localReviewAuthEnabled) { setReady(true); return; }
    let disposed = false;

    const initializeGoogleButton = () => {
      const host = buttonHost.current;
      if (disposed || !host || !window.google) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        auto_select: false,
        callback: (response) => {
          if (!response.credential) { reportError(); return; }
          setBusy(true);
          void authPersistenceReady
            .then(() => signInWithCredential(auth, GoogleAuthProvider.credential(response.credential)))
            .catch((cause) => {
              const code = cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : '';
              reportError(code);
            })
            .finally(() => setBusy(false));
        },
      });

      host.replaceChildren();
      window.google.accounts.id.renderButton(host, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        locale: 'es',
        width: Math.min(400, host.clientWidth || 400),
      });
      setReady(true);
    };

    if (window.google) {
      initializeGoogleButton();
    } else {
      const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity]');
      const script = existing || document.createElement('script');
      if (!existing) {
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.dataset.googleIdentity = 'true';
        document.head.appendChild(script);
      }
      script.addEventListener('load', initializeGoogleButton, { once: true });
      script.addEventListener('error', () => reportError(), { once: true });
    }

    return () => { disposed = true; };
  }, []);

  return <main className="login-shell">
    <section className="login-card">
      <div className="login-content">
        <div className="login-brand-row">
          <div className="brand-mark" aria-hidden="true">PD</div>
          <span>Policlínico de Pie Diabético</span>
        </div>
        <p className="eyebrow">Cuidado coordinado · Seguimiento continuo</p>
        <h1>Cuidamos cada paso, juntos</h1>
        <p className="lead">Una ficha de trabajo compartida para que cada profesional vea la misma historia, coordine a tiempo y acompañe mejor a cada paciente.</p>
        {error && <div className="notice danger login-error" role="alert">{error}</div>}
        {!localReviewAuthEnabled && <div className="google-signin-area" aria-busy={!ready || busy}>
          <div ref={buttonHost} className="google-signin-host" />
          {(!ready || busy) && <span>{busy ? 'Validando acceso seguro…' : 'Preparando acceso con Google…'}</span>}
        </div>}
        {localReviewAuthEnabled && <div className="local-review-access"><p><strong>Prueba local con datos ficticios</strong></p><div className="local-review-actions"><button type="button" className="ghost" disabled={busy} onClick={() => void enterLocalReview('tens')}>Entrar como TENS</button><button type="button" className="ghost" disabled={busy} onClick={() => void enterLocalReview('nurse')}>Entrar como enfermería</button><button type="button" className="ghost" disabled={busy} onClick={() => void enterLocalReview('doctor')}>Entrar como medicina</button><button type="button" className="ghost" disabled={busy} onClick={() => void enterLocalReview('general_surgeon')}>Entrar como Cirugía General</button><button type="button" className="ghost" disabled={busy} onClick={() => void enterLocalReview('vascular_surgeon')}>Entrar como Cirugía Vascular</button></div>{localError && <p role="alert">{localError}</p>}</div>}
        <p className="access-note"><strong>Un solo acceso para todo el equipo.</strong> Al ingresar, verás automáticamente los paneles habilitados para tus perfiles.</p>
        <div className="trust-grid" aria-label="Características de seguridad">
          <span>Acceso por invitación</span><span>Permisos por perfil</span><span>Registro de cambios</span>
        </div>
        <p className="fine-print">Esta plataforma apoya el flujo asistencial y no reemplaza la ficha clínica electrónica ni el juicio profesional.</p>
      </div>
      <div className="login-visual" aria-label="Equipo clínico acompañando a un paciente durante su atención">
        <img src="/clinical-care-hero.webp" alt="Enfermera y médico acompañan a un paciente durante el cuidado de su pie" />
        <div className="image-message">
          <span aria-hidden="true">♥</span>
          <p><strong>Un solo equipo.</strong><br />Una atención más humana.</p>
        </div>
      </div>
    </section>
  </main>;
}
