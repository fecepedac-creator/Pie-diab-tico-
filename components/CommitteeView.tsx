import { ROLE_LABELS, type ClinicalAttachment, type ClinicalTask, type Encounter, type Patient, type WoundEpisode } from '../types';
import { formatDate, formatRut } from '../utils';

export default function CommitteeView({ patient, episode, encounters, tasks, attachments, onBack }: { patient: Patient; episode: WoundEpisode; encounters: Encounter[]; tasks: ClinicalTask[]; attachments: ClinicalAttachment[]; onBack: () => void }) {
  const ordered = [...encounters].sort((a, b) => a.encounterDate.localeCompare(b.encounterDate));
  const latest = ordered.at(-1);
  const first = ordered[0];
  const pending = tasks.filter((task) => !['resolved', 'rejected'].includes(task.status));
  const area = (encounter?: Encounter) => encounter?.wound.lengthCm != null && encounter.wound.widthCm != null ? encounter.wound.lengthCm * encounter.wound.widthCm : undefined;
  const firstArea = area(first); const latestArea = area(latest);
  const change = firstArea && latestArea != null ? Math.round(((latestArea - firstArea) / firstArea) * 100) : undefined;
  const relevantHistory = [...historyWithDetails(patient.anamnesis.medicalHistory, patient.anamnesis.medicalHistoryDetails), ...historyWithDetails(patient.anamnesis.surgicalHistory, patient.anamnesis.surgicalHistoryDetails)];

  return <section className="committee committee-deck">
    <div className="no-print committee-actions"><button className="back" onClick={onBack}>← Volver</button><button className="primary" onClick={() => window.print()}>Imprimir / guardar PDF</button></div>

    <header className="committee-cover committee-page"><div><p className="eyebrow">Reunión multidisciplinaria · Caso clínico</p><h1>{patient.name}</h1><p>RUT {formatRut(patient.rut)} · {episode.location}, pie {episode.side === 'right' ? 'derecho' : 'izquierdo'}</p></div><span className={`committee-priority ${episode.priority}`}>{episode.priority === 'urgent' ? 'Prioridad urgente' : episode.priority === 'soon' ? 'Prioridad próxima' : 'Prioridad habitual'}</span><small>Documento de apoyo. Toda decisión debe validarse y registrarse en la ficha clínica institucional.</small></header>

    <article className="committee-page committee-overview">
      <div className="committee-title"><p className="eyebrow">Resumen ejecutivo</p><h2>Situación actual</h2></div>
      <div className="committee-kpis"><Kpi label="Inicio episodio" value={formatDate(episode.createdAt)} /><Kpi label="Atenciones" value={String(ordered.length)} /><Kpi label="Variación de área" value={change == null ? 'Sin cálculo' : `${change > 0 ? '+' : ''}${change}%`} tone={change != null && change > 0 ? 'alert' : 'good'} /><Kpi label="Gestiones pendientes" value={String(pending.length)} tone={pending.some((task) => task.priority === 'urgent') ? 'alert' : undefined} /></div>
      <div className="committee-summary-grid">
        <section><h3>Antecedentes relevantes</h3><Tags values={relevantHistory} empty="Sin antecedentes consignados" /><p><strong>Alergias:</strong> {patient.anamnesis.allergyStatus === 'none' ? 'Sin alergias conocidas' : patient.anamnesis.allergies.join(', ') || 'Pendiente de precisar'}</p><p><strong>Medicamentos:</strong> {patient.anamnesis.medications.join(', ') || 'Sin registro'}</p><p><strong>Alcohol:</strong> {habitSummary(patient.anamnesis.alcoholUse, patient.anamnesis.alcoholDetails)}</p><p><strong>Otras sustancias:</strong> {habitSummary(patient.anamnesis.substanceUse, patient.anamnesis.substanceDetails)}</p></section>
        <section><h3>Contexto funcional y social</h3><p><strong>Red de apoyo:</strong> {patient.social.supportNetwork || 'Sin registro'}</p><p><strong>Movilidad:</strong> {patient.social.mobility || 'Sin registro'}</p><p><strong>Transporte:</strong> {patient.social.transportBarriers || 'Sin registro'}</p><p><strong>Vivienda:</strong> {patient.social.housingBarriers || 'Sin registro'}</p></section>
      </div>
      {latest && <section className="committee-current"><div><h3>Última caracterización</h3><strong>{dimensions(latest)}</strong><p>{latest.wound.granulationPercent ?? '—'}% granulación · {latest.wound.sloughPercent ?? '—'}% esfacelo · {latest.wound.necrosisPercent ?? '—'}% necrosis</p></div><div className="wifi-summary"><span>W<strong>{latest.wifi.wound ?? '—'}</strong></span><span>I<strong>{latest.wifi.ischemia ?? '—'}</strong></span><span>fI<strong>{latest.wifi.footInfection ?? '—'}</strong></span></div></section>}
    </article>

    <article className="committee-page">
      <div className="committee-title"><p className="eyebrow">Evolución longitudinal</p><h2>Comparación de atenciones</h2></div>
      <div className="committee-timeline">{ordered.map((encounter, index) => <section key={encounter.id} className="timeline-event"><span className="timeline-index">{index + 1}</span><div><header><strong>{formatDate(encounter.encounterDate)}</strong><span>{dimensions(encounter)}</span></header><div className="timeline-clinical"><span>WIfI W{encounter.wifi.wound ?? '—'} I{encounter.wifi.ischemia ?? '—'} fI{encounter.wifi.footInfection ?? '—'}</span><span>{encounter.wound.granulationPercent ?? '—'}% granulación</span><span>{encounter.wound.exudate ? `Exudado ${translateExudate(encounter.wound.exudate)}` : 'Exudado sin registro'}</span></div><p>{encounter.medicalNarrative || encounter.nursingNarrative || 'Sin narrativa registrada.'}</p></div></section>)}{ordered.length === 0 && <p>Sin atenciones registradas.</p>}</div>
    </article>

    {ordered.map((encounter, index) => <article className="committee-page committee-evolution" key={encounter.id}><div className="committee-title"><p className="eyebrow">Evolución {index + 1} · {formatDate(encounter.encounterDate)}</p><h2>{dimensions(encounter)} · WIfI W{encounter.wifi.wound ?? '—'} I{encounter.wifi.ischemia ?? '—'} fI{encounter.wifi.footInfection ?? '—'}</h2></div><div className="photo-compare"><Photo kind="Precuración" photo={encounter.photos.find((item) => item.kind === 'pre')} /><Photo kind="Postcuración" photo={encounter.photos.find((item) => item.kind === 'post')} /></div><div className="committee-notes"><section><h3>Enfermería</h3><p>{encounter.nursingNarrative || 'Sin evolución de enfermería.'}</p></section><section><h3>Evaluación médica</h3><p>{encounter.medicalNarrative || 'Sin evolución médica.'}</p></section></div></article>)}

    <article className="committee-page committee-decisions"><div className="committee-title"><p className="eyebrow">Coordinación</p><h2>Pendientes y antecedentes para decidir</h2></div><div className="committee-summary-grid"><section><h3>Gestiones activas</h3>{pending.length ? pending.map((task) => <div className={`committee-task ${task.priority}`} key={task.id}><strong>{task.title}</strong><span>{ROLE_LABELS[task.recipientRole]} · {task.status}</span><p>{task.reason}</p></div>) : <p>No hay gestiones pendientes.</p>}</section><section><h3>Exámenes y documentos</h3>{attachments.length ? attachments.map((item) => <p className="committee-document" key={item.id}><strong>{item.title}</strong><span>{attachmentLabel(item.kind)}</span>{item.url && <a href={item.url} target="_blank" rel="noreferrer">Abrir documento</a>}</p>) : <p>Sin documentos cargados.</p>}</section></div><div className="committee-decision-box"><h3>Acuerdos de la reunión</h3><div /><div /><div /><small>Completar durante la reunión y registrar posteriormente en la ficha clínica institucional.</small></div></article>
  </section>;
}

function dimensions(encounter: Encounter) { return `${encounter.wound.lengthCm ?? '—'} × ${encounter.wound.widthCm ?? '—'} × ${encounter.wound.depthCm ?? '—'} cm`; }
function translateExudate(value: NonNullable<Encounter['wound']['exudate']>) { return ({ none: 'ausente', low: 'escaso', moderate: 'moderado', high: 'abundante' } as const)[value]; }
function attachmentLabel(kind: ClinicalAttachment['kind']) { return ({ laboratory: 'Laboratorio', pvr: 'PVR', imaging: 'Imagen', other: 'Otro' } as const)[kind]; }
function historyWithDetails(values: string[], details?: Record<string, string[]>) { return values.flatMap((value) => details?.[value]?.filter(Boolean).length ? details[value].filter(Boolean).map((detail) => `${value}: ${detail}`) : [value]); }
function habitSummary(value?: string, detail?: string) { return [value, detail].filter(Boolean).join(' · ') || 'Sin registro'; }
function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'alert' | 'good' }) { return <div className={tone || ''}><span>{label}</span><strong>{value}</strong></div>; }
function Tags({ values, empty }: { values: string[]; empty: string }) { return values.length ? <div className="committee-tags">{values.map((value) => <span key={value}>{value}</span>)}</div> : <p>{empty}</p>; }
function Photo({ kind, photo }: { kind: string; photo?: Encounter['photos'][number] }) { return <div><h3>{kind}</h3>{photo?.url ? <img className="committee-photo" src={photo.url} alt={kind} /> : <div className="photo-placeholder">Sin fotografía</div>}</div>; }
