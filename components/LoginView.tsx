import { useState } from 'react';
import { signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

export default function LoginView({ error }: { error?: string }) {
  const [busy, setBusy] = useState(false);
  const reportError = (code = '') => {
    const message = code === 'auth/unauthorized-domain'
      ? 'Este sitio todavía no está autorizado para iniciar sesión. Contacta al administrador de la plataforma.'
      : 'No pudimos completar el acceso con Google. Inténtalo nuevamente.';
    window.dispatchEvent(new CustomEvent('auth-error', { detail: message }));
  };

  const login = async () => {
    setBusy(true);
    try {
      // Touch-enabled laptops report a coarse pointer even with a full desktop
      // browser. Keep redirect for genuinely small screens and use the more
      // reliable popup flow for tablets and computers.
      const prefersRedirect = window.innerWidth < 760;
      if (prefersRedirect) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      await signInWithPopup(auth, googleProvider);
    }
    catch (cause) {
      const code = cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : '';
      if (['auth/popup-blocked', 'auth/cancelled-popup-request', 'auth/internal-error'].includes(code)) {
        try { await signInWithRedirect(auth, googleProvider); }
        catch (redirectCause) {
          reportError(redirectCause && typeof redirectCause === 'object' && 'code' in redirectCause ? String(redirectCause.code) : '');
          setBusy(false);
        }
        return;
      }
      reportError(code);
      setBusy(false);
    }
  };

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
        <button className="google-button" onClick={login} disabled={busy}>
          <span className="google-g" aria-hidden="true">G</span> {busy ? 'Abriendo acceso seguro…' : 'Ingresar con Google institucional'}
        </button>
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
