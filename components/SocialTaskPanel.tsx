import { FormEvent, useEffect, useState } from 'react';
import { ApiError, api } from '../services/api';
import type { ClinicalTask, Membership, Patient, WoundEpisode } from '../types';

type SocialMember = { uid: string; displayName: string };
type Props = {
  centerId: string;
  membership: Membership;
  patient: Patient;
  episode: WoundEpisode;
  tasks: ClinicalTask[];
  onRefresh: () => Promise<void>;
  onClosed: () => void;
  demoMode?: boolean;
};

const statusLabel: Record<ClinicalTask['status'], string> = {
  created: 'Creada', notified: 'Notificada', accepted: 'Aceptada',
  in_progress: 'En curso', resolved: 'Cerrada', rejected: 'Rechazada',
};
const active = (task: ClinicalTask) => !['resolved', 'rejected'].includes(task.status);
const messageFor = (cause: unknown) => cause instanceof ApiError && cause.status === 409
  ? `${cause.message} Se actualizaron los datos; revisa el estado antes de volver a guardar.`
  : cause instanceof Error ? cause.message : 'No fue posible actualizar la gestión.';

export default function SocialTaskPanel({ centerId, membership, patient, episode, tasks, onRefresh, onClosed, demoMode = false }: Props) {
  const manager = membership.roles.some((role) => ['coordinator', 'nurse', 'doctor'].includes(role));
  const socialTasks = tasks.filter((task) => task.episodeId === episode.id && task.recipientRole === 'social_worker');
  const visibleTasks = manager ? socialTasks : socialTasks.filter((task) => task.assignedToUid === membership.uid && active(task));
  const [members, setMembers] = useState<SocialMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(manager && !demoMode);
  const [memberError, setMemberError] = useState('');
  const [assignee, setAssignee] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const loadMembers = async () => {
    setLoadingMembers(true); setMemberError('');
    try { setMembers((await api.listSocialMembers(centerId)).members); }
    catch (cause) { setMemberError(cause instanceof Error ? cause.message : 'No fue posible cargar trabajo social.'); }
    finally { setLoadingMembers(false); }
  };
  useEffect(() => { if (manager && !demoMode) void loadMembers(); }, [centerId, manager, demoMode]);

  const update = async (task: ClinicalTask, assignedToUid: string) => {
    if (!task.version) { setMessage('Falta la versión de la gestión. Actualiza los datos antes de asignar.'); return; }
    setBusy(true); setMessage('');
    try {
      await api.updateTask(centerId, task.id, { version: task.version, assignedToUid });
      await onRefresh();
      setMessage('Responsable asignado. La gestión ya está disponible para esa persona.');
    } catch (cause) {
      setMessage(messageFor(cause));
      if (cause instanceof ApiError && cause.status === 409) await onRefresh();
    } finally { setBusy(false); }
  };

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (demoMode || busy || !assignee || !reason.trim()) return;
    setBusy(true); setMessage('');
    try {
      const created = await api.createTask(centerId, {
        patientId: patient.id, episodeId: episode.id, recipientRole: 'social_worker',
        type: 'social', title: 'Gestión social', reason: reason.trim(), priority: 'routine',
      });
      try {
        await api.updateTask(centerId, created.task.id, { version: created.task.version, assignedToUid: assignee });
        setReason(''); setAssignee('');
        setMessage('Gestión social creada y asignada.');
      } catch (cause) {
        setMessage(`La gestión se creó sin responsable. ${messageFor(cause)} Asígnala desde el seguimiento.`);
      }
      await onRefresh();
    } catch (cause) {
      setMessage(messageFor(cause));
      if (cause instanceof ApiError && cause.status === 409) await onRefresh();
    } finally { setBusy(false); }
  };

  const memberName = (uid?: string) => uid
    ? members.find((item) => item.uid === uid)?.displayName || `Cuenta ${uid}`
    : 'Sin asignar';

  return <section className="panel social-task-panel" aria-label="Gestión social">
    <h2>Gestión social · {episode.location}</h2>
    {manager && <>
      <p className="helper">Selecciona una persona activa de trabajo social de este centro. Sólo la persona asignada podrá abrir y responder la gestión.</p>
      {loadingMembers && <p role="status">Cargando integrantes de trabajo social…</p>}
      {memberError && <p className="pre-message" role="alert">{memberError} <button type="button" onClick={() => void loadMembers()}>Reintentar</button></p>}
      {!loadingMembers && !memberError && members.length === 0 && <p className="pre-message" role="status">No hay personas activas de trabajo social en este centro.</p>}
      {!socialTasks.some(active) && <form className="social-task-form" onSubmit={(event) => void create(event)}>
        <label>Motivo de la gestión<textarea required maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        <label>Responsable<select required value={assignee} onChange={(event) => setAssignee(event.target.value)} disabled={loadingMembers || Boolean(memberError)}><option value="">Seleccionar persona</option>{members.map((item) => <option key={item.uid} value={item.uid}>{item.displayName}</option>)}</select></label>
        <button className="primary" disabled={demoMode || busy || loadingMembers || Boolean(memberError) || !members.length}>Crear y asignar gestión</button>
      </form>}
    </>}
    <div className="stack">{visibleTasks.map((task) => <article className="social-task-card" key={task.id}>
      <div className="social-task-heading"><strong>{task.title === 'Gestión del equipo' ? 'Gestión social' : task.title}</strong><span className={`pill ${task.status}`}>{statusLabel[task.status]}</span></div>
      {task.reason && <p>{task.reason}</p>}<p><strong>Responsable:</strong> {manager ? memberName(task.assignedToUid) : 'Tú'}</p>
      {manager && active(task) && ['created', 'notified'].includes(task.status) && <SocialAssigneePicker task={task} members={members} disabled={demoMode || busy || loadingMembers || Boolean(memberError)} onAssign={(uid) => void update(task, uid)} />}
      {task.result && <p><strong>Respuesta:</strong> {task.result}</p>}
      {!manager && <SocialResponse task={task} centerId={centerId} disabled={demoMode || busy} onRefresh={onRefresh} onClosed={onClosed} />}
    </article>)}{!visibleTasks.length && <p className="muted">{manager ? 'Aún no hay gestiones sociales para este episodio.' : 'No hay una gestión social activa asignada a tu cuenta.'}</p>}</div>
    {message && <p className="pre-message" role="status">{message}</p>}
  </section>;
}

function SocialAssigneePicker({ task, members, disabled, onAssign }: { task: ClinicalTask; members: SocialMember[]; disabled: boolean; onAssign: (uid: string) => void }) {
  const [uid, setUid] = useState(task.assignedToUid || '');
  useEffect(() => setUid(task.assignedToUid || ''), [task.assignedToUid]);
  return <div className="social-task-assignment"><label>Asignar responsable<select value={uid} onChange={(event) => setUid(event.target.value)} disabled={disabled}><option value="">Seleccionar persona</option>{members.map((item) => <option key={item.uid} value={item.uid}>{item.displayName}</option>)}</select></label><button type="button" onClick={() => onAssign(uid)} disabled={disabled || !uid || uid === task.assignedToUid}>Guardar asignación</button></div>;
}

function SocialResponse({ task, centerId, disabled, onRefresh, onClosed }: { task: ClinicalTask; centerId: string; disabled: boolean; onRefresh: () => Promise<void>; onClosed: () => void }) {
  const [result, setResult] = useState(task.result || '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => setResult(task.result || ''), [task.version]);
  const save = async (status: 'accepted' | 'in_progress' | 'resolved') => {
    if (!task.version || (status !== 'accepted' && !result.trim())) { setMessage('Registra una respuesta y actualiza la gestión antes de continuar.'); return; }
    setBusy(true); setMessage('');
    try {
      await api.updateTask(centerId, task.id, { version: task.version, status, ...(status === 'accepted' ? {} : { result: result.trim() }) });
      await onRefresh();
      if (status === 'resolved') onClosed();
      else setMessage(status === 'accepted' ? 'Gestión aceptada.' : 'Respuesta guardada como borrador.');
    } catch (cause) {
      setMessage(messageFor(cause));
      if (cause instanceof ApiError && cause.status === 409) await onRefresh();
    } finally { setBusy(false); }
  };
  return <div className="social-response">
    {['created', 'notified'].includes(task.status)
      ? <button type="button" className="primary" disabled={disabled || busy} onClick={() => void save('accepted')}>Aceptar gestión</button>
      : <><label>Respuesta de trabajo social<textarea value={result} maxLength={1500} onChange={(event) => setResult(event.target.value)} /></label><div className="social-task-actions"><button type="button" disabled={disabled || busy || !result.trim()} onClick={() => void save('in_progress')}>Guardar respuesta</button><button type="button" className="primary" disabled={disabled || busy || !result.trim()} onClick={() => void save('resolved')}>Cerrar gestión con respuesta</button></div></>}
    {message && <p className="pre-message" role="status">{message}</p>}
  </div>;
}
