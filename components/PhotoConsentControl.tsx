import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Membership, Patient, WoundEpisode } from '../types';
import { formatDateTime } from '../utils';
import { hasRole } from '../permissions';
import './photo-consent-control.css';

type Props = {
  centerId: string;
  episode: WoundEpisode;
  membership: Membership;
  patient: Patient;
  onRefresh: () => Promise<void>;
  demoMode?: boolean;
};

export default function PhotoConsentControl({ centerId, episode, membership, patient, onRefresh, demoMode = false }: Props) {
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { setVerified(false); setMessage(''); }, [episode.id]);
  const canManage = hasRole(membership, ['coordinator', 'nurse', 'doctor']) ||
    (membership.roles.includes('tens') && patient.intakeAssignedToUid === membership.uid);
  const status = episode.consentForPhotography ? 'Registrado' : episode.photoConsentLastDecision === 'withdrawn' ? 'Retirado' : 'Pendiente';

  const save = async (consentForPhotography: boolean) => {
    setBusy(true);
    setMessage('');
    try {
      await api.updateEpisode(centerId, episode.id, { consentForPhotography });
      await onRefresh();
      setVerified(false);
      setMessage(consentForPhotography ? 'Consentimiento fotográfico registrado.' : 'Retiro registrado. Se bloquearon las nuevas fotografías.');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'No fue posible actualizar el consentimiento.');
    } finally {
      setBusy(false);
    }
  };

  return <div className="photo-consent-control">
    <div>
      <strong>Consentimiento para fotografías de la herida: {status}</strong>
      {episode.photoConsentUpdatedAt && <small>Último cambio: {formatDateTime(episode.photoConsentUpdatedAt)} · {episode.photoConsentUpdatedByName || 'equipo clínico'}</small>}
      <p className="helper">{episode.consentForPhotography ? 'Se permiten nuevas fotografías de esta herida mientras el consentimiento siga vigente.' : 'No se pueden añadir fotografías de esta herida.'} Las fotos anteriores permanecen en el registro.</p>
    </div>
    {canManage && !demoMode && (episode.consentForPhotography ?
      <button type="button" className="ghost" disabled={busy} onClick={() => void save(false)}>Registrar retiro del consentimiento</button> :
      <div className="photo-consent-actions">
        <label className="check"><input type="checkbox" checked={verified} onChange={(event) => setVerified(event.target.checked)} disabled={busy} /> Verifiqué que existe consentimiento firmado para fotografiar esta herida.</label>
        <button type="button" className="primary" disabled={busy || !verified} onClick={() => void save(true)}>Registrar consentimiento</button>
      </div>)}
    {message && <p role="status" className="helper">{message}</p>}
  </div>;
}
