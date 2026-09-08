import { ChangeEvent, FormEvent, useEffect, useState, type ReactNode } from 'react';
import { api } from '../services/api';
import type { Center } from '../types';
import './platform-admin.css';

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

export default function PlatformAdminDashboard({ onChanged }: { onChanged: () => Promise<void> }) {
  const [centers, setCenters] = useState<Center[]>([]); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState(''); const [editing, setEditing] = useState<Center | null>(null); const [editLogoDataUrl, setEditLogoDataUrl] = useState(''); const [removeEditLogo, setRemoveEditLogo] = useState(false); const [archiveCandidate, setArchiveCandidate] = useState<Center | null>(null);
  const load = () => api.listCenters().then((result) => setCenters(result.centers));
  useEffect(() => { void load(); }, []);

  const readLogo = (event: ChangeEvent<HTMLInputElement>, onReady: (value: string) => void) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setMessage('El logo debe ser una imagen PNG, JPG o WebP.'); event.target.value = ''; return; }
    if (file.size > 2 * 1024 * 1024) { setMessage('El logo supera el máximo de 2 MB.'); event.target.value = ''; return; }
    const reader = new FileReader(); reader.onload = () => { onReady(String(reader.result)); setMessage(''); }; reader.onerror = () => setMessage('No fue posible leer el logo.'); reader.readAsDataURL(file);
  };
  const refresh = async () => { await Promise.all([load(), onChanged()]); };
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setMessage(''); const form = event.currentTarget; const data = new FormData(form);
    try { await api.createCenter({ name: String(data.get('name')), code: String(data.get('code')), region: String(data.get('region')), adminEmail: String(data.get('adminEmail')), adminName: String(data.get('adminName')), logoDataUrl: logoDataUrl || undefined }); form.reset(); setLogoDataUrl(''); await refresh(); setMessage('Centro creado y administrador invitado.'); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No fue posible crear el centro.'); } finally { setBusy(false); }
  };
  const openEditor = (center: Center) => { setEditing(center); setEditLogoDataUrl(''); setRemoveEditLogo(false); setMessage(''); };
  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!editing) return; setBusy(true); setMessage(''); const data = new FormData(event.currentTarget);
    try {
      await api.updateCenter(editing.id, { name: String(data.get('name')), code: String(data.get('code')), region: String(data.get('region')), address: String(data.get('address')), whatsappNumber: String(data.get('whatsappNumber')), allowedDomains: String(data.get('allowedDomains')).split(',').map((item) => item.trim()).filter(Boolean), logoDataUrl: editLogoDataUrl || undefined, removeLogo: removeEditLogo });
      setEditing(null); setEditLogoDataUrl(''); setRemoveEditLogo(false); await refresh(); setMessage('Centro actualizado correctamente.');
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No fue posible actualizar el centro.'); } finally { setBusy(false); }
  };
  const changeStatus = async (center: Center, status: 'active' | 'suspended') => {
    setBusy(true); setMessage(''); try { await api.updateCenter(center.id, { status }); await refresh(); setMessage(status === 'active' ? 'Centro reactivado.' : 'Centro suspendido; sus perfiles ya no pueden acceder.'); } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No fue posible cambiar el estado.'); } finally { setBusy(false); }
  };
  const archive = async () => {
    if (!archiveCandidate) return; setBusy(true); setMessage('');
    try { await api.archiveCenter(archiveCandidate.id); setArchiveCandidate(null); await refresh(); setMessage('Centro eliminado de la operación y archivado de forma recuperable.'); } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No fue posible eliminar el centro.'); } finally { setBusy(false); }
  };

  const operational = centers.filter((center) => center.status !== 'archived'); const archived = centers.filter((center) => center.status === 'archived');
  return <section>
    <div className="section-heading"><div><p className="eyebrow">Superadministración</p><h1>Centros de la plataforma</h1><p>Crea, modifica y controla el acceso de cada organización.</p></div><span className="metric">{operational.length} centros operativos</span></div>
    {message && <div className="notice">{message}<button onClick={() => setMessage('')}>×</button></div>}
    <div className="two-columns platform-centers-layout">
      <form className="panel form-grid" onSubmit={create}><h2>Incorporar centro</h2><div className="center-logo-picker full"><div className="center-logo-preview">{logoDataUrl ? <img src={logoDataUrl} alt="Vista previa del logo" /> : <span>+</span>}</div><div><strong>Logo del centro</strong><p>PNG, JPG o WebP. Máximo 2 MB.</p><div className="center-logo-actions"><label className="ghost">{logoDataUrl ? 'Cambiar logo' : 'Elegir logo'}<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => readLogo(event, setLogoDataUrl)} /></label>{logoDataUrl && <button type="button" className="logo-remove" onClick={() => setLogoDataUrl('')}>Quitar</button>}</div></div></div><label>Nombre del centro<input name="name" required /></label><label>Código interno<input name="code" placeholder="PDM-01" /></label><label>Región<input name="region" /></label><label>Nombre administrador<input name="adminName" /></label><label className="full">Correo institucional del administrador<input name="adminEmail" type="email" required /></label><button className="primary full" disabled={busy}>{busy ? 'Procesando…' : 'Crear centro e invitar'}</button></form>
      <div className="panel"><h2>Centros existentes</h2><div className="stack">{operational.map((center) => <CenterCard key={center.id} center={center}><button className="ghost" onClick={() => openEditor(center)}>Editar</button><button className="ghost" disabled={busy} onClick={() => void changeStatus(center, center.status === 'active' ? 'suspended' : 'active')}>{center.status === 'active' ? 'Suspender' : 'Reactivar'}</button><button className="danger-action" onClick={() => setArchiveCandidate(center)}>Eliminar</button></CenterCard>)}{operational.length === 0 && <p className="muted">No hay centros operativos.</p>}</div></div>
    </div>
    {archived.length > 0 && <details className="panel archived-centers"><summary>Centros eliminados ({archived.length})</summary><div className="stack">{archived.map((center) => <CenterCard key={center.id} center={center}><button className="ghost" disabled={busy} onClick={() => void changeStatus(center, 'active')}>Restaurar centro</button></CenterCard>)}</div></details>}

    {editing && <div className="modal-backdrop"><form className="panel center-editor" role="dialog" aria-modal="true" aria-labelledby="edit-center-title" onSubmit={saveEdit}><div className="card-heading"><div><p className="eyebrow">Superadministración</p><h2 id="edit-center-title">Modificar centro</h2></div><button type="button" className="modal-close" onClick={() => setEditing(null)} aria-label="Cerrar">×</button></div><div className="center-logo-picker"><div className="center-logo-preview">{editLogoDataUrl ? <img src={editLogoDataUrl} alt="Vista previa del nuevo logo" /> : !removeEditLogo && editing.logoUrl ? <img src={editing.logoUrl} alt="Logo actual" /> : <span>{initials(editing.name)}</span>}</div><div><strong>Identidad visual</strong><p>Puedes reemplazar o quitar el logo actual.</p><div className="center-logo-actions"><label className="ghost">Cambiar logo<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => readLogo(event, (value) => { setEditLogoDataUrl(value); setRemoveEditLogo(false); })} /></label>{(editing.logoUrl || editLogoDataUrl) && !removeEditLogo && <button type="button" className="logo-remove" onClick={() => { setEditLogoDataUrl(''); setRemoveEditLogo(true); }}>Quitar logo</button>}</div></div></div><div className="form-grid editor-fields"><label>Nombre<input name="name" defaultValue={editing.name} required /></label><label>Código<input name="code" defaultValue={editing.code} required /></label><label>Región<input name="region" defaultValue={editing.region} /></label><label>Dirección<input name="address" defaultValue={editing.address} /></label><label>WhatsApp institucional<input name="whatsappNumber" defaultValue={editing.whatsappNumber} placeholder="56912345678" /></label><label>Dominios autorizados<input name="allowedDomains" defaultValue={editing.allowedDomains.join(', ')} placeholder="hospital.cl, salud.cl" /></label></div><footer className="modal-actions"><button type="button" className="ghost" onClick={() => setEditing(null)}>Cancelar</button><button className="primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button></footer></form></div>}
    {archiveCandidate && <div className="modal-backdrop"><section className="panel archive-confirmation" role="dialog" aria-modal="true" aria-labelledby="archive-center-title"><span className="archive-icon" aria-hidden="true">!</span><h2 id="archive-center-title">Eliminar {archiveCandidate.name}</h2><p>El centro desaparecerá de la operación y todos sus perfiles perderán acceso. Por seguridad clínica, sus registros no se borrarán físicamente y el centro podrá restaurarse.</p><div className="modal-actions"><button className="ghost" onClick={() => setArchiveCandidate(null)}>Cancelar</button><button className="danger-confirm" disabled={busy} onClick={() => void archive()}>{busy ? 'Eliminando…' : 'Eliminar y archivar'}</button></div></section></div>}
  </section>;
}

function CenterCard({ center, children }: { center: Center; children: ReactNode }) {
  return <article className="center-management-card"><div className="center-card-summary"><div className="center-list-logo">{center.logoUrl ? <img src={center.logoUrl} alt="" /> : <span>{initials(center.name)}</span>}</div><div><strong>{center.name}</strong><small>{center.code} · {center.region || 'Región sin indicar'}</small></div><span className={`pill ${center.status}`}>{center.status === 'active' ? 'Activo' : center.status === 'suspended' ? 'Suspendido' : 'Eliminado'}</span></div><div className="center-card-actions">{children}</div></article>;
}
