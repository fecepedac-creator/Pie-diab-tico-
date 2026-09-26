import { canUploadClinicalDocuments } from '../permissions';
import EncounterEvolution from './EncounterEvolution';
import { FormEvent, useMemo, useState } from 'react';
import { api } from '../services/api';
import { ROLE_LABELS, type ClinicalAttachment, type ClinicalTask, type Encounter, type Membership, type Patient, type WoundEpisode } from '../types';
import { copyText, formatDate, formatDateTime } from '../utils';

const PHYSIATRY_SECTIONS = [
  { button: 'Añadir descarga', heading: 'Optimización de descarga' },
  { button: 'Añadir prevención secundaria', heading: 'Prevención secundaria tras cierre' },
  { button: 'Añadir evaluación protésica', heading: 'Evaluación protésica' },
  { button: 'Añadir manejo del dolor', heading: 'Evaluación y manejo del dolor' },
] as const;
const containsAssessment = (value: string) => value.split(/\r?\n/).some((line) => {
  const text = line.trim();
  return text.length > 0 && !PHYSIATRY_SECTIONS.some(({ heading }) => text === `${heading}:`);
});
const episodeStatus = { active: 'Herida activa', healed: 'Herida cicatrizada', referred: 'Episodio derivado', closed: 'Episodio cerrado' } as const;

export default function SpecialistCaseSummary({ centerId, membership, patient, episode, encounters, tasks, attachments, onRefresh, onResolved, demoMode = false }: { centerId: string; membership: Membership; patient: Patient; episode: WoundEpisode; encounters: Encounter[]; tasks: ClinicalTask[]; attachments: ClinicalAttachment[]; onRefresh: () => Promise<void>; onResolved: () => void; demoMode?: boolean }) {
  const ordered = useMemo(() => [...encounters].sort((a, b) => a.encounterDate.localeCompare(b.encounterDate)), [encounters]);
  const confirmed = ordered.filter((e) => e.status !== 'cancelled' && e.wound.verification.status === 'confirmed'); const latest = confirmed.at(-1); const first = confirmed[0];
  const assigned = tasks.filter((task) => membership.roles.includes(task.recipientRole)); const activeTask = assigned.find((task) => !['resolved', 'rejected'].includes(task.status)) || assigned[0];
  const photos = ordered.flatMap((encounter) => encounter.photos.map((photo) => ({ ...photo, encounterDate: encounter.encounterDate, encounterId: encounter.id }))).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  const requestedTests = [...new Set(ordered.flatMap((encounter) => encounter.medical.requestedTests || []))];
  const pcrDocuments = attachments.filter((item) => /\bPCR\b/i.test(item.title));
  const [selectedTask, setSelectedTask] = useState('');
  const selected = assigned.find((task) => task.id === selectedTask);
  const responseTask = selected || activeTask;
  const [result, setResult] = useState(responseTask?.result || ''); const [message, setMessage] = useState('');
  const area = (encounter?: Encounter) => encounter?.wound.lengthCm != null && encounter.wound.widthCm != null ? encounter.wound.lengthCm * encounter.wound.widthCm : undefined;
  const firstArea = area(first); const latestArea = area(latest); const change = firstArea && latestArea != null ? Math.round(((latestArea - firstArea) / firstArea) * 100) : undefined;
  const respond = async (event: FormEvent) => { event.preventDefault(); if (demoMode || !responseTask) return; if (responseTask.recipientRole === 'physiatrist' && !containsAssessment(result)) { setMessage('Completa los hallazgos y la conducta antes de confirmar; los títulos por sí solos no son una evaluación.'); return; } try { await api.updateTask(centerId, responseTask.id, { version: responseTask.version || 1, status: 'resolved', result }); await onRefresh(); onResolved(); } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No fue posible registrar la respuesta.'); } };
  const accept = async () => { if (demoMode || !responseTask) return; try { await api.updateTask(centerId, responseTask.id, { version: responseTask.version || 1, status: 'accepted' }); await onRefresh(); setMessage('Gestión aceptada. Ahora puedes registrar tu evaluación.'); } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No fue posible aceptar la gestión.'); } };
  const saveDraft = async () => { if (demoMode || !responseTask) return; try { await api.updateTask(centerId, responseTask.id, { version: responseTask.version || 1, status: 'in_progress', result }); await onRefresh(); setMessage('Borrador guardado.'); } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No fue posible guardar.'); } };
  const copySummary = () => copyText(responseTask?.referralSnapshot?.text || buildSummary(patient, episode, latest, responseTask, change)).then(() => setMessage('Resumen copiado.')).catch(() => setMessage('No se pudo copiar el resumen.'));
  const addPhysiatrySection = (heading: string) => setResult((current) => current.split(/\r?\n/).some((line) => line.trim().startsWith(`${heading}:`)) ? current : `${current.trimEnd()}${current.trim() ? '\n\n' : ''}${heading}:\n`);
  const responseForm = <form className="panel specialist-response" onSubmit={respond}>
    <div className="card-heading"><div>
      <p className="eyebrow">Tu aporte al caso derivado</p>
      <h3>Evaluación de {responseTask ? ROLE_LABELS[responseTask.recipientRole] : 'especialidad'}</h3>
      <label>Gestión a responder<select value={responseTask?.id || ''} onChange={(event) => { setSelectedTask(event.target.value); setResult(assigned.find((task) => task.id === event.target.value)?.result || ''); }}>{assigned.map((task) => <option key={task.id} value={task.id}>{task.title} · {task.status}</option>)}</select></label>
      <p>Primero acepta la gestión. Luego registra tus hallazgos y conducta; puedes guardar un borrador o confirmar tu respuesta. Tu aporte queda separado de la evolución del equipo tratante. Al confirmar, el caso sale de tus derivados.</p>
    </div></div>
    {responseTask && ['created', 'notified'].includes(responseTask.status)
      ? <button type="button" className="primary" disabled={demoMode} onClick={() => void accept()}>Aceptar gestión y comenzar evaluación</button>
      : responseTask
        ? <fieldset disabled={demoMode || responseTask.status === 'resolved' || responseTask.status === 'rejected'}>
          {responseTask.recipientRole === 'physiatrist' && <div className="physiatry-shortcuts"><strong>Preparar apartados de la evaluación</strong><p>Selecciona sólo los ámbitos pertinentes a esta derivación; completa luego los hallazgos y el plan en el texto libre.</p><div>{PHYSIATRY_SECTIONS.map(({ button, heading }) => <button key={heading} type="button" className="ghost" disabled={result.split(/\r?\n/).some((line) => line.trim().startsWith(`${heading}:`))} onClick={() => addPhysiatrySection(heading)}>{button}</button>)}</div></div>}
          <label>Hallazgos, conducta, exámenes y control<textarea required value={result} onChange={(event) => setResult(event.target.value)} placeholder="Registra evaluación, conducta, exámenes adicionales y plazo de control." /></label><button type="button" onClick={() => void saveDraft()}>Guardar borrador</button><button className="primary">Confirmar respuesta y resolver gestión</button>
        </fieldset>
        : <p>No existe una gestión asignada a este perfil.</p>}
    {demoMode && <p className="muted">Esta demostración es de sólo lectura. Abre la prueba interactiva para responder con datos ficticios.</p>}
    {message && <p className="pre-message" role="status">{message}</p>}
  </form>;

  return <section className="specialist-case stack">
    <header className="specialist-hero"><div><p className="eyebrow">Caso derivado · {membership.roles.map((role) => ROLE_LABELS[role]).join(' · ')}</p><h2>{patient.name}</h2><p>{episode.location}, pie {episode.side === 'right' ? 'derecho' : 'izquierdo'} · {episodeStatus[episode.status]} · episodio iniciado {formatDate(episode.createdAt)}</p></div><span className={`committee-priority ${activeTask?.priority || episode.priority}`}>{priorityLabel(activeTask?.priority || episode.priority)}</span></header>

    <article className="referral-reason"><div><span>Por qué se deriva</span><h3>{activeTask?.title || 'Derivación sin título'}</h3><p>{activeTask?.reason || 'No se registró un motivo específico.'}</p><small>{activeTask ? `Enviada por ${activeTask.createdByName} · ${formatDateTime(activeTask.createdAt)}` : 'Sin gestión asociada'}</small></div><button className="ghost" type="button" onClick={copySummary}>Copiar resumen</button></article>
    {responseForm}

    {responseTask?.referralSnapshot && <details className="panel"><summary>Antecedentes conservados al derivar · versión {responseTask.referralSnapshot.version}</summary><pre className="referral-snapshot">{responseTask.referralSnapshot.text}</pre></details>}
    <div className="specialist-kpis"><Kpi label="Atenciones" value={String(ordered.length)} /><Kpi label="Dimensiones actuales" value={latest ? dimensions(latest) : 'Sin medición'} /><Kpi label="Cambio de área" value={change == null ? 'Sin cálculo' : `${change > 0 ? '+' : ''}${change}%`} alert={change != null && change > 0} /><Kpi label="WIfI actual" value={latest ? `W${latest.wifi.wound ?? '—'} I${latest.wifi.ischemia ?? '—'} fI${latest.wifi.footInfection ?? '—'}` : 'Sin registro'} /></div>

    <div className="specialist-summary-grid">
      <article className="panel"><h3>Resumen clínico actual</h3><p><strong>Infección:</strong> {latest?.medical.infectionAssessment || latest?.wound.infectionSigns.join(', ') || 'Sin registro'}</p><p><strong>Antimicrobianos:</strong> {latest?.medical.antibiotics || 'Sin registro'}</p><p><strong>Función renal:</strong> {patient.anamnesis.renalDisease || 'Sin registro'}</p><p><strong>Alergias:</strong> {patient.anamnesis.allergyStatus === 'none' ? 'Sin alergias conocidas' : patient.anamnesis.allergies.join(', ') || 'Pendiente'}</p><p><strong>Descarga:</strong> {latest?.medical.offloadingPlan || latest?.nursing.offloadingApplied.join(', ') || 'Sin registro'}</p></article>
      <article className="panel"><h3>Exámenes disponibles</h3>{canUploadClinicalDocuments(membership) && <label>Agregar examen o documento<input disabled={demoMode} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (!file || demoMode) return; if (file.size > 10 * 1024 * 1024) { setMessage('El documento supera 10 MB.'); return; } const reader = new FileReader(); reader.onerror = () => setMessage('No se pudo leer el documento.'); reader.onload = () => void api.uploadAttachment(centerId, episode.id, { dataUrl: String(reader.result), kind: 'other', title: file.name }).then(onRefresh).then(() => setMessage('Documento guardado.')).catch((e) => setMessage(e.message)); reader.readAsDataURL(file); }} /></label>}{requestedTests.length > 0 && <p><strong>Solicitados:</strong> {requestedTests.join(', ')}</p>}<p><strong>PCR:</strong> {pcrDocuments.length ? `${pcrDocuments.length} documento(s) disponible(s)` : requestedTests.some((item) => /PCR/i.test(item)) ? 'Solicitada, sin resultado cargado' : 'Sin registro'}</p><div className="specialist-documents">{[...attachments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((item) => <AttachmentItem key={item.id} item={item} />)}{attachments.length === 0 && <p className="muted">No hay documentos cargados.</p>}</div></article>
    </div>

    <EncounterEvolution encounters={encounters} tasks={tasks} />

    <article className="panel"><div className="card-heading"><div><p className="eyebrow">Registro fotográfico</p><h3>Fotografías ordenadas por fecha</h3></div><span className="pill">{photos.length} imágenes</span></div><div className="dated-photo-grid">{photos.map((photo) => <figure key={photo.id}>{photo.url ? <img src={photo.url} alt={`${photo.kind === 'pre' ? 'Precuración' : 'Postcuración'} del ${formatDate(photo.encounterDate)}`} /> : <div className="photo-placeholder">Imagen no disponible</div>}<figcaption><strong>{photo.kind === 'pre' ? 'Precuración' : 'Postcuración'}</strong><span>{formatDate(photo.encounterDate)}</span><small>{photo.scaleIncluded ? 'Con referencia de escala' : 'Sin escala confirmada'}</small></figcaption></figure>)}{photos.length === 0 && <p className="muted">No hay fotografías registradas.</p>}</div></article>

  </section>;
}

function dimensions(encounter: Encounter) { return `${encounter.wound.lengthCm ?? '—'} × ${encounter.wound.widthCm ?? '—'} × ${encounter.wound.depthCm ?? '—'} cm`; }
function priorityLabel(priority: 'routine' | 'soon' | 'urgent') { return priority === 'urgent' ? 'Urgente' : priority === 'soon' ? 'Próxima' : 'Habitual'; }
function attachmentLabel(kind: ClinicalAttachment['kind']) { return ({ laboratory: 'Laboratorio', pvr: 'PVR', imaging: 'Imagen', other: 'Documento' } as const)[kind]; }
function AttachmentItem({ item }: { item: ClinicalAttachment }) {
  const content = <><span>{attachmentLabel(item.kind)}</span><strong>{item.title}</strong><small>{formatDate(item.createdAt)}</small></>;
  return item.url ? <a href={item.url} target="_blank" rel="noreferrer">{content}</a> : <div className="specialist-document">{content}</div>;
}
function Kpi({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) { return <div className={alert ? 'alert' : ''}><span>{label}</span><strong>{value}</strong></div>; }
function buildSummary(patient: Patient, episode: WoundEpisode, latest: Encounter | undefined, task: ClinicalTask | undefined, change: number | undefined) { return [`Paciente: ${patient.name}.`, `Derivación: ${task?.reason || 'sin motivo consignado'}.`, `Lesión: ${episode.location}, pie ${episode.side === 'right' ? 'derecho' : 'izquierdo'}.`, latest ? `Última medición: ${dimensions(latest)}; WIfI W${latest.wifi.wound ?? '-'} I${latest.wifi.ischemia ?? '-'} fI${latest.wifi.footInfection ?? '-'}.` : 'Sin atención registrada.', change == null ? '' : `Variación de área: ${change}%.`].filter(Boolean).join(' '); }
