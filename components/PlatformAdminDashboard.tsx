import { FormEvent, useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Center } from '../types';

export default function PlatformAdminDashboard({ onChanged }: { onChanged: () => Promise<void> }) {
  const [centers, setCenters] = useState<Center[]>([]); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const load = () => api.listCenters().then((result) => setCenters(result.centers));
  useEffect(() => { void load(); }, []);
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setMessage(''); const data = new FormData(event.currentTarget);
    try { await api.createCenter({ name: String(data.get('name')), code: String(data.get('code')), region: String(data.get('region')), adminEmail: String(data.get('adminEmail')), adminName: String(data.get('adminName')) } as Partial<Center> & { name: string; adminEmail: string }); event.currentTarget.reset(); await Promise.all([load(), onChanged()]); setMessage('Centro creado y administrador invitado.'); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No fue posible crear el centro.'); } finally { setBusy(false); }
  };
  return <section>
    <div className="section-heading"><div><p className="eyebrow">Superadministración</p><h1>Centros de la plataforma</h1><p>Gestiona organizaciones sin acceder por defecto a sus fichas clínicas.</p></div><span className="metric">{centers.length} centros</span></div>
    <div className="two-columns">
      <form className="panel form-grid" onSubmit={create}><h2>Incorporar centro</h2><label>Nombre del centro<input name="name" required /></label><label>Código interno<input name="code" placeholder="PDM-01" /></label><label>Región<input name="region" /></label><label>Nombre administrador<input name="adminName" /></label><label className="full">Correo institucional del administrador<input name="adminEmail" type="email" required /></label><button className="primary full" disabled={busy}>{busy ? 'Creando…' : 'Crear centro e invitar'}</button>{message && <p className="full helper">{message}</p>}</form>
      <div className="panel"><h2>Centros existentes</h2><div className="stack">{centers.map((center) => <article className="list-card" key={center.id}><div><strong>{center.name}</strong><small>{center.code} · {center.region || 'Región sin indicar'}</small></div><span className={`pill ${center.status}`}>{center.status === 'active' ? 'Activo' : 'Suspendido'}</span></article>)}</div></div>
    </div>
  </section>;
}
