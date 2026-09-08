import { FormEvent, useMemo, useState } from 'react';
import { api } from '../services/api';
import { ROLE_LABELS, type ClinicalAttachment, type ClinicalTask, type Encounter, type Membership, type Patient, type WoundEpisode } from '../types';
import { copyText, formatDate, formatDateTime } from '../utils';

export default function SpecialistCaseSummary({ centerId, membership, patient, episode, encounters, tasks, attachments, onRefresh, demoMode = false }: { centerId: string; membership: Membership; patient: Patient; episode: WoundEpisode; encounters: Encounter[]; tasks: ClinicalTask[]; attachments: ClinicalAttachment[]; onRefresh: () => Promise<void>; demoMode?: boolean }) {
  const ordered = useMemo(() => [...encounters].sort((a, b) => a.encounterDate.localeCompare(b.encounterDate)), [encounters]);
  const latest = ordered.at(-1); const first = ordered[0];
  const assigned = tasks.filter((task) => membership.roles.includes(task.recipientRole)); const activeTask = assigned.find((task) => !['resolved', 'rejected'].includes(task.status)) || assigned[0];
  const photos = ordered.flatMap((encounter) => encounter.photos.map((photo) => ({ ...photo, encounterDate: encounter.encounterDate, encounterId: encounter.id }))).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  const requestedTests = [...new Set(ordered.flatMap((encounter) => encounter.medical.requestedTests || []))];
  const pcrDocuments = attachments.filter((item) => /\bPCR\b/i.test(item.title));
  const [result, setResult] = useState(activeTask?.result || ''); const [message, setMessage] = useState('');
  const area = (encounter?: Encounter) => encounter?.wound.lengthCm != null && encounter.wound.widthCm != null ? encounter.wound.lengthCm * encounter.wound.widthCm : undefined;
  const firstArea = area(first); const latestArea = area(latest); const change = firstArea && latestArea != null ? Math.round(((latestArea - firstArea) / firstArea) * 100) : undefined;
  const respond = async (event: FormEvent) => { event.preventDefault(); if (demoMode || !activeTask) return; try { await api.updateTask(centerId, activeTask.id, { status: 'resolved', result }); await onRefresh(); setMessage('Respuesta registrada y gestión resuelta.'); } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No fue posible registrar la respuesta.'); } };
  const copySummary = () => copyText(buildSummary(patient, episode, latest, activeTask, change));

  return <section className="specialist-case stack">
    <header className="specialist-hero"><div><p className="eyebrow">Caso derivado · {membership.roles.map((role) => ROLE_LABELS[role]).join(' · ')}</p><h2>{patient.name}</h2><p>{episode.location}, pie {episode.side === 'right' ? 'derecho' : 'izquierdo'} · episodio iniciado {formatDate(episode.createdAt)}</p></div><span className={`committee-priority ${activeTask?.priority || episode.priority}`}>{priorityLabel(activeTask?.priority || episode.priority)}</span></header>

    <article className="referral-reason"><div><span>Por qué se deriva</span><h3>{activeTask?.title || 'Derivación sin título'}</h3><p>{activeTask?.reason || 'No se registró un motivo específico.'}</p><small>{activeTask ? `Enviada por ${activeTask.createdByName} · ${formatDateTime(activeTask.createdAt)}` : 'Sin gestión asociada'}</small></div><button className="ghost" type="button" onClick={copySummary}>Copiar resumen</button></article>

    <div className="specialist-kpis"><Kpi label="Atenciones" value={String(ordered.length)} /><Kpi label="Dimensiones actuales" value={latest ? dimensions(latest) : 'Sin medición'} /><Kpi label="Cambio de área" value={change == null ? 'Sin cálculo' : `${change > 0 ? '+' : ''}${change}%`} alert={change != null && change > 0} /><Kpi label="WIfI actual" value={latest ? `W${latest.wifi.wound ?? '—'} I${latest.wifi.ischemia ?? '—'} fI${latest.wifi.footInfection ?? '—'}` : 'Sin registro'} /></div>

    <div className="specialist-summary-grid">
      <article className="panel"><h3>Resumen clínico actual</h3><p><strong>Infección:</strong> {latest?.medical.infectionAssessment || latest?.wound.infectionSigns.join(', ') || 'Sin registro'}</p><p><strong>Antimicrobianos:</strong> {latest?.medical.antibiotics || 'Sin registro'}</p><p><strong>Función renal:</strong> {patient.anamnesis.renalDisease || 'Sin registro'}</p><p><strong>Alergias:</strong> {patient.anamnesis.allergyStatus === 'none' ? 'Sin alergias conocidas' : patient.anamnesis.allergies.join(', ') || 'Pendiente'}</p><p><strong>Descarga:</strong> {latest?.medical.offloadingPlan || latest?.nursing.offloadingApplied.join(', ') || 'Sin registro'}</p></article>
      <article className="panel"><h3>Exámenes disponibles</h3>{requestedTests.length > 0 && <p><strong>Solicitados:</strong> {requestedTests.join(', ')}</p>}<p><strong>PCR:</strong> {pcrDocuments.length ? `${pcrDocuments.length} documento(s) disponible(s)` : requestedTests.some((item) => /PCR/i.test(item)) ? 'Solicitada, sin resultado cargado' : 'Sin registro'}</p><div className="specialist-documents">{[...attachments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((item) => <AttachmentItem key={item.id} item={item} />)}{attachments.length === 0 && <p className="muted">No hay documentos cargados.</p>}</div></article>
    </div>

    <article className="panel"><div className="card-heading"><div><p className="eyebrow">Evolución temporal</p><h3>Mediciones, WIfI y conducta por fecha</h3></div></div><div className="specialist-timeline">{ordered.map((encounter) => <div key={encounter.id}><time>{formatDate(encounter.encounterDate)}</time><span>{dimensions(encounter)}</span><span>WIfI W{encounter.wifi.wound ?? '—'} I{encounter.wifi.ischemia ?? '—'} fI{encounter.wifi.footInfection ?? '—'}</span><p>{encounter.medical.clinicalImpression || encounter.medical.treatmentPlan || encounter.nursingNarrative || 'Sin resumen confirmado.'}</p></div>)}{ordered.length === 0 && <p className="muted">No hay atenciones registradas.</p>}</div></article>

    <article className="panel"><div className="card-heading"><div><p className="eyebrow">Registro fotográfico</p><h3>Fotografías ordenadas por fecha</h3></div><span className="pill">{photos.length} imágenes</span></div><div className="dated-photo-grid">{photos.map((photo) => <figure key={photo.id}>{photo.url ? <img src={photo.url} alt={`${photo.kind === 'pre' ? 'Precuración' : 'Postcuración'} del ${formatDate(photo.encounterDate)}`} /> : <div className="photo-placeholder">Imagen no disponible</div>}<figcaption><strong>{photo.kind === 'pre' ? 'Precuración' : 'Postcuración'}</strong><span>{formatDate(photo.encounterDate)}</span><small>{photo.scaleIncluded ? 'Con referencia de escala' : 'Sin escala confirmada'}</small></figcaption></figure>)}{photos.length === 0 && <p className="muted">No hay fotografías registradas.</p>}</div></article>

    <form className="panel specialist-response" onSubmit={respond}><div className="card-heading"><div><p className="eyebrow">Respuesta del especialista</p><h3>Evaluación y recomendación</h3><p>Tu respuesta se agrega a la gestión; no modifica la evolución del equipo tratante.</p></div></div>{activeTask ? <fieldset disabled={demoMode}><textarea required value={result} onChange={(event) => setResult(event.target.value)} placeholder="Registra evaluación, conducta, exámenes adicionales y plazo de control." /><button className="primary">Guardar respuesta y resolver gestión</button></fieldset> : <p>No existe una gestión asignada a este perfil.</p>}{message && <p className="pre-message" role="status">{message}</p>}</form>
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
