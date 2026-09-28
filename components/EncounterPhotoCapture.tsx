import { useEffect, useMemo, useState, type PointerEvent } from 'react';
import { api } from '../services/api';
import type { Encounter, PhotoMeasurement, PhotoPoint } from '../types';
import './photo-measurement.css';

type Mode = 'reference' | 'length' | 'width' | 'outline';
type Segment = PhotoPoint[];
type MeasurementInput = Omit<PhotoMeasurement, 'method' | 'lengthCm' | 'widthCm' | 'areaCm2'>;

function distance(points: Segment, imageWidth: number, imageHeight: number) {
  return points.length === 2 ? Math.hypot((points[1].x - points[0].x) * imageWidth, (points[1].y - points[0].y) * imageHeight) : 0;
}

function polygonArea(points: PhotoPoint[], imageWidth: number, imageHeight: number) {
  return Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0)) * imageWidth * imageHeight / 2;
}

function Line({ points, color }: { points: Segment; color: string }) {
  return <>
    {points.length === 2 && <line x1={points[0].x * 1000} y1={points[0].y * 1000} x2={points[1].x * 1000} y2={points[1].y * 1000} stroke={color} strokeWidth="5" />}
    {points.map((point, index) => <circle key={index} cx={point.x * 1000} cy={point.y * 1000} r="9" fill={color} stroke="white" strokeWidth="3" />)}
  </>;
}

export default function EncounterPhotoCapture({ centerId, encounter, onChanged, disabled }: { centerId: string; encounter: Encounter; onChanged: (value: Encounter) => void; disabled: boolean }) {
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState('');
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [kind, setKind] = useState<'pre' | 'post'>('pre');
  const [identity, setIdentity] = useState(false);
  const [orientation, setOrientation] = useState(false);
  const [sharp, setSharp] = useState(false);
  const [scale, setScale] = useState(false);
  const [mode, setMode] = useState<Mode>('reference');
  const [referenceLength, setReferenceLength] = useState('1');
  const [reference, setReference] = useState<Segment>([]);
  const [length, setLength] = useState<Segment>([]);
  const [width, setWidth] = useState<Segment>([]);
  const [outline, setOutline] = useState<PhotoPoint[]>([]);
  const [outlineClosed, setOutlineClosed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const clearMarks = () => { setReference([]); setLength([]); setWidth([]); setOutline([]); setOutlineClosed(false); setMode('reference'); };
  const marksStarted = reference.length + length.length + width.length + outline.length > 0;
  const calculated = useMemo(() => {
    const knownCm = Number(referenceLength);
    if (!imageSize.width || !imageSize.height || !Number.isFinite(knownCm) || knownCm < 0.1 || knownCm > 20) return null;
    const referencePixels = distance(reference, imageSize.width, imageSize.height);
    if (referencePixels < 12 || !distance(length, imageSize.width, imageSize.height) || !distance(width, imageSize.width, imageSize.height) || (outline.length > 0 && (!outlineClosed || outline.length < 3))) return null;
    const cmPerPixel = knownCm / referencePixels;
    const lengthCm = distance(length, imageSize.width, imageSize.height) * cmPerPixel;
    const widthCm = distance(width, imageSize.width, imageSize.height) * cmPerPixel;
    const areaCm2 = outlineClosed ? polygonArea(outline, imageSize.width, imageSize.height) * cmPerPixel * cmPerPixel : undefined;
    if (lengthCm < 0.05 || widthCm < 0.05 || lengthCm > 100 || widthCm > 100 || (areaCm2 !== undefined && (areaCm2 < 0.01 || areaCm2 > 10000))) return null;
    const input: MeasurementInput = {
      imageWidth: imageSize.width, imageHeight: imageSize.height, referenceLengthCm: knownCm,
      reference: reference as [PhotoPoint, PhotoPoint], length: length as [PhotoPoint, PhotoPoint], width: width as [PhotoPoint, PhotoPoint],
      ...(outlineClosed ? { outline } : {}),
    };
    return { input, lengthCm, widthCm, areaCm2 };
  }, [imageSize, referenceLength, reference, length, width, outline, outlineClosed]);

  const markPoint = (event: PointerEvent<SVGSVGElement>) => {
    if (disabled || busy || !scale) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const point = { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
    const nextLine = (current: Segment) => current.length === 2 ? [point] : [...current, point];
    if (mode === 'reference') setReference(nextLine);
    if (mode === 'length') setLength(nextLine);
    if (mode === 'width') setWidth(nextLine);
    if (mode === 'outline' && !outlineClosed && outline.length < 64) setOutline([...outline, point]);
  };

  const upload = async () => {
    if (!file || disabled || (marksStarted && !calculated)) return;
    setBusy(true); setMessage('');
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('No se pudo leer la fotografía.'));
        reader.readAsDataURL(file);
      });
      const result = await api.uploadPhoto(centerId, encounter.id, { dataUrl, kind, orientationConfirmed: orientation, scaleIncluded: scale, ...(calculated ? { measurement: calculated.input } : {}) });
      onChanged(result.encounter);
      setFile(undefined); setImageSize({ width: 0, height: 0 }); setIdentity(false); setOrientation(false); setSharp(false); setScale(false); clearMarks();
      if (kind === 'pre') setKind('post');
      setMessage(`Fotografía ${kind === 'pre' ? 'precuración' : 'postcuración'} guardada${calculated ? ' con medición estimada' : ''}. ${kind === 'pre' ? 'Puedes continuar aquí con la foto postcuración.' : 'Pendiente de revisión clínica.'}`);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No fue posible guardar.'); }
    finally { setBusy(false); }
  };

  return <section className="photo-capture">{message && <p className="photo-save-message" role="status">{message}</p>}<fieldset disabled={disabled || busy}><legend>Preparar fotografía</legend>
    <label>Momento<select value={kind} onChange={(event) => setKind(event.target.value as 'pre' | 'post')}><option value="pre">Precuración</option><option value="post">Postcuración</option></select></label>
    <label>Seleccionar o tomar foto<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => {
      const selected = event.target.files?.[0]; event.target.value = '';
      if (selected && selected.size > 5 * 1024 * 1024) { setFile(undefined); clearMarks(); setMessage('La foto supera 5 MB.'); return; }
      setFile(selected); setImageSize({ width: 0, height: 0 }); setIdentity(false); setOrientation(false); setSharp(false); setScale(false); clearMarks(); setMessage('');
    }} /></label>
    <label className="check-line"><input type="checkbox" checked={identity} onChange={(event) => setIdentity(event.target.checked)} /> Verifiqué paciente, lesión y lado</label>
    <label className="check-line"><input type="checkbox" checked={orientation} onChange={(event) => setOrientation(event.target.checked)} /> Verifiqué orientación</label>
    <label className="check-line"><input type="checkbox" checked={sharp} onChange={(event) => setSharp(event.target.checked)} /> La imagen es nítida</label>
    <label className="check-line"><input type="checkbox" checked={scale} onChange={(event) => { setScale(event.target.checked); if (!event.target.checked) clearMarks(); }} /> Incluye una regla o marcador de tamaño conocido, junto a la herida y en el mismo plano</label>
    {preview && <div className="photo-measurement">
      <p className="helper">Medición fotográfica opcional. Fotografía de frente. Marca dos puntos sobre la referencia física, el largo mayor y el ancho perpendicular. Para estimar área, rodea el borde de la herida. No mide profundidad.</p>
      {scale && <div className="measurement-controls">
        <label>Longitud de la referencia (cm)<input type="number" min="0.1" max="20" step="0.1" inputMode="decimal" value={referenceLength} onChange={(event) => setReferenceLength(event.target.value)} /></label>
        <div className="measurement-modes" role="group" aria-label="Marca que se trazará al tocar la foto">
          {([['reference', '1. Referencia'], ['length', '2. Largo'], ['width', '3. Ancho'], ['outline', '4. Contorno opcional']] as const).map(([value, label]) => <button key={value} type="button" className={mode === value ? 'selected' : ''} aria-pressed={mode === value} onClick={() => setMode(value)}>{label}</button>)}
        </div>
        <div className="measurement-actions"><button type="button" onClick={clearMarks}>Borrar marcas</button>{outline.length > 0 && !outlineClosed && <button type="button" disabled={outline.length < 3} onClick={() => setOutlineClosed(true)}>Cerrar contorno</button>}{outlineClosed && <button type="button" onClick={() => { setOutline([]); setOutlineClosed(false); setMode('outline'); }}>Rehacer contorno</button>}</div>
      </div>}
      <div className="measurement-stage"><img src={preview} alt="Vista previa de la herida para marcar la escala y las medidas" onLoad={(event) => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} />{scale && <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" onPointerDown={markPoint} aria-label="Toca la foto para marcar puntos de medición">
        <Line points={reference} color="#fbbf24" /><Line points={length} color="#22d3ee" /><Line points={width} color="#fb7185" />
        {outline.length > 1 && <polyline points={outline.map((point) => point.x * 1000 + ',' + point.y * 1000).join(' ')} fill={outlineClosed ? '#a7f3d055' : 'none'} stroke="#86efac" strokeWidth="5" />}
        {outlineClosed && outline.length > 2 && <line x1={outline.at(-1)!.x * 1000} y1={outline.at(-1)!.y * 1000} x2={outline[0].x * 1000} y2={outline[0].y * 1000} stroke="#86efac" strokeWidth="5" />}
        {outline.map((point, index) => <circle key={index} cx={point.x * 1000} cy={point.y * 1000} r="7" fill="#86efac" stroke="white" strokeWidth="2" />)}
      </svg>}</div>
      {scale && <p role="status" className="measurement-result">{calculated ? 'Estimación: largo ' + calculated.lengthCm.toFixed(2) + ' cm · ancho ' + calculated.widthCm.toFixed(2) + ' cm' + (calculated.areaCm2 === undefined ? '' : ' · área ' + calculated.areaCm2.toFixed(2) + ' cm²') : marksStarted ? 'Completa la referencia, largo y ancho; cierra o borra el contorno antes de guardar.' : 'Toca dos puntos para cada línea. Puedes guardar la foto sin medirla.'}</p>}
    </div>}
    <button type="button" className="primary" disabled={!file || !identity || !orientation || !sharp || (marksStarted && !calculated)} onClick={() => void upload()}>{busy ? 'Guardando…' : 'Guardar fotografía'}</button>
    <p className="helper">Las medidas son estimaciones de una imagen plana. Confirma con medición clínica cuando influyan en una decisión.</p>
  </fieldset></section>;
}
