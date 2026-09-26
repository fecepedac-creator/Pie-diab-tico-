import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import EncounterPhotoCapture from './EncounterPhotoCapture';
import { api } from '../services/api';
import { ROLE_LABELS, type Center, type ClinicalTask, type Encounter, type Membership, type Patient, type WoundEpisode } from '../types';
import { copyText, formatDateTime, toggleValue } from '../utils';

type Props = { center: Center; membership: Membership; patient: Patient; episode: WoundEpisode; encounter: Encounter; tasks: ClinicalTask[]; onBack: () => void; onChanged: (value: Encounter) => void; onRefresh: () => Promise<void>; demoMode?: boolean };
type Tab = 'wound' | 'nursing' | 'medical' | 'photos' | 'tasks' | 'text';
type WifiSection = 'wound' | 'ischemia' | 'footInfection';

const WOUND_EDGES = ['Regulares', 'Macerados', 'Hiperqueratósicos', 'Socavados', 'Necróticos'];
const PERIWOUND = ['Íntegra', 'Macerada', 'Eritematosa', 'Edematosa', 'Hiperqueratósica'];
const EXPOSED = ['Tendón', 'Cápsula o articulación', 'Hueso'];
const INFECTION_SIGNS = ['Eritema', 'Calor local', 'Edema o induración', 'Dolor', 'Secreción purulenta', 'Linfangitis'];
const CLEANING = ['Suero fisiológico', 'PHMB', 'Solución limpiadora'];
const DEBRIDEMENT = ['No realizado', 'Cortante conservador', 'Autolítico', 'Enzimático', 'Mecánico', 'Quirúrgico'];
const PRIMARY_DRESSINGS = ['Capa de contacto', 'Hidrogel', 'Alginato', 'Fibra gelificante', 'Apósito antimicrobiano', 'Espuma'];
const SECONDARY_DRESSINGS = ['Gasa', 'Espuma', 'Superabsorbente', 'Vendaje de fijación'];
const PERIWOUND_PROTECTION = ['Película barrera', 'Óxido de zinc', 'Emoliente', 'Apósito protector'];
const ADVANCED_THERAPIES = ['Presión negativa', 'Terapia compresiva', 'Otra terapia avanzada'];
const OFFLOADING = ['Fieltro', 'Calzado posoperatorio', 'Bota removible', 'Yeso de contacto total', 'Reposo indicado'];
const EDUCATION = ['Cuidado del apósito', 'Signos de alarma', 'Descarga', 'Control metabólico', 'Cuidados del pie'];
const TESTS = ['Hemograma', 'PCR/VHS', 'Creatinina/VFG', 'HbA1c', 'Radiografía de pie', 'Resonancia', 'Cultivo', 'PVR', 'Eco-Doppler'];
const MEDICAL_ACTIONS = ['Continuar curación avanzada', 'Optimizar descarga', 'Control precoz', 'Evaluación vascular', 'Evaluación quirúrgica', 'Evaluación por fisiatría'];
const WARNING_SIGNS = ['Fiebre', 'Eritema progresivo', 'Dolor en aumento', 'Secreción aumentada', 'Mal olor', 'Cambio de coloración'];

const WIFI_HELP: Record<WifiSection, { label: string; scores: { score: 0 | 1 | 2 | 3; title: string; detail: string }[] }> = {
  wound: { label: 'W · Herida', scores: [
    { score: 0, title: 'Sin herida', detail: 'Sin úlcera y sin gangrena. Puede existir dolor isquémico en reposo.' },
    { score: 1, title: 'Pérdida menor', detail: 'Úlcera pequeña y superficial, sin exposición ósea salvo falange distal; sin gangrena.' },
    { score: 2, title: 'Pérdida mayor', detail: 'Úlcera profunda con hueso, articulación o tendón expuesto; úlcera superficial de talón o gangrena limitada a los dedos.' },
    { score: 3, title: 'Pérdida extensa', detail: 'Úlcera profunda extensa de antepié o mediopié, talón de espesor completo o gangrena extensa.' },
  ] },
  ischemia: { label: 'I · Isquemia', scores: [
    { score: 0, title: 'Sin isquemia relevante', detail: 'ITB ≥0,80; presión de tobillo >100 mmHg; presión de ortejo o TcPO₂ ≥60 mmHg.' },
    { score: 1, title: 'Isquemia leve', detail: 'ITB 0,60–0,79; presión de tobillo 70–100; presión de ortejo o TcPO₂ 40–59 mmHg.' },
    { score: 2, title: 'Isquemia moderada', detail: 'ITB 0,40–0,59; presión de tobillo 50–70; presión de ortejo o TcPO₂ 30–39 mmHg.' },
    { score: 3, title: 'Isquemia grave', detail: 'ITB ≤0,39; presión de tobillo <50; presión de ortejo o TcPO₂ <30 mmHg.' },
  ] },
  footInfection: { label: 'fI · Infección', scores: [
    { score: 0, title: 'Sin infección', detail: 'No hay síntomas ni signos clínicos de infección.' },
    { score: 1, title: 'Infección leve', detail: 'Infección local limitada a piel y tejido subcutáneo, con eritema >0,5 y ≤2 cm, sin manifestaciones sistémicas.' },
    { score: 2, title: 'Infección moderada', detail: 'Eritema >2 cm o compromiso de estructuras profundas, sin respuesta inflamatoria sistémica.' },
    { score: 3, title: 'Infección grave', detail: 'Infección local acompañada por dos o más criterios de respuesta inflamatoria sistémica.' },
  ] },
};

export default function EncounterWorkspace({ center, membership, patient, episode, encounter, tasks, onBack, onChanged, onRefresh, demoMode = false }: Props) {
  const isNurse = membership.roles.includes('nurse'); const isDoctor = membership.roles.includes('doctor'); const isTensOnly = membership.roles.includes('tens') && !isNurse && !isDoctor;
  const [tab, setTab] = useState<Tab>(isTensOnly ? 'photos' : 'wound');
  const [draft, setDraft] = useState(encounter);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [addendum, setAddendum] = useState('');
  const [referralDestination, setReferralDestination] = useState('general_surgeon');
  useEffect(() => { if (encounter.version !== draft.version) setConflict(true); }, [encounter.version, draft.version]);

  const canWound = isNurse || isDoctor;
  const canNursing = isNurse;
  const canMedical = isDoctor;
  const canPhoto = isTensOnly || isNurse || isDoctor;
  const canManageTasks = isNurse || isDoctor;
  const availableTabs = useMemo<[Tab, string][]>(() => isTensOnly ? [['photos', 'Fotos']] : ([['wound', 'Herida'], ...(isNurse || isDoctor ? [['nursing', 'Curación'] as [Tab, string], ['medical', 'Médico / WIfI'] as [Tab, string]] : []), ['photos', 'Fotos'], ['tasks', 'Gestiones'], ['text', 'Texto para ficha']]), [isDoctor, isNurse, isTensOnly]);

  const save = async (section: 'wound' | 'nursing' | 'medical' | 'wifi', confirmed = false) => {
    if (demoMode) return;
    setBusy(true); setMessage('');
    try {
      const payload = { ...draft[section], verification: { ...draft[section].verification, status: confirmed ? 'confirmed' as const : 'draft' as const } };
      const result = await api.updateEncounter(center.id, draft.id, { version: draft.version, [section]: payload });
      applyResult(result.encounter, section);
      setMessage(confirmed ? 'Sección confirmada y reflejada para todo el equipo.' : 'Borrador guardado para todo el equipo.');
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No fue posible guardar.'); if (cause && typeof cause === 'object' && 'status' in cause && cause.status === 409) await onRefresh(); }
    finally { setBusy(false); }
  };
  const updateStatus = async (status: Encounter['status']) => {
    if (demoMode) return;
    try { const result = await api.updateEncounter(center.id, draft.id, { version: draft.version, status }); setDraft(result.encounter); onChanged(result.encounter); } catch (e) { setMessage(e instanceof Error ? e.message : 'No fue posible cambiar el estado.'); }
  };
  const createTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (demoMode) return;
    const form = event.currentTarget; const data = new FormData(form);
    try {
      await api.createTask(center.id, { patientId: patient.id, episodeId: episode.id, encounterId: draft.id, type: String(data.get('type')) as ClinicalTask['type'], recipientRole: String(data.get('recipientRole')) as ClinicalTask['recipientRole'], title: String(data.get('title')), reason: String(data.get('reason')), priority: String(data.get('priority')) as ClinicalTask['priority'], dueAt: String(data.get('dueAt')) });
      form.reset(); await onRefresh(); setMessage('Gestión enviada al panel del perfil destinatario.');
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No fue posible crear la gestión.'); }
  };
  const openWhatsApp = async (taskId: string) => {
    if (demoMode) return;
    try { const result = await api.prepareWhatsApp(center.id, taskId); window.open(result.url, '_blank', 'noopener,noreferrer'); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No fue posible preparar el aviso.'); }
  };

  const photos = useMemo(() => ({ pre: draft.photos.filter((item) => item.kind === 'pre'), post: draft.photos.filter((item) => item.kind === 'post') }), [draft.photos]);
  const recipientOptions = [['general_surgeon', 'Cirugía general'], ['vascular_nurse', 'Enfermería vascular'], ['vascular_surgeon', 'Cirugía vascular'], ['traumatologist', 'Traumatología'], ['physiatrist', 'Fisiatría'], ['social_worker', 'Trabajo social']] as const;
  const closed = ['completed', 'cancelled'].includes(draft.status);
  const locked = busy || demoMode || closed || conflict;
  const sections = [['wound', 'Herida · Medicina / Enfermería'], ['nursing', 'Curación · Enfermería'], ['medical', 'Plan · Medicina'], ['wifi', 'WIfI · Medicina']] as const;
  const applyResult = (value: Encounter, savedSection?: string) => { const merged = { ...value }; for (const key of ['wound', 'nursing', 'medical', 'wifi'] as const) { if (key !== savedSection && JSON.stringify(draft[key]) !== JSON.stringify(encounter[key])) Object.assign(merged, { [key]: { ...draft[key], verification: value[key].verification } }); } setDraft(merged); onChanged(value); };
  const hasUnsaved = (['wound', 'nursing', 'medical', 'wifi'] as const).some((key) => JSON.stringify(draft[key]) !== JSON.stringify(encounter[key]));
  const changeType = async (careType: Encounter['careType']) => { try { const result = await api.updateEncounter(center.id, draft.id, { version: draft.version, careType }); applyResult(result.encounter); } catch (e) { setMessage(e instanceof Error ? e.message : 'No fue posible guardar.'); } };
  const reviewPhoto = async (id: string, quality: 'accepted' | 'repeat') => { const reason = quality === 'repeat' ? window.prompt('Motivo para repetir la fotografía') : ''; if (reason === null || (quality === 'repeat' && !reason.trim())) return; try { const result = await api.reviewPhoto(center.id, draft.id, id, { version: draft.version, quality, reason }); applyResult(result.encounter); } catch (e) { setMessage(e instanceof Error ? e.message : 'No fue posible revisar.'); } };
  const saveAddendum = async () => { try { const result = await api.addAddendum(center.id, draft.id, addendum); applyResult(result.encounter); setAddendum(''); } catch (e) { setMessage(e instanceof Error ? e.message : 'No fue posible guardar.'); } };

  return <section className="encounter-workspace">
    <button className="back" onClick={() => { if (!hasUnsaved || window.confirm('Hay cambios sin guardar. ¿Salir de esta atención?')) onBack(); }}>← Volver al episodio</button>
    <div className="encounter-header"><div><p className="eyebrow">{isTensOnly ? 'Registro fotográfico' : 'Atención compartida'} · {formatDateTime(draft.encounterDate)}</p><h1>{patient.name}</h1><p>{episode.location}, pie {episode.side === 'right' ? 'derecho' : 'izquierdo'} · edición v{draft.version}</p></div>{(isNurse || isDoctor) && <div className="status-actions"><select disabled={locked || hasUnsaved} value={draft.status} onChange={(event) => void updateStatus(event.target.value as Encounter['status'])}><option value="in_progress">En curso</option><option value="ready_for_review">Lista para revisar</option><option value="completed">Completada</option><option value="cancelled">Cancelada</option></select></div>}</div>
    <button className="ghost" onClick={() => void onRefresh().catch(() => setMessage('No se pudo actualizar. Tu borrador sigue disponible.'))}>Actualizar aportes del equipo</button>
    {conflict && <div className="notice" role="alert"><p>Hay una versión más reciente. Tu borrador permanece en pantalla. Revisa la actualización antes de continuar.</p><button onClick={() => { setDraft(encounter); setConflict(false); }}>Cargar versión del equipo</button>{sections.filter(([key]) => key === 'wound' ? canWound : key === 'nursing' ? canNursing : canMedical).map(([key, label]) => <button key={key} onClick={() => { setDraft({ ...encounter, [key]: draft[key] }); setConflict(false); setMessage(`Borrador recuperado de ${label}. Revisa las diferencias antes de guardar.`); }}>Recuperar mi borrador: {label}</button>)}</div>}
    {hasUnsaved && <p className="notice">Tienes cambios sin guardar. Guarda cada sección antes de finalizar o crear una derivación.</p>}
    {!isTensOnly && <section className="encounter-overview"><label>Tipo de atención<select disabled={locked || hasUnsaved} value={draft.careType || 'joint'} onChange={(e) => void changeType(e.target.value as Encounter['careType'])}><option value="joint">Atención conjunta</option><option value="nursing">Curación de enfermería</option><option value="medical">Evaluación médica</option></select></label><div className="section-checklist">{sections.map(([key, label]) => <article key={key}><strong>{label}</strong><span>{draft[key].verification.status === 'confirmed' ? 'Confirmado' : 'Pendiente de confirmación'}</span><small>{draft[key].verification.confirmedByName || draft[key].verification.enteredByName || 'Sin autor registrado'} · {draft[key].verification.updatedAt ? formatDateTime(draft[key].verification.updatedAt!) : 'Sin registro'}</small></article>)}</div><p className="helper">Confirmar valida el aporte dentro de esta plataforma. Revisa el texto antes de llevarlo a la ficha institucional.</p></section>}
    {closed && !isTensOnly && <section className="panel"><h2>Atención cerrada</h2>{draft.addenda?.map((a) => <p key={a.id}><strong>{a.authorName} · {formatDateTime(a.createdAt)}</strong><br />{a.text}</p>)}<label>Adenda: motivo y corrección<textarea value={addendum} onChange={(e) => setAddendum(e.target.value)} /></label><button disabled={demoMode || !addendum.trim()} onClick={() => void saveAddendum()}>Agregar adenda</button></section>}
    <nav className="subtabs">{availableTabs.map(([id, label]) => <button className={tab === id ? 'active' : ''} key={id} onClick={() => setTab(id)}>{label}</button>)}</nav>
    {message && <div className="notice">{message}<button onClick={() => setMessage('')}>×</button></div>}

    {tab === 'wound' && <WoundPanel draft={draft} setDraft={setDraft} canEdit={canWound} locked={locked} save={save} />}
    {tab === 'nursing' && <NursingPanel draft={draft} setDraft={setDraft} canEdit={canNursing} locked={locked} save={save} />}
    {tab === 'medical' && <MedicalPanel draft={draft} setDraft={setDraft} canEdit={canMedical} locked={locked} save={save} />}

    {tab === 'medical' && canManageTasks && <div className="panel"><h3>Derivaciones indicadas en el plan</h3><p>Preparar completa el formulario; revisa el motivo y la prioridad antes de emitir.</p>{([['Evaluación vascular', 'vascular_surgeon'], ['Evaluación quirúrgica', 'general_surgeon'], ['Evaluación por fisiatría', 'physiatrist']] as const).filter(([action]) => draft.medical.treatmentPlan?.includes(action)).map(([action, recipient]) => <button key={recipient} disabled={locked || hasUnsaved || tasks.some((task) => task.recipientRole === recipient && !['resolved', 'rejected'].includes(task.status))} onClick={() => { setReferralDestination(recipient); setTab('tasks'); }}>Preparar {action.toLowerCase()}</button>)}<button className="ghost" onClick={() => setTab('tasks')}>Otras derivaciones</button></div>}
    {tab === 'photos' && <section className="panel"><div className="card-heading"><div><p className="eyebrow">Registro fotográfico privado</p><h2>Antes y después de la curación</h2><p>Consentimiento: {episode.consentForPhotography ? 'registrado' : 'pendiente'}. Las imágenes no viajan por WhatsApp.</p></div></div>{canPhoto && episode.consentForPhotography && <EncounterPhotoCapture centerId={center.id} encounter={draft} onChanged={applyResult} disabled={locked || hasUnsaved} />}<div className="photo-compare"><PhotoColumn title="Precuración" photos={photos.pre} /><PhotoColumn title="Postcuración" photos={photos.post} /></div>{(isNurse || isDoctor) && draft.photos.map((photo) => <div className="photo-review" key={photo.id}><span>{photo.kind === 'pre' ? 'Precuración' : 'Postcuración'} · {formatDateTime(photo.capturedAt)} · {photo.quality === 'accepted' ? 'Aceptada' : photo.quality === 'repeat' ? 'Repetir' : 'Revisión pendiente'} {photo.reviewReason || ''}</span><button disabled={locked} onClick={() => void reviewPhoto(photo.id, 'accepted')}>Aceptar calidad</button><button disabled={locked} onClick={() => void reviewPhoto(photo.id, 'repeat')}>Solicitar repetición</button></div>)}</section>}

    {tab === 'tasks' && <section className="two-columns">{canManageTasks ? <form key={referralDestination} className="panel form-grid" onSubmit={createTask}><h2>Enviar gestión</h2><fieldset disabled={locked || hasUnsaved} className="form-grid full"><label>Destino<select name="recipientRole" defaultValue={referralDestination}>{recipientOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Tipo<select name="type" defaultValue={referralDestination === 'vascular_surgeon' ? 'vascular' : referralDestination === 'physiatrist' ? 'physiatry' : 'general_surgery'}><option value="vascular">Vascular</option><option value="general_surgery">Cirugía general</option><option value="traumatology">Traumatología</option><option value="physiatry">Fisiatría</option><option value="social">Social</option><option value="exam">Examen</option><option value="other">Otra</option></select></label><label>Prioridad<select name="priority"><option value="routine">Habitual</option><option value="soon">Pronto</option><option value="urgent">Urgente</option></select></label><label>Plazo<input type="datetime-local" name="dueAt" /></label><label className="full">Título<input name="title" required defaultValue={`Evaluación por ${ROLE_LABELS[referralDestination as keyof typeof ROLE_LABELS]}`} /></label><label className="full">Motivo<textarea name="reason" required defaultValue={draft.medical.clinicalImpression || ''} /></label><details className="full"><summary>Revisar antecedentes de la derivación</summary><p>Se conservará una copia de esta atención con sus fechas y estados de confirmación.</p><p>{draft.nursingNarrative}</p><p>{draft.medicalNarrative}</p></details><label className="check-line full"><input required type="checkbox" /> Revisé motivo, destinatario y antecedentes</label><button className="primary full">Crear derivación revisada</button></fieldset></form> : <div className="panel"><h2>Envío de gestiones</h2><p className="helper">Tu perfil puede revisar las gestiones recibidas, pero no crear nuevas.</p></div>}<div className="panel"><h2>Seguimiento</h2><div className="stack">{tasks.map((task) => <article className="task-card" key={task.id}><div><strong>{task.title}</strong><small>{ROLE_LABELS[task.recipientRole]} · {task.reason}</small>{canManageTasks && <button className="ghost task-action" disabled={locked} onClick={() => void openWhatsApp(task.id)}>Avisar por WhatsApp</button>}</div><span className={`pill ${task.priority}`}>{task.status}</span></article>)}{tasks.length === 0 && <p className="muted">No hay gestiones para este episodio.</p>}</div></div></section>}

    {tab === 'text' && <section className="text-grid"><Narrative key={`n-${draft.version}`} canCopy={isNurse && !demoMode} initialText={draft.narrativeReviews?.nursing?.sourceText === draft.nursingNarrative ? draft.narrativeReviews?.nursing?.text : undefined} persist={(text) => api.reviewNarrative(center.id, draft.id, 'nursing', text, draft.nursingNarrative || '').then(() => undefined)} title="Evolución de enfermería" text={draft.nursingNarrative || ''} confirmed={draft.wound.verification.status === 'confirmed' && draft.nursing.verification.status === 'confirmed'} /><Narrative key={`m-${draft.version}`} canCopy={isDoctor && !demoMode} initialText={draft.narrativeReviews?.medical?.sourceText === draft.medicalNarrative ? draft.narrativeReviews?.medical?.text : undefined} persist={(text) => api.reviewNarrative(center.id, draft.id, 'medical', text, draft.medicalNarrative || '').then(() => undefined)} title="Evolución médica" text={draft.medicalNarrative || ''} confirmed={draft.wound.verification.status === 'confirmed' && draft.medical.verification.status === 'confirmed' && draft.wifi.verification.status === 'confirmed'} /></section>}
  </section>;
}

type PanelProps = { draft: Encounter; setDraft: (value: Encounter) => void; canEdit: boolean; locked: boolean; save: (section: 'wound' | 'nursing' | 'medical' | 'wifi', confirmed?: boolean) => Promise<void> };

function WoundPanel({ draft, setDraft, canEdit, locked, save }: PanelProps) {
  return <section className="panel clinical-entry-panel"><div className="card-heading"><div><p className="eyebrow">Dato clínico común</p><h2>Caracterización de la herida</h2><p>Medicina y enfermería comparten la misma caracterización guardada. Actualiza para ver los aportes recientes del equipo.</p></div><span className={`pill ${draft.wound.verification.status}`}>{draft.wound.verification.status === 'confirmed' ? 'Confirmada' : 'Borrador'}</span></div><fieldset disabled={!canEdit || locked}>
    <div className="measurement-grid"><label>Largo (cm)<input type="number" step="0.1" min="0" value={draft.wound.lengthCm ?? ''} onChange={(event) => setDraft({ ...draft, wound: { ...draft.wound, lengthCm: event.target.value ? Number(event.target.value) : undefined } })} /></label><label>Ancho (cm)<input type="number" step="0.1" min="0" value={draft.wound.widthCm ?? ''} onChange={(event) => setDraft({ ...draft, wound: { ...draft.wound, widthCm: event.target.value ? Number(event.target.value) : undefined } })} /></label><label>Profundidad (cm)<input type="number" step="0.1" min="0" value={draft.wound.depthCm ?? ''} onChange={(event) => setDraft({ ...draft, wound: { ...draft.wound, depthCm: event.target.value ? Number(event.target.value) : undefined } })} /></label></div>
    <div className="tissue-grid"><label>Granulación<input type="number" min="0" max="100" value={draft.wound.granulationPercent ?? ''} onChange={(event) => setDraft({ ...draft, wound: { ...draft.wound, granulationPercent: event.target.value ? Number(event.target.value) : undefined } })} /><span>%</span></label><label>Esfacelo<input type="number" min="0" max="100" value={draft.wound.sloughPercent ?? ''} onChange={(event) => setDraft({ ...draft, wound: { ...draft.wound, sloughPercent: event.target.value ? Number(event.target.value) : undefined } })} /><span>%</span></label><label>Necrosis<input type="number" min="0" max="100" value={draft.wound.necrosisPercent ?? ''} onChange={(event) => setDraft({ ...draft, wound: { ...draft.wound, necrosisPercent: event.target.value ? Number(event.target.value) : undefined } })} /><span>%</span></label></div>
    <ChoiceField title="Exudado" options={[['none', 'Ausente'], ['low', 'Escaso'], ['moderate', 'Moderado'], ['high', 'Abundante']]} value={draft.wound.exudate || ''} onChange={(value) => setDraft({ ...draft, wound: { ...draft.wound, exudate: value as Encounter['wound']['exudate'] } })} />
    <ChoiceField title="Olor" options={[['none', 'Ausente'], ['present', 'Presente']]} value={draft.wound.odor || ''} onChange={(value) => setDraft({ ...draft, wound: { ...draft.wound, odor: value as Encounter['wound']['odor'] } })} />
    <ChipField title="Bordes" options={WOUND_EDGES} values={draft.wound.edges} onChange={(values) => setDraft({ ...draft, wound: { ...draft.wound, edges: values } })} />
    <ChipField title="Piel perilesional" options={PERIWOUND} values={draft.wound.periwound} onChange={(values) => setDraft({ ...draft, wound: { ...draft.wound, periwound: values } })} />
    <ChipField title="Estructuras expuestas" options={EXPOSED} values={draft.wound.exposedStructures} onChange={(values) => setDraft({ ...draft, wound: { ...draft.wound, exposedStructures: values } })} />
    <ChipField title="Signos locales de infección" options={INFECTION_SIGNS} values={draft.wound.infectionSigns} onChange={(values) => setDraft({ ...draft, wound: { ...draft.wound, infectionSigns: values } })} alert />
    <ScoreButtons title="Dolor EVA" value={draft.wound.painScore} onChange={(painScore) => setDraft({ ...draft, wound: { ...draft.wound, painScore } })} />
    <label className="clinical-notes">Detalle excepcional<textarea value={draft.wound.notes || ''} onChange={(event) => setDraft({ ...draft, wound: { ...draft.wound, notes: event.target.value } })} placeholder="Escribe sólo hallazgos que no estén representados por los botones." /></label>
  </fieldset>{canEdit ? <div className="save-row"><button className="ghost" disabled={locked} onClick={() => void save('wound')}>Guardar borrador</button><button className="primary" disabled={locked} onClick={() => void save('wound', true)}>Confirmar caracterización</button></div> : <p className="helper">Vista de solo lectura para tu perfil.</p>}</section>;
}

function NursingPanel({ draft, setDraft, canEdit, locked, save }: PanelProps) {
  return <section className="panel clinical-entry-panel"><div className="card-heading"><div><p className="eyebrow">Enfermería</p><h2>Curación avanzada</h2><p>Registra la técnica mediante opciones rápidas y utiliza texto sólo para excepciones.</p></div><span className={`pill ${draft.nursing.verification.status}`}>{draft.nursing.verification.status === 'confirmed' ? 'Confirmada' : 'Borrador'}</span></div><fieldset disabled={!canEdit || locked}>
    <ChipField title="Limpieza" options={CLEANING} values={draft.nursing.cleaning} onChange={(values) => setDraft({ ...draft, nursing: { ...draft.nursing, cleaning: values } })} />
    <ChipField title="Desbridamiento" options={DEBRIDEMENT} values={draft.nursing.debridement} onChange={(values) => setDraft({ ...draft, nursing: { ...draft.nursing, debridement: values } })} />
    <ChipField title="Apósito primario" options={PRIMARY_DRESSINGS} values={draft.nursing.primaryDressings} onChange={(values) => setDraft({ ...draft, nursing: { ...draft.nursing, primaryDressings: values } })} />
    <ChipField title="Apósito secundario" options={SECONDARY_DRESSINGS} values={draft.nursing.secondaryDressings} onChange={(values) => setDraft({ ...draft, nursing: { ...draft.nursing, secondaryDressings: values } })} />
    <ChipField title="Protección perilesional" options={PERIWOUND_PROTECTION} values={draft.nursing.periwoundProtection} onChange={(values) => setDraft({ ...draft, nursing: { ...draft.nursing, periwoundProtection: values } })} />
    <ChipField title="Terapias avanzadas" options={ADVANCED_THERAPIES} values={draft.nursing.advancedTherapies} onChange={(values) => setDraft({ ...draft, nursing: { ...draft.nursing, advancedTherapies: values } })} />
    <ChipField title="Descarga aplicada" options={OFFLOADING} values={draft.nursing.offloadingApplied} onChange={(values) => setDraft({ ...draft, nursing: { ...draft.nursing, offloadingApplied: values } })} />
    <ChipField title="Educación entregada" options={EDUCATION} values={draft.nursing.education} onChange={(values) => setDraft({ ...draft, nursing: { ...draft.nursing, education: values } })} />
    <label className="clinical-notes">Tolerancia y observaciones<textarea value={draft.nursing.notes || ''} onChange={(event) => setDraft({ ...draft, nursing: { ...draft.nursing, notes: event.target.value } })} /></label>
  </fieldset>{canEdit ? <div className="save-row"><button className="ghost" disabled={locked} onClick={() => void save('nursing')}>Guardar borrador</button><button className="primary" disabled={locked} onClick={() => void save('nursing', true)}>Confirmar curación</button></div> : <p className="helper">Vista de solo lectura. La curación debe ser confirmada por enfermería.</p>}</section>;
}

function MedicalPanel({ draft, setDraft, canEdit, locked, save }: PanelProps) {
  return <section className="stack"><article className="panel wifi-panel"><div className="card-heading"><div><p className="eyebrow">Evaluación médica</p><h2>Clasificación WIfI</h2><p>Abre «Ver criterios» para consultar la ayuda. Selecciona un puntaje solo después de evaluar.</p></div><span className="clinical-reference">Referencia SVS</span></div><fieldset disabled={!canEdit || locked} className="wifi-grid">
    <WifiGradeSelector section="wound" value={draft.wifi.wound} onChange={(value) => setDraft({ ...draft, wifi: { ...draft.wifi, wound: value } })} />
    <WifiGradeSelector section="ischemia" value={draft.wifi.ischemia} onChange={(value) => setDraft({ ...draft, wifi: { ...draft.wifi, ischemia: value } })} />
    <WifiGradeSelector section="footInfection" value={draft.wifi.footInfection} onChange={(value) => setDraft({ ...draft, wifi: { ...draft.wifi, footInfection: value } })} />
    <div className="wifi-hemodynamics"><label>Fecha de medición<input type="date" value={draft.wifi.measuredAt || ''} onChange={(e) => setDraft({ ...draft, wifi: { ...draft.wifi, measuredAt: e.target.value } })} /></label><label>Fuente / examen<input value={draft.wifi.source || ''} onChange={(e) => setDraft({ ...draft, wifi: { ...draft.wifi, source: e.target.value } })} /></label>{(['anklePressure', 'tcpo2'] as const).map((key) => <label key={key}>{key === 'anklePressure' ? 'Presión de tobillo' : 'TcPO₂'} (mmHg)<input type="number" min="0" value={draft.wifi[key] ?? ''} onChange={(e) => setDraft({ ...draft, wifi: { ...draft.wifi, [key]: e.target.value === '' ? undefined : Number(e.target.value) } })} /></label>)}</div>
    <div className="wifi-hemodynamics"><label>ITB<input type="number" step="0.01" value={draft.wifi.abi ?? ''} onChange={(event) => setDraft({ ...draft, wifi: { ...draft.wifi, abi: event.target.value ? Number(event.target.value) : undefined } })} /></label><label>Presión de ortejo (mmHg)<input type="number" value={draft.wifi.toePressure ?? ''} onChange={(event) => setDraft({ ...draft, wifi: { ...draft.wifi, toePressure: event.target.value ? Number(event.target.value) : undefined } })} /></label></div>
    <label className="clinical-notes">Fundamento y fuente de los datos<textarea value={draft.wifi.rationale || ''} onChange={(event) => setDraft({ ...draft, wifi: { ...draft.wifi, rationale: event.target.value } })} placeholder="Ej.: presión de ortejo tomada el…" /></label>
  </fieldset><p className="wifi-caution">La plataforma registra W, I y fI por separado; no determina automáticamente la etapa ni reemplaza el juicio clínico. Si ITB y presión de ortejo difieren, las guías priorizan la presión de ortejo.</p>{canEdit && <div className="save-row"><button className="primary" disabled={locked} onClick={() => void save('wifi', true)}>Confirmar componentes WIfI</button></div>}</article>
  <article className="panel clinical-entry-panel"><div className="card-heading"><div><p className="eyebrow">Conducta</p><h2>Evaluación y plan médico</h2><p>Las opciones rápidas se transforman en texto editable para la ficha institucional.</p></div></div><fieldset disabled={!canEdit || locked}>
    <ChoiceField title="Evaluación de infección" options={[['Sin signos clínicos de infección', 'Sin infección'], ['Infección local leve', 'Leve'], ['Infección moderada', 'Moderada'], ['Infección grave o compromiso sistémico', 'Grave / sistémica']]} value={draft.medical.infectionAssessment || ''} onChange={(infectionAssessment) => setDraft({ ...draft, medical: { ...draft.medical, infectionAssessment } })} />
    <ChipField title="Exámenes solicitados" options={TESTS} values={draft.medical.requestedTests} onChange={(requestedTests) => setDraft({ ...draft, medical: { ...draft.medical, requestedTests } })} allowCustom />
    <ChipField title="Conductas planificadas" options={MEDICAL_ACTIONS} values={toList(draft.medical.treatmentPlan)} onChange={(values) => setDraft({ ...draft, medical: { ...draft.medical, treatmentPlan: values.join(', ') } })} />
    <ChoiceField title="Control" options={[[2, '48 horas'], [3, '3 días'], [7, '7 días'], [14, '14 días'], [30, '30 días']]} value={draft.medical.followUpDays ?? ''} onChange={(value) => setDraft({ ...draft, medical: { ...draft.medical, followUpDays: Number(value) } })} />
    <ChipField title="Signos de alarma informados" options={WARNING_SIGNS} values={toList(draft.medical.warningSigns)} onChange={(values) => setDraft({ ...draft, medical: { ...draft.medical, warningSigns: values.join(', ') } })} />
    <div className="form-grid"><label>Impresión clínica<textarea value={draft.medical.clinicalImpression || ''} onChange={(event) => setDraft({ ...draft, medical: { ...draft.medical, clinicalImpression: event.target.value } })} /></label><label>Antimicrobianos y esquema<input value={draft.medical.antibiotics || ''} onChange={(event) => setDraft({ ...draft, medical: { ...draft.medical, antibiotics: event.target.value } })} /></label><label>Detalle de descarga<textarea value={draft.medical.offloadingPlan || ''} onChange={(event) => setDraft({ ...draft, medical: { ...draft.medical, offloadingPlan: event.target.value } })} /></label><label>Detalle adicional del plan<textarea value={draft.medical.treatmentPlan || ''} onChange={(event) => setDraft({ ...draft, medical: { ...draft.medical, treatmentPlan: event.target.value } })} /></label></div>
  </fieldset>{canEdit ? <div className="save-row"><button className="ghost" disabled={locked} onClick={() => void save('medical')}>Guardar borrador</button><button className="primary" disabled={locked} onClick={() => void save('medical', true)}>Confirmar plan médico</button></div> : <p className="helper">Vista de solo lectura para tu perfil.</p>}</article></section>;
}

function toList(value?: string) { return String(value || '').split(',').map((item) => item.trim()).filter(Boolean); }

function ChipField({ title, options, values, onChange, alert = false, allowCustom = false }: { title: string; options: string[]; values: string[]; onChange: (values: string[]) => void; alert?: boolean; allowCustom?: boolean }) {
  const [custom, setCustom] = useState('');
  const addCustom = () => { const value = custom.trim(); if (value && !values.includes(value)) onChange([...values, value]); setCustom(''); };
  return <section className={`encounter-choice ${alert ? 'alert' : ''}`}><h3>{title}</h3><div className="encounter-chips">{options.map((option) => <button type="button" key={option} className={values.includes(option) ? 'selected' : ''} aria-pressed={values.includes(option)} onClick={() => onChange(toggleValue(values, option))}>{option}</button>)}</div>{allowCustom && <div className="inline-custom"><input value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="Otro…" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustom(); } }} /><button type="button" onClick={addCustom}>Agregar</button></div>}{values.filter((value) => !options.includes(value)).map((value) => <button type="button" className="custom-value" key={value} onClick={() => onChange(values.filter((item) => item !== value))}>{value} ×</button>)}</section>;
}

function ChoiceField<T extends string | number>({ title, options, value, onChange }: { title: string; options: readonly (readonly [T, string])[]; value: T | ''; onChange: (value: T) => void }) {
  return <section className="encounter-choice"><h3>{title}</h3><div className="encounter-chips">{options.map(([option, label]) => <button type="button" key={option} className={value === option ? 'selected' : ''} aria-pressed={value === option} onClick={() => onChange(option)}>{label}</button>)}</div></section>;
}

function ScoreButtons({ title, value, onChange }: { title: string; value?: number; onChange: (value: number) => void }) { return <section className="encounter-choice"><h3>{title}</h3><div className="score-buttons">{Array.from({ length: 11 }, (_, score) => <button type="button" key={score} className={value === score ? 'selected' : ''} onClick={() => onChange(score)}>{score}</button>)}</div></section>; }

function WifiGradeSelector({ section, value, onChange }: { section: WifiSection; value?: 0 | 1 | 2 | 3; onChange: (value: 0 | 1 | 2 | 3 | undefined) => void }) {
  const help = WIFI_HELP[section]; const selected = help.scores.find((item) => item.score === value);
  return <section className="wifi-selector"><h3>{help.label}</h3><details><summary>Ver criterios sin cambiar el puntaje</summary>{help.scores.map((item) => <p key={item.score}><strong>{item.score} · {item.title}:</strong> {item.detail}</p>)}<a href="https://iwgdfguidelines.org/classification-2023/" target="_blank" rel="noreferrer">Referencia IWGDF 2023</a></details><button type="button" aria-pressed={value == null} onClick={() => onChange(undefined)}>No evaluado</button><div className="wifi-scores">{help.scores.map((item) => <button type="button" key={item.score} className={value === item.score ? 'selected' : ''} aria-pressed={value === item.score} title={`${item.title}: ${item.detail}`} onClick={() => onChange(item.score)}><strong>{item.score}</strong><span>{item.title}</span><span className="wifi-tooltip" role="tooltip">{item.detail}</span></button>)}</div><div className={`wifi-selected-help ${selected ? '' : 'empty'}`}>{selected ? <><strong>Puntaje {selected.score}: {selected.title}</strong><p>{selected.detail}</p></> : <p>Selecciona un puntaje para ver su definición.</p>}</div></section>;
}

function PhotoColumn({ title, photos }: { title: string; photos: Encounter['photos'] }) { return <div><h3>{title}</h3><div className="photo-grid">{photos.map((photo) => photo.url ? <figure key={photo.id}><img src={photo.url} alt={`${title} de la herida`} /><figcaption>{formatDateTime(photo.capturedAt)} · {photo.capturedByName}</figcaption></figure> : null)}{photos.length === 0 && <div className="photo-placeholder">Sin fotografía</div>}</div></div>; }
function Narrative({ title, text, confirmed, canCopy, initialText, persist }: { title: string; text: string; confirmed: boolean; canCopy: boolean; initialText?: string; persist: (text: string) => Promise<void> }) {
  const [edited, setEdited] = useState(initialText || text); const [reviewed, setReviewed] = useState(false); const [message, setMessage] = useState('');
  return <article className="panel narrative"><h2>{title}</h2><p>{confirmed ? 'Datos de origen confirmados' : 'Borrador: hay secciones pendientes de confirmación'}</p><textarea readOnly={!canCopy} value={edited} onChange={(e) => { setEdited(e.target.value); setReviewed(false); }} /><p className="helper">La edición de este texto no cambia los datos estructurados. Al copiar, la versión revisada queda guardada con tu autoría. Una nueva versión requiere revisar el texto de nuevo.</p>{canCopy && <><label className="check-line"><input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} /> Revisé este texto y sus datos de origen</label><button className="primary" disabled={!reviewed || !confirmed || !edited.trim()} onClick={() => void persist(edited).then(() => copyText(edited)).then(() => setMessage('Texto revisado copiado.')).catch((e) => setMessage(e instanceof Error ? e.message : 'No se pudo guardar o copiar el texto.'))}>Copiar texto revisado</button></>}{message && <p role="status">{message}</p>}</article>;
}
