import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Center, NursingCatalog, NursingCatalogOptions, NursingCatalogSection } from '../types';
import defaults from '../functions/nursing-catalog-defaults.json';

const sections: { key: NursingCatalogSection; label: string }[] = [
  { key: 'cleaning', label: 'Limpieza' },
  { key: 'debridement', label: 'Desbridamiento' },
  { key: 'primaryDressings', label: 'Apósito primario' },
  { key: 'secondaryDressings', label: 'Apósito secundario' },
  { key: 'periwoundProtection', label: 'Protección perilesional' },
  { key: 'advancedTherapies', label: 'Terapias avanzadas' },
  { key: 'offloadingApplied', label: 'Descarga aplicada' },
  { key: 'education', label: 'Educación entregada' },
];

export default function NursingCatalogPanel({ center, demoMode = false }: { center: Center; demoMode?: boolean }) {
  const [catalog, setCatalog] = useState<NursingCatalog | null>(demoMode ? { revision: 0, options: defaults } : null);
  const [options, setOptions] = useState<NursingCatalogOptions>(defaults);
  const [newValues, setNewValues] = useState<Partial<Record<NursingCatalogSection, string>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = async () => {
    try {
      const result = await api.getNursingCatalog(center.id);
      setCatalog(result.catalog);
      setOptions(result.catalog.options);
      setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cargar el catálogo.'); }
  };
  useEffect(() => {
    if (demoMode) return;
    let cancelled = false;
    api.getNursingCatalog(center.id).then((result) => {
      if (!cancelled) { setCatalog(result.catalog); setOptions(result.catalog.options); }
    }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'No se pudo cargar el catálogo.'); });
    return () => { cancelled = true; };
  }, [center.id, demoMode]);
  const setSection = (key: NursingCatalogSection, values: string[]) => setOptions((previous) => ({ ...previous, [key]: values }));
  const save = async () => {
    if (!catalog || busy || demoMode) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await api.updateNursingCatalog(center.id, { revision: catalog.revision, options });
      setCatalog(result.catalog);
      setOptions(result.catalog.options);
      setMessage('Catálogo guardado. Las nuevas opciones ya están disponibles en este centro.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el catálogo.'); }
    finally { setBusy(false); }
  };
  return <section className="panel nursing-catalog">
    <h2>Catálogo de curaciones</h2>
    <p className="helper">Personaliza las opciones rápidas junto a la persona clínica a cargo. Los cambios se aplican al guardar; los registros anteriores conservan sus términos.</p>
    {error && <p className="notice danger" role="alert">{error} <button type="button" className="ghost" onClick={() => void load()}>Actualizar</button></p>}
    {message && <p className="notice" role="status">{message}</p>}
    {!catalog && !error && <p>Cargando catálogo…</p>}
    {catalog && <>
      <p>Versión {catalog.revision || 'inicial'}.</p>
      {sections.map(({ key, label }) => <fieldset className="catalog-section" key={key} disabled={busy || demoMode}>
        <legend>{label}</legend>
        {options[key].map((value, index) => <div className="catalog-option" key={`${key}-${index}`}>
          <input aria-label={`${label}, opción ${index + 1}`} value={value} maxLength={80} disabled={key === 'debridement' && value === 'No realizado'} onChange={(event) => setSection(key, options[key].map((item, position) => position === index ? event.target.value : item))} />
          <button type="button" className="ghost" aria-label={`Subir ${value}`} disabled={index === 0} onClick={() => { const next = [...options[key]]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; setSection(key, next); }}>↑</button>
          <button type="button" className="ghost" aria-label={`Bajar ${value}`} disabled={index === options[key].length - 1} onClick={() => { const next = [...options[key]]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; setSection(key, next); }}>↓</button>
          <button type="button" className="ghost" disabled={key === 'debridement' && value === 'No realizado'} onClick={() => setSection(key, options[key].filter((_, position) => position !== index))}>Quitar</button>
        </div>)}
        <div className="catalog-option"><input aria-label={`Nueva opción de ${label}`} value={newValues[key] || ''} maxLength={80} placeholder="Nueva opción" onChange={(event) => setNewValues((previous) => ({ ...previous, [key]: event.target.value }))} /><button type="button" className="ghost" disabled={!newValues[key]?.trim() || options[key].length >= 30} onClick={() => { setSection(key, [...options[key], newValues[key]!.trim()]); setNewValues((previous) => ({ ...previous, [key]: '' })); }}>Agregar</button></div>
      </fieldset>)}
      <button type="button" className="primary" disabled={busy || demoMode} onClick={() => void save()}>Guardar catálogo del centro</button>
    </>}
  </section>;
}
