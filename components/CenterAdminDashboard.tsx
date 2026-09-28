import { FormEvent, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { CENTER_ROLES, ROLE_LABELS, type Center, type CenterRole, type Membership } from '../types';
import NursingCatalogPanel from './NursingCatalogPanel';

import './center-admin.css';

const statusLabels = { invited: 'Invitación pendiente', active: 'Activo', disabled: 'Acceso desactivado' };
const errorText = (cause: unknown) => cause instanceof Error ? cause.message : 'No fue posible completar la operación.';

export default function CenterAdminDashboard({ center, demoMode = false, demoMembers = [], onChanged }: { center: Center; demoMode?: boolean; demoMembers?: Membership[]; onChanged?: () => Promise<void> }) {
  const [members, setMembers] = useState<Membership[]>(demoMode ? demoMembers : []);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!demoMode);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<{ id: string; status: 'active' | 'disabled' } | null>(null);
  const pendingOperations = useRef(new Map<string, string>());
  const operationFor = (key: string) => {
    if (!pendingOperations.current.has(key)) pendingOperations.current.set(key, crypto.randomUUID());
    return pendingOperations.current.get(key)!;
  };
  const load = async () => { const result = await api.listMembers(center.id); setMembers(result.members); };
  useEffect(() => {
    let cancelled = false;
    setMembers(demoMode ? demoMembers : []); setEditing(null); setCandidate(null); setMessage(''); setError(''); setLoading(!demoMode);
    if (!demoMode) api.listMembers(center.id).then((result) => { if (!cancelled) setMembers(result.members); }).catch((cause) => { if (!cancelled) setError(errorText(cause)); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [center.id, demoMode]);
  const run = async (action: () => Promise<void>) => {
    if (demoMode || busy) return;
    setBusy(true); setError(''); setMessage('');
    try { await action(); } catch (cause) { setError(errorText(cause)); } finally { setBusy(false); }
  };
  const invite = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const roles = data.getAll('roles') as CenterRole[];
    if (!roles.length) { setError('Selecciona al menos un perfil.'); return; }
    const input = { email: String(data.get('email')).trim(), displayName: String(data.get('displayName')).trim(), roles, reason: String(data.get('reason')).trim() };
    const key = `invite:${center.id}:${JSON.stringify(input)}`;
    void run(async () => {
      await api.inviteMember(center.id, { ...input, operationId: operationFor(key) });
      pendingOperations.current.delete(key);
      form.reset(); setMessage('Invitación registrada. La persona debe ingresar con ese correo Google. No se envió un correo automático.'); await load();
    });
  };
  const update = (member: Membership, input: { roles?: CenterRole[]; status?: Membership['status']; reason: string }) => void run(async () => {
    const key = `update:${center.id}:${member.id}:${JSON.stringify(input)}`;
    const result = await api.updateMember(center.id, member.id, { ...input, operationId: operationFor(key) });
    pendingOperations.current.delete(key);
    setMembers((previous) => previous.map((item) => item.id === member.id ? result.member : item));
    setEditing(null); setCandidate(null); setMessage('Acceso actualizado. Los permisos se comprueban en cada operación.');
    await onChanged?.();
  });
  const saveRoles = (event: FormEvent<HTMLFormElement>, member: Membership) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); const roles = data.getAll('roles') as CenterRole[];
    if (!roles.length) { setError('Debe conservar al menos un perfil.'); return; } update(member, { roles, reason: String(data.get('reason')).trim() });
  };
  const changeStatus = (event: FormEvent<HTMLFormElement>, member: Membership, status: 'active' | 'disabled') => {
    event.preventDefault();
    update(member, { status, reason: String(new FormData(event.currentTarget).get('reason')).trim() });
  };
  const saveSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    void run(async () => {
      await api.updateCenterSettings(center.id, { name: String(data.get('name')).trim(), region: String(data.get('region')).trim(), address: String(data.get('address')).trim(), whatsappNumber: String(data.get('whatsappNumber')).trim() });
      setMessage('Configuración institucional guardada.'); await onChanged?.();
    });
  };
  const visible = members.filter((member) => `${member.displayName} ${member.email}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return <section className="center-admin">
    <div className="section-heading"><div><p className="eyebrow">Administración del centro</p><h1>{center.name}</h1><p>Gestiona el equipo y los datos de esta organización. El alta, la suspensión y el archivo de centros corresponden a Superadministración.</p></div><span className="metric">{members.filter((member) => member.status === 'active').length} activos · {members.filter((member) => member.status === 'invited').length} pendientes</span></div>
    {demoMode && <p className="notice">Demostración con datos ficticios. Las acciones están deshabilitadas.</p>}
    {error && <div className="notice" role="alert">{error}</div>}
    {message && <p className="notice" role="status">{message}</p>}
    <div className="two-columns wide-left"><div className="stack">
      <form className="panel form-grid" onSubmit={invite}><h2>Invitar integrante</h2><p className="full helper">Registra el acceso y comparte por tu canal habitual la dirección de la aplicación. La invitación se activa al ingresar con el correo indicado.</p><label>Nombre<input name="displayName" required maxLength={120} disabled={demoMode || busy} /></label><label>Correo de la cuenta Google<input name="email" type="email" required maxLength={254} disabled={demoMode || busy} /></label><RolePicker disabled={demoMode || busy} /><AccessReason disabled={demoMode || busy} /><p className="helper full">Los perfiles se suman. Administrar el centro no concede por sí solo acceso clínico.</p><button className="primary full" disabled={demoMode || busy}>{busy ? 'Procesando…' : 'Registrar invitación'}</button></form>
      <form key={center.id + center.updatedAt} className="panel form-grid" onSubmit={saveSettings}><h2>Datos institucionales</h2><label>Nombre<input name="name" defaultValue={center.name} required maxLength={120} disabled={demoMode || busy} /></label><label>Región<input name="region" defaultValue={center.region} maxLength={80} disabled={demoMode || busy} /></label><label>Dirección<input name="address" defaultValue={center.address} maxLength={200} disabled={demoMode || busy} /></label><label>WhatsApp del equipo<input name="whatsappNumber" type="tel" defaultValue={center.whatsappNumber} placeholder="56912345678" maxLength={30} disabled={demoMode || busy} /></label><button className="primary full" disabled={demoMode || busy}>Guardar configuración</button></form>
    </div><div className="panel"><h2>Equipo del centro</h2><label>Buscar por nombre o correo<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></label>{loading && <p role="status">Cargando equipo…</p>}{!loading && !visible.length && <p>{members.length ? 'No hay coincidencias.' : 'No hay integrantes disponibles.'}</p>}{error && <button className="ghost" disabled={demoMode || busy} onClick={() => void run(load)}>Volver a cargar equipo</button>}
      <div className="stack team-list">{visible.map((member) => <article className="team-member" key={member.id}>
        <strong>{member.displayName}</strong><small>{member.email}</small><span className="pill">{statusLabels[member.status]}</span>
        {editing === member.id ? <form onSubmit={(event) => saveRoles(event, member)}><RolePicker roles={member.roles} disabled={busy || demoMode} /><AccessReason disabled={busy || demoMode} /><div className="team-actions"><button className="primary" disabled={busy || demoMode}>Guardar perfiles</button><button type="button" className="ghost" disabled={busy} onClick={() => setEditing(null)}>Cancelar</button></div></form> : <><div className="role-list">{member.roles.map((role) => <span className="pill" key={role}>{ROLE_LABELS[role]}</span>)}</div><div className="team-actions"><button className="ghost" disabled={busy || demoMode} onClick={() => { setEditing(member.id); setCandidate(null); }}>Editar perfiles</button>{member.status === 'disabled' ? <button className="ghost" disabled={busy || demoMode} onClick={() => { setCandidate({ id: member.id, status: 'active' }); setEditing(null); }}>Reactivar acceso</button> : <button className="ghost" disabled={busy || demoMode} onClick={() => { setCandidate({ id: member.id, status: 'disabled' }); setEditing(null); }}>{member.status === 'invited' ? 'Cancelar invitación' : 'Desactivar acceso'}</button>}</div></>}
        {candidate?.id === member.id && <form className="access-confirmation" onSubmit={(event) => changeStatus(event, member, candidate.status)}><p>{candidate.status === 'disabled' ? `Se bloqueará el acceso de ${member.displayName} a este centro. Sus registros se conservarán.` : `Se restablecerá el acceso de ${member.displayName} a este centro.`}</p><AccessReason disabled={busy || demoMode} /><div className="team-actions"><button className="primary" disabled={busy || demoMode}>{candidate.status === 'disabled' ? 'Confirmar desactivación' : 'Confirmar reactivación'}</button><button type="button" className="ghost" disabled={busy} onClick={() => setCandidate(null)}>Cancelar</button></div></form>}
      </article>)}</div>
    </div></div>
    <NursingCatalogPanel center={center} demoMode={demoMode} />

  </section>;
}

function AccessReason({ disabled }: { disabled: boolean }) {
  return <label className="full">Motivo del cambio de acceso<textarea name="reason" required minLength={10} maxLength={200} rows={2} disabled={disabled} placeholder="Ej.: Se incorpora al equipo del centro" /><small className="helper">Sólo razones administrativas. No incluyas datos de pacientes, correos, RUT ni números de ficha.</small></label>;
}

function RolePicker({ roles = [], disabled }: { roles?: CenterRole[]; disabled: boolean }) {
  return <fieldset className="full" disabled={disabled}><legend>Perfiles del centro</legend><div className="check-grid">{CENTER_ROLES.map((role) => <label className="check" key={role}><input type="checkbox" name="roles" value={role} defaultChecked={roles.includes(role)} />{ROLE_LABELS[role]}</label>)}</div></fieldset>;
}
