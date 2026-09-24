import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Encounter } from '../types';

export default function EncounterPhotoCapture({ centerId, encounter, onChanged, disabled }: { centerId: string; encounter: Encounter; onChanged: (value: Encounter) => void; disabled: boolean }) {
  const [file, setFile] = useState<File>(); const [preview, setPreview] = useState(''); const [kind, setKind] = useState<'pre' | 'post'>('pre');
  const [identity, setIdentity] = useState(false); const [orientation, setOrientation] = useState(false); const [scale, setScale] = useState(false); const [sharp, setSharp] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  useEffect(() => { if (!file) { setPreview(''); return; } const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  const upload = async () => {
    if (!file || disabled) return;
    setBusy(true); setMessage('');
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('No se pudo leer la fotografía.')); reader.readAsDataURL(file); });
      const result = await api.uploadPhoto(centerId, encounter.id, { dataUrl, kind, orientationConfirmed: orientation, scaleIncluded: scale });
      onChanged(result.encounter); setFile(undefined); setIdentity(false); setOrientation(false); setSharp(false); setScale(false); setMessage('Fotografía guardada. Pendiente de revisión clínica.');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'No fue posible guardar.'); } finally { setBusy(false); }
  };
  return <section className="photo-capture"><fieldset disabled={disabled || busy}><legend>Preparar fotografía</legend><label>Momento<select value={kind} onChange={(e) => setKind(e.target.value as 'pre' | 'post')}><option value="pre">Precuración</option><option value="post">Postcuración</option></select></label><label>Seleccionar o tomar foto<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(e) => { const selected = e.target.files?.[0]; if (selected && selected.size > 5 * 1024 * 1024) { setMessage('La foto supera 5 MB.'); return; } setFile(selected); setIdentity(false); setOrientation(false); setSharp(false); setScale(false); }} /></label>{preview && <img className="capture-preview" src={preview} alt="Vista previa antes de guardar" />}
    <label className="check-line"><input type="checkbox" checked={identity} onChange={(e) => setIdentity(e.target.checked)} /> Verifiqué paciente, lesión y lado</label><label className="check-line"><input type="checkbox" checked={orientation} onChange={(e) => setOrientation(e.target.checked)} /> Verifiqué orientación</label><label className="check-line"><input type="checkbox" checked={sharp} onChange={(e) => setSharp(e.target.checked)} /> La imagen es nítida</label><label className="check-line"><input type="checkbox" checked={scale} onChange={(e) => setScale(e.target.checked)} /> Incluye referencia de escala</label><button type="button" className="primary" disabled={!file || !identity || !orientation || !sharp} onClick={() => void upload()}>{busy ? 'Guardando…' : 'Guardar fotografía'}</button></fieldset>{message && <p role="status">{message}</p>}</section>;
}
