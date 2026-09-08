import { FormEvent, useEffect, useState } from 'react';
import { api } from '../services/api';
import { CENTER_ROLES, ROLE_LABELS, type Center, type CenterRole, type Membership } from '../types';

export default function CenterAdminDashboard({ center }: { center: Center }) {
  const [members, setMembers] = useState<Membership[]>([]); const [message, setMessage] = useState('');
  const load = () => api.listMembers(center.id).then((result) => setMembers(result.members));
  useEffect(() => { void load(); }, [center.id]);
  const invite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const roles = data.getAll('roles') as CenterRole[];
    try { await api.inviteMember(center.id, { email: String(data.get('email')), displayName: String(data.get('displayName')), roles }); form.reset(); await load(); setMessage('Invitación registrada. El acceso se activará con esa cuenta Google.'); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No fue posible invitar.'); }
  };
  const toggle = async (member: Membership) => { await api.updateMember(center.id, member.id, { status: member.status === 'disabled' ? 'active' : 'disabled' }); await load(); };
  const saveSettings = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); try { await api.updateCenterSettings(center.id, { name: String(data.get('name')), region: String(data.get('region')), address: String(data.get('address')), whatsappNumber: String(data.get('whatsappNumber')) }); setMessage('Configuración institucional guardada.'); } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No fue posible guardar.'); } };
  return <section>
    <div className="section-heading"><div><p className="eyebrow">Administración del centro</p><h1>{center.name}</h1><p>Una persona puede tener más de un perfil; los permisos se verifican en cada acción.</p></div><span className="metric">{members.length} usuarios</span></div>
    <div className="two-columns wide-left"><div className="stack"><form className="panel form-grid" onSubmit={invite}><h2>Incluir profesional</h2><label>Nombre<input name="displayName" required /></label><label>Correo institucional<input name="email" type="email" required /></label><fieldset className="full"><legend>Perfiles</legend><div className="check-grid">{CENTER_ROLES.map((role) => <label className="check" key={role}><input type="checkbox" name="roles" value={role} />{ROLE_LABELS[role]}</label>)}</div></fieldset><button className="primary full">Guardar invitación</button>{message && <p className="helper full">{message}</p>}</form><form className="panel form-grid" onSubmit={saveSettings}><h2>Datos institucionales</h2><label>Nombre<input name="name" defaultValue={center.name} required /></label><label>Región<input name="region" defaultValue={center.region} /></label><label>Dirección<input name="address" defaultValue={center.address} /></label><label>WhatsApp del equipo<input name="whatsappNumber" defaultValue={center.whatsappNumber} placeholder="56912345678" /></label><button className="primary full">Guardar configuración</button></form></div>
    <div className="panel"><h2>Equipo</h2><div className="stack">{members.map((member) => <article className="member-card" key={member.id}><div><strong>{member.displayName}</strong><small>{member.email}</small><div className="role-list">{member.roles.map((role) => <span className="pill" key={role}>{ROLE_LABELS[role]}</span>)}</div></div><button className="ghost" onClick={() => void toggle(member)}>{member.status === 'disabled' ? 'Activar' : 'Desactivar'}</button></article>)}</div></div></div>
  </section>;
}
