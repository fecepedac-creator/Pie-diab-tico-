import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Center } from '../types';
import './platform-admin.css';

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

export default function PlatformAdminDashboard({ onChanged }: { onChanged: () => Promise<void> }) {
  const [centers, setCenters] = useState<Center[]>([]); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState('');
  const load = () => api.listCenters().then((result) => setCenters(result.centers));
  useEffect(() => { void load(); }, []);
  const selectLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setMessage('El logo debe ser una imagen PNG, JPG o WebP.'); event.target.value = ''; return; }
    if (file.size > 2 * 1024 * 1024) { setMessage('El logo supera el máximo de 2 MB.'); event.target.value = ''; return; }
    const reader = new FileReader(); reader.onload = () => { setLogoDataUrl(String(reader.result)); setMessage(''); }; reader.onerror = () => setMessage('No fue posible leer el logo.'); reader.readAsDataURL(file);
  };
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setMessage(''); const data = new FormData(event.currentTarget);
    try { await api.createCenter({ name: String(data.get('name')), code: String(data.get('code')), region: String(data.get('region')), adminEmail: String(data.get('adminEmail')), adminName: String(data.get('adminName')), logoDataUrl: logoDataUrl || undefined }); event.currentTarget.reset(); setLogoDataUrl(''); await Promise.all([load(), onChanged()]); setMessage('Centro creado y administrador invitado.'); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No fue posible crear el centro.'); } finally { setBusy(false); }
  };
  return <section>
    <div className="section-heading"><div><p className="eyebrow">Superadministración</p><h1>Centros de la plataforma</h1><p>Gestiona organizaciones sin acceder por defecto a sus fichas clínicas.</p></div><span className="metric">{centers.length} centros</span></div>
    <div className="two-columns">
      <form className="panel form-grid" onSubmit={create}><h2>Incorporar centro</h2><div className="center-logo-picker full"><div className="center-logo-preview">{logoDataUrl ? <img src={logoDataUrl} alt="Vista previa del logo" /> : <span>+</span>}</div><div><strong>Logo del centro</strong><p>PNG, JPG o WebP. Máximo 2 MB.</p><div className="center-logo-actions"><label className="ghost">{logoDataUrl ? 'Cambiar logo' : 'Elegir logo'}<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={selectLogo} /></label>{logoDataUrl && <button type="button" className="logo-remove" onClick={() => setLogoDataUrl('')}>Quitar</button>}</div></div></div><label>Nombre del centro<input name="name" required /></label><label>Código interno<input name="code" placeholder="PDM-01" /></label><label>Región<input name="region" /></label><label>Nombre administrador<input name="adminName" /></label><label className="full">Correo institucional del administrador<input name="adminEmail" type="email" required /></label><button className="primary full" disabled={busy}>{busy ? 'Creando…' : 'Crear centro e invitar'}</button>{message && <p className="full helper">{message}</p>}</form>
      <div className="panel"><h2>Centros existentes</h2><div className="stack">{centers.map((center) => <article className="list-card center-list-card" key={center.id}><div className="center-list-identity"><div className="center-list-logo">{center.logoUrl ? <img src={center.logoUrl} alt="" /> : <span>{initials(center.name)}</span>}</div><div><strong>{center.name}</strong><small>{center.code} · {center.region || 'Región sin indicar'}</small></div></div><span className={`pill ${center.status}`}>{center.status === 'active' ? 'Activo' : 'Suspendido'}</span></article>)}</div></div>
    </div>
  </section>;
}
