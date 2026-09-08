import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut, type Unsubscribe } from 'firebase/auth';
import { auth, authPersistenceReady } from './firebase';
import { api, ApiError } from './services/api';
import type { Center, ClinicalState, Encounter, Membership, SessionInfo } from './types';
import LoginView from './components/LoginView';
import PlatformAdminDashboard from './components/PlatformAdminDashboard';
import CenterAdminDashboard from './components/CenterAdminDashboard';
import ClinicalDashboard from './components/ClinicalDashboard';

type View = 'clinical' | 'center' | 'platform';

export default function App() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [centerId, setCenterId] = useState(() => localStorage.getItem('pd_center') || '');
  const [state, setState] = useState<ClinicalState | null>(null);
  const [view, setView] = useState<View>('clinical');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshSession = async () => {
    const value = await api.session();
    setSession(value);
    const valid = value.centers.some((center) => center.id === centerId);
    const next = valid ? centerId : value.centers[0]?.id || '';
    setCenterId(next); localStorage.setItem('pd_center', next);
    if (value.platformAdmin) setView('platform');
  };

  useEffect(() => {
    let disposed = false;
    let unsubscribe: Unsubscribe = () => undefined;

    const initializeAuthentication = async () => {
      try {
        await authPersistenceReady;
      } catch (cause) {
        if (!disposed) {
          const code = cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : '';
          setError(code === 'auth/unauthorized-domain'
            ? 'Este sitio todavía no está autorizado para iniciar sesión. Contacta al administrador de la plataforma.'
            : 'No pudimos completar el acceso con Google. Inténtalo nuevamente.');
        }
      }

      if (disposed) return;
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        setLoading(true);
        if (!user) { setSession(null); setState(null); setLoading(false); return; }

        const enteredWithGoogle = user.providerData.some((provider) => provider.providerId === 'google.com');
        if (!enteredWithGoogle || !user.emailVerified) {
          setSession(null); setState(null);
          await signOut(auth);
          setError('Se cerró una sesión antigua de prueba. Ingresa nuevamente con Google y elige tu cuenta institucional.');
          setLoading(false);
          return;
        }

        setError('');
        try {
          // Refresh the token once when the session starts so recently verified
          // Google accounts do not keep using stale authorization claims.
          await user.getIdToken(true);
          await refreshSession();
        }
        catch (cause) {
          const message = cause instanceof ApiError && cause.status === 403 && cause.message.includes('correo verificado')
            ? 'La cuenta Google activa aún no confirma su correo. Vuelve a ingresar con tu cuenta institucional.'
            : cause instanceof ApiError && cause.status === 403 && cause.message.includes('acceso activo')
              ? 'Tu cuenta Google aún no tiene una invitación activa. Solicita acceso al administrador del centro.'
              : cause instanceof Error ? cause.message : 'No fue posible cargar tu sesión.';
          setError(message);
        } finally { setLoading(false); }
      });
    };

    void initializeAuthentication();
    return () => { disposed = true; unsubscribe(); };
  }, []);

  useEffect(() => {
    const handler = (event: Event) => setError((event as CustomEvent<string>).detail);
    window.addEventListener('auth-error', handler); return () => window.removeEventListener('auth-error', handler);
  }, []);

  const membership = useMemo<Membership | undefined>(() => session?.memberships.find((item) => item.centerId === centerId), [session, centerId]);
  const center = session?.centers.find((item) => item.id === centerId);
  const canUseClinical = Boolean(membership?.roles.some((role) => !['center_admin', 'auditor'].includes(role)));
  const canAdminCenter = membership?.roles.includes('center_admin') ?? false;

  const refreshState = async () => {
    if (!centerId || !membership || !membership.roles.some((role) => role !== 'center_admin')) { setState(null); return; }
    setState(await api.getState(centerId));
  };

  useEffect(() => { if (centerId && session) void refreshState().catch((cause) => setError(cause instanceof Error ? cause.message : 'No fue posible cargar el centro.')); }, [centerId, session]);

  const chooseCenter = (id: string) => { setCenterId(id); localStorage.setItem('pd_center', id); setView('clinical'); };
  const replaceEncounter = (encounter: Encounter) => setState((current) => current ? ({ ...current, encounters: current.encounters.map((item) => item.id === encounter.id ? encounter : item) }) : current);

  if (loading) return <main className="centered"><div className="spinner" /><p>Cargando acceso seguro…</p></main>;
  if (!auth.currentUser || !session) return <LoginView error={error} />;

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark small">PD</span><div><strong>Pie Diabético</strong><small>Gestión clínica coordinada</small></div></div>
      <div className="top-actions">
        {session.centers.length > 0 && <select aria-label="Centro activo" value={centerId} onChange={(event) => chooseCenter(event.target.value)}>{session.centers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
        <button className="ghost" onClick={() => signOut(auth)}>Salir</button>
      </div>
    </header>
    <nav className="tabs" aria-label="Secciones principales">
      {canUseClinical && <button className={view === 'clinical' ? 'active' : ''} onClick={() => setView('clinical')}>Atención clínica</button>}
      {canAdminCenter && <button className={view === 'center' ? 'active' : ''} onClick={() => setView('center')}>Administrar centro</button>}
      {session.platformAdmin && <button className={view === 'platform' ? 'active' : ''} onClick={() => setView('platform')}>Plataforma</button>}
    </nav>
    {error && <div className="notice danger page-notice">{error}<button onClick={() => setError('')}>×</button></div>}
    <main className="page">
      {view === 'platform' && session.platformAdmin && <PlatformAdminDashboard onChanged={refreshSession} />}
      {view === 'center' && center && canAdminCenter && <CenterAdminDashboard center={center} />}
      {view === 'clinical' && center && membership && canUseClinical && <ClinicalDashboard center={center} membership={membership} state={state} onRefresh={refreshState} onEncounterChanged={replaceEncounter} />}
      {view === 'clinical' && !canUseClinical && <section className="empty-state"><h2>Perfil administrativo activo</h2><p>Este perfil no permite abrir información clínica. Puedes administrar el centro o la plataforma desde las pestañas superiores.</p></section>}
    </main>
  </div>;
}
