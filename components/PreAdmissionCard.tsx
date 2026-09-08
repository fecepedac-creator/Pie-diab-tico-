import { ChangeEvent, FormEvent, useState } from 'react';
import { api } from '../services/api';
import type { Membership, Patient } from '../types';
import { formatRut, toggleValue } from '../utils';
import './pre-admission.css';

const MEDICAL_OPTIONS = ['HTA', 'DM-1', 'DM-2', 'Dislipidemia', 'Obesidad', 'Cardiopatía coronaria', 'Insuficiencia cardíaca', 'ACV', 'ERC'];
const SURGICAL_OPTIONS = ['Angioplastia EEII', 'Bypass vascular', 'Desbridamiento quirúrgico', 'Amputación menor', 'Amputación mayor'];
const MEDICATION_OPTIONS = ['Metformina', 'Insulina', 'AAS', 'Clopidogrel', 'Estatina', 'Anticoagulante'];
const DIABETES_OPTIONS = ['Sólo dieta', 'Antidiabéticos orales', 'Insulina', 'Tratamiento mixto'];
const SMOKING_OPTIONS = ['Nunca', 'Exfumador/a', 'Fumador/a activo/a'];
const RENAL_OPTIONS = ['Sin ERC conocida', 'ERC sin diálisis', 'Hemodiálisis', 'Diálisis peritoneal'];
const NEUROPATHY_OPTIONS = ['No conocida', 'Presente', 'Ausente', 'No evaluada'];
const AMPUTATION_OPTIONS = ['Sin amputaciones', 'Amputación menor', 'Amputación mayor'];
const VASCULAR_OPTIONS = ['Sin antecedente vascular', 'Enfermedad arterial periférica', 'Revascularización previa', 'Trombosis previa'];
const SUPPORT_OPTIONS = ['Vive solo/a', 'Pareja', 'Hijos/as', 'Otros familiares', 'Cuidador/a', 'Red limitada'];
const MOBILITY_OPTIONS = ['Independiente', 'Bastón', 'Andador', 'Silla de ruedas', 'Dependiente'];
const TRANSPORT_OPTIONS = ['Sin barreras', 'Distancia', 'Costo', 'Traslado sanitario', 'Dependencia de tercero'];
const HOUSING_OPTIONS = ['Sin barreras', 'Escaleras', 'Baño no adaptado', 'Hacinamiento', 'Riesgo sanitario'];

const split = (value?: string) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

function SingleChoice({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
  return <div className="choice-grid">{options.map((option) => <button type="button" className={`clinical-chip ${value === option ? 'selected' : ''}`} aria-pressed={value === option} key={option} onClick={() => onChange(value === option ? '' : option)}>{option}</button>)}</div>;
}

function MultiChoice({ options, values, onChange, exclusiveOption, exclusiveGroups = [] }: { options: string[]; values: string[]; onChange: (values: string[]) => void; exclusiveOption?: string; exclusiveGroups?: string[][] }) {
  const toggle = (option: string) => {
    if (values.includes(option)) { onChange(toggleValue(values, option)); return; }
    if (option === exclusiveOption) { onChange([option]); return; }
    const group = exclusiveGroups.find((items) => items.includes(option));
    const withoutContradictions = values.filter((value) => value !== exclusiveOption && !group?.includes(value));
    onChange([...withoutContradictions, option]);
  };
  return <div className="choice-grid">{options.map((option) => <button type="button" className={`clinical-chip ${values.includes(option) ? 'selected' : ''}`} aria-pressed={values.includes(option)} key={option} onClick={() => toggle(option)}>{option}</button>)}</div>;
}

function AddableChoice({ title, hint, icon, tone, options, values, onChange, placeholder, exclusiveGroups }: { title: string; hint?: string; icon: string; tone: string; options: string[]; values: string[]; onChange: (values: string[]) => void; placeholder: string; exclusiveGroups?: string[][] }) {
  const [draft, setDraft] = useState('');
  const custom = values.filter((value) => !options.includes(value));
  const add = () => {
    const value = draft.trim();
    if (value && !values.some((item) => item.toLowerCase() === value.toLowerCase())) onChange([...values, value]);
    setDraft('');
  };
  return <section className="pre-section" data-tone={tone}>
    <header><span className="section-icon" aria-hidden="true">{icon}</span><div><h3>{title}</h3>{hint && <p>{hint}</p>}</div></header>
    <MultiChoice options={options} values={values} onChange={onChange} exclusiveGroups={exclusiveGroups} />
    {custom.length > 0 && <div className="custom-chips">{custom.map((value) => <button type="button" key={value} onClick={() => onChange(values.filter((item) => item !== value))}>{value}<span aria-hidden="true">×</span></button>)}</div>}
    <div className="exception-entry"><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); add(); } }} placeholder={placeholder} /><button type="button" onClick={add}>Agregar</button></div>
  </section>;
}

export default function PreAdmissionCard({ centerId, membership, patient, onSaved, demoMode = false }: { centerId: string; membership: Membership; patient: Patient; onSaved: () => Promise<void>; demoMode?: boolean }) {
  const canEdit = membership.roles.some((role) => ['nurse', 'doctor', 'social_worker', 'physiatrist', 'coordinator'].includes(role));
  const canUploadPhoto = membership.roles.some((role) => ['nurse', 'doctor', 'coordinator'].includes(role));
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [birthDate, setBirthDate] = useState(patient.birthDate || '');
  const [contact, setContact] = useState(patient.contact || '');
  const [comuna, setComuna] = useState(patient.comuna || '');
  const [diabetesTreatment, setDiabetesTreatment] = useState(patient.anamnesis.diabetesTreatment || '');
  const [medicalHistory, setMedicalHistory] = useState(patient.anamnesis.medicalHistory || []);
  const [surgicalHistory, setSurgicalHistory] = useState(patient.anamnesis.surgicalHistory || []);
  const [allergyStatus, setAllergyStatus] = useState(patient.anamnesis.allergyStatus || (patient.anamnesis.allergies.length ? 'present' : 'unknown'));
  const [allergies, setAllergies] = useState(patient.anamnesis.allergies || []);
  const [medications, setMedications] = useState(patient.anamnesis.medications || []);
  const [smoking, setSmoking] = useState(patient.anamnesis.smoking || '');
  const [renalDisease, setRenalDisease] = useState(patient.anamnesis.renalDisease || '');
  const [vascularHistory, setVascularHistory] = useState(split(patient.anamnesis.vascularHistory));
  const [neuropathy, setNeuropathy] = useState(patient.anamnesis.neuropathy || '');
  const [previousAmputations, setPreviousAmputations] = useState(patient.anamnesis.previousAmputations || '');
  const [supportNetwork, setSupportNetwork] = useState(split(patient.social.supportNetwork));
  const [mobility, setMobility] = useState(patient.social.mobility || '');
  const [transportBarriers, setTransportBarriers] = useState(split(patient.social.transportBarriers));
  const [housingBarriers, setHousingBarriers] = useState(split(patient.social.housingBarriers));
  const [socialNotes, setSocialNotes] = useState(patient.social.notes || '');
  const [confirmed, setConfirmed] = useState(patient.preAdmissionStatus === 'validated');

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (demoMode) return; setSaving(true); setMessage('');
    try {
      await api.updatePatient(centerId, patient.id, {
        birthDate, contact, comuna,
        preAdmissionStatus: confirmed ? 'validated' : 'in_progress',
        anamnesis: {
          diabetesTreatment, medicalHistory, surgicalHistory, allergyStatus,
          allergies: allergyStatus === 'none' ? [] : allergies,
          medications, smoking, renalDisease, vascularHistory: vascularHistory.join(', '),
          neuropathy, previousAmputations,
        },
        social: {
          supportNetwork: supportNetwork.join(', '), mobility,
          transportBarriers: transportBarriers.join(', '), housingBarriers: housingBarriers.join(', '), notes: socialNotes,
        },
        verification: { status: confirmed ? 'confirmed' : 'draft' },
      });
      await onSaved(); setMessage(confirmed ? 'Preingreso validado y compartido con el equipo.' : 'Borrador de preingreso guardado.');
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No fue posible guardar.'); }
    finally { setSaving(false); }
  };

  const uploadPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    if (demoMode) return; const file = event.target.files?.[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setMessage('La fotografía supera el máximo de 5 MB.'); return; }
    const reader = new FileReader(); setSaving(true); setMessage('');
    reader.onload = async () => {
      try { await api.uploadPatientPhoto(centerId, patient.id, { dataUrl: String(reader.result) }); await onSaved(); setMessage('Fotografía del paciente actualizada.'); }
      catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No fue posible cargar la fotografía.'); }
      finally { setSaving(false); event.target.value = ''; }
    };
    reader.onerror = () => { setSaving(false); setMessage('No fue posible leer la fotografía.'); };
    reader.readAsDataURL(file);
  };

  return <article className="pre-admission-card">
    <aside className="patient-identity">
      <div className="patient-photo">{patient.photoUrl ? <img src={patient.photoUrl} alt={`Fotografía de ${patient.name}`} /> : <span>{initials(patient.name)}</span>}</div>
      {canUploadPhoto && <label className="photo-upload">{patient.photoUrl ? 'Cambiar fotografía' : 'Agregar fotografía'}<input hidden type="file" accept="image/jpeg,image/png,image/webp" capture="user" onChange={uploadPhoto} disabled={saving || demoMode} /></label>}
      <small>Imagen privada para identificación dentro del equipo.</small>
      <div className="patient-name"><p>Paciente</p><h2>{patient.name}</h2><strong>{formatRut(patient.rut)}</strong></div>
      <dl>
        <div><dt>Nacimiento</dt><dd>{birthDate || 'Pendiente'}</dd></div>
        <div><dt>Contacto</dt><dd>{contact || 'Pendiente'}</dd></div>
        <div><dt>Comuna</dt><dd>{comuna || 'Pendiente'}</dd></div>
      </dl>
      <span className={`pre-status ${confirmed ? 'validated' : ''}`}>{confirmed ? '✓ Preingreso validado' : '○ Preingreso en preparación'}</span>
    </aside>

    <form className="pre-admission-form" onSubmit={save}>
      <header className="pre-title"><div><p className="eyebrow">Ficha compartida</p><h2>Preingreso clínico y social</h2><p>Selecciona opciones rápidas. Escribe sólo cuando necesites agregar un detalle particular.</p></div></header>
      <fieldset disabled={!canEdit || saving || demoMode}>
        <section className="pre-section identity-fields" data-tone="teal">
          <header><span className="section-icon" aria-hidden="true">●</span><div><h3>Datos de contacto</h3><p>Información básica para coordinación del equipo.</p></div></header>
          <div className="compact-fields"><label>Fecha de nacimiento<input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} /></label><label>Teléfono<input inputMode="tel" value={contact} onChange={(event) => setContact(event.target.value)} /></label><label>Comuna<input value={comuna} onChange={(event) => setComuna(event.target.value)} /></label></div>
        </section>

        <AddableChoice title="Antecedentes mórbidos" hint="Presiona para activar o desactivar." icon="♥" tone="red" options={MEDICAL_OPTIONS} values={medicalHistory} onChange={setMedicalHistory} placeholder="Otra patología relevante…" exclusiveGroups={[["DM-1", "DM-2"]]} />
        <AddableChoice title="Antecedentes quirúrgicos" hint="Procedimientos relacionados y cirugías previas." icon="✦" tone="indigo" options={SURGICAL_OPTIONS} values={surgicalHistory} onChange={setSurgicalHistory} placeholder="Otra cirugía…" />

        <section className="pre-section" data-tone="blue"><header><span className="section-icon" aria-hidden="true">◆</span><div><h3>Diabetes y hábitos</h3><p>Una selección por cada grupo.</p></div></header><label className="choice-label">Tratamiento de diabetes</label><SingleChoice options={DIABETES_OPTIONS} value={diabetesTreatment} onChange={setDiabetesTreatment} /><label className="choice-label">Tabaquismo</label><SingleChoice options={SMOKING_OPTIONS} value={smoking} onChange={setSmoking} /><label className="choice-label">Función renal</label><SingleChoice options={RENAL_OPTIONS} value={renalDisease} onChange={setRenalDisease} /></section>

        <section className="pre-section" data-tone="purple"><header><span className="section-icon" aria-hidden="true">◇</span><div><h3>Riesgo de pie diabético</h3><p>Antecedentes que modifican la planificación.</p></div></header><label className="choice-label">Neuropatía</label><SingleChoice options={NEUROPATHY_OPTIONS} value={neuropathy} onChange={setNeuropathy} /><label className="choice-label">Antecedente vascular</label><MultiChoice options={VASCULAR_OPTIONS} values={vascularHistory} onChange={setVascularHistory} exclusiveOption="Sin antecedente vascular" /><label className="choice-label">Amputaciones previas</label><SingleChoice options={AMPUTATION_OPTIONS} value={previousAmputations} onChange={setPreviousAmputations} /></section>

        <section className="pre-section" data-tone="amber"><header><span className="section-icon" aria-hidden="true">!</span><div><h3>Alergias</h3><p>Debe quedar explícito si fue evaluado.</p></div></header><div className="choice-grid allergy-status"><button type="button" className={`clinical-chip ${allergyStatus === 'present' ? 'selected' : ''}`} aria-pressed={allergyStatus === 'present'} onClick={() => setAllergyStatus('present')}>Sí presenta</button><button type="button" className={`clinical-chip ${allergyStatus === 'none' ? 'selected safe' : ''}`} aria-pressed={allergyStatus === 'none'} onClick={() => { setAllergyStatus('none'); setAllergies([]); }}>Sin alergias conocidas</button><button type="button" className={`clinical-chip ${allergyStatus === 'unknown' ? 'selected pending' : ''}`} aria-pressed={allergyStatus === 'unknown'} onClick={() => setAllergyStatus('unknown')}>Aún no evaluado</button></div>{allergyStatus === 'present' && <AddableChoice title="Sustancias o medicamentos" icon="+" tone="amber" options={[]} values={allergies} onChange={setAllergies} placeholder="Agregar alergia…" />}</section>

        <AddableChoice title="Medicamentos habituales" hint="Activa los frecuentes y agrega sólo las excepciones." icon="+" tone="green" options={MEDICATION_OPTIONS} values={medications} onChange={setMedications} placeholder="Otro medicamento…" />

        <section className="pre-section social-section" data-tone="orange"><header><span className="section-icon" aria-hidden="true">⌂</span><div><h3>Situación social y funcional</h3><p>Información relevante para adherencia, traslado y descarga.</p></div></header><label className="choice-label">Red de apoyo</label><MultiChoice options={SUPPORT_OPTIONS} values={supportNetwork} onChange={setSupportNetwork} /><label className="choice-label">Movilidad</label><SingleChoice options={MOBILITY_OPTIONS} value={mobility} onChange={setMobility} /><label className="choice-label">Barreras de transporte</label><MultiChoice options={TRANSPORT_OPTIONS} values={transportBarriers} onChange={setTransportBarriers} exclusiveOption="Sin barreras" /><label className="choice-label">Barreras de vivienda</label><MultiChoice options={HOUSING_OPTIONS} values={housingBarriers} onChange={setHousingBarriers} exclusiveOption="Sin barreras" /><label className="notes-field">Observación social excepcional<textarea value={socialNotes} onChange={(event) => setSocialNotes(event.target.value)} placeholder="Escribe sólo aquello que no quede representado en las opciones anteriores." /></label></section>
      </fieldset>

      {canEdit ? <footer className="pre-actions"><button type="button" disabled={demoMode} className={`validation-toggle ${confirmed ? 'selected' : ''}`} aria-pressed={confirmed} onClick={() => setConfirmed(!confirmed)}>{confirmed ? '✓ Antecedentes revisados' : 'Marcar como revisado'}</button><button className="primary" disabled={saving || demoMode}>{saving ? 'Guardando…' : confirmed ? 'Guardar y validar' : 'Guardar borrador'}</button></footer> : <p className="readonly-note">Vista de lectura para tu perfil.</p>}
      {message && <p className="pre-message" role="status">{message}</p>}
    </form>
  </article>;
}
