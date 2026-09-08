import { signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

export default function LoginView({ error }: { error?: string }) {
  const login = async () => {
    try { await signInWithPopup(auth, googleProvider); }
    catch (cause) {
      if (cause && typeof cause === 'object' && 'code' in cause && ['auth/popup-blocked', 'auth/cancelled-popup-request'].includes(String(cause.code))) {
        await signInWithRedirect(auth, googleProvider); return;
      }
      const message = cause instanceof Error ? cause.message : 'No fue posible iniciar sesión.';
      window.dispatchEvent(new CustomEvent('auth-error', { detail: message }));
    }
  };

  return <main className="login-shell">
    <section className="login-card">
      <div className="brand-mark" aria-hidden="true">PD</div>
      <p className="eyebrow">Atención coordinada · Pie diabético</p>
      <h1>Una ficha de trabajo compartida para todo el equipo</h1>
      <p className="lead">Registra, coordina y copia una evolución clara a la ficha clínica institucional. Los datos se mantienen separados por centro.</p>
      {error && <div className="notice danger" role="alert">{error}</div>}
      <button className="google-button" onClick={login}>
        <span className="google-g">G</span> Continuar con Google institucional
      </button>
      <div className="trust-grid">
        <span>✓ Acceso por invitación</span><span>✓ Permisos por perfil</span><span>✓ Registro de cambios</span>
      </div>
      <p className="fine-print">Esta plataforma apoya el flujo asistencial y no reemplaza la ficha clínica electrónica ni el juicio profesional.</p>
    </section>
  </main>;
}
