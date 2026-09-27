import { useState } from 'react';
import { auth } from '../firebase';
import type { SessionInfo } from '../types';
import { isEligibleTensSession, runT6SecurityEventProbe, type T6ProbeResult } from './securityEventProbe';

// Module lifetime, not component lifetime: remounts cannot repeat the three requests.
let probeStarted = false;

export default function T6SecurityEventDiagnostic({ session }: { session: SessionInfo }) {
  const [results, setResults] = useState<T6ProbeResult[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const isTens = isEligibleTensSession(session, auth.currentUser?.uid);

  const run = async () => {
    if (!isTens || probeStarted || !auth.currentUser || auth.currentUser.uid !== session.user.uid) return;
    probeStarted = true;
    setRunning(true);
    try {
      const token = await auth.currentUser.getIdToken();
      await runT6SecurityEventProbe(token, window.location.origin, (result) => {
        setResults((current) => [...current, result]);
      });
    } catch {
      setError('No fue posible completar el diagnóstico. Detén la prueba y revisa la evidencia disponible.');
    } finally {
      setRunning(false);
    }
  };

  return <main className="centered" style={{ display: 'block', maxWidth: 660, margin: '3rem auto', padding: '1.5rem' }}>
    <h1>Diagnóstico temporal T6</h1>
    <p>Cuenta TENS del centro ficticio. Una ejecución por carga; sólo solicitudes GET al origen actual.</p>
    <button type="button" disabled={!isTens || probeStarted || running} onClick={() => void run()}>
      {running ? 'Comprobando…' : 'Ejecutar tres solicitudes'}
    </button>
    {!isTens && <p>Esta sesión no tiene el perfil TENS requerido.</p>}
    {results.length > 0 && <ol>{results.map((result) => <li key={result.label}>
      {result.label}: HTTP {result.status} · X-Request-Id {result.requestId}
    </li>)}</ol>}
    {error && <p role="alert">{error}</p>}
  </main>;
}
