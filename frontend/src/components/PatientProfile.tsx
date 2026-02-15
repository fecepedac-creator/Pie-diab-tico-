
import React, { useState } from 'react';
import { Patient, Episode, UserRole, LabResult } from '../types';
import { formatDate, generateId } from '../utils';

interface PatientProfileProps {
  patient: Patient;
  episodes: Episode[];
  onSelectEpisode: (id: string) => void;
  onAddEpisode: (e: Episode) => void;
  role: UserRole;
  onUpdatePatient: (p: Patient) => void;
}

const PatientProfile: React.FC<PatientProfileProps> = ({ patient, episodes, onSelectEpisode, onAddEpisode, role, onUpdatePatient }) => {
  const [showAddEpisode, setShowAddEpisode] = useState(false);
  const [showAddLab, setShowAddLab] = useState(false);
  const [newLab, setNewLab] = useState<Partial<LabResult>>({
    date: new Date().toISOString().split('T')[0],
    albumin: undefined,
    vfg: undefined,
    pcr: undefined
  });

  const handleAddLab = (e: React.FormEvent) => {
    e.preventDefault();
    const lab: LabResult = { ...newLab as LabResult, id: generateId() };
    onUpdatePatient({ ...patient, labHistory: [...(patient.labHistory || []), lab] });
    setShowAddLab(false);
  };

  const toggleSocialSupport = () => {
    onUpdatePatient({
      ...patient,
      socialDeterminants: { ...patient.socialDeterminants, hasEffectiveSupport: !patient.socialDeterminants?.hasEffectiveSupport }
    });
  };

  const lastLab = patient.labHistory?.length ? patient.labHistory[patient.labHistory.length - 1] : null;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{patient.name}</h2>
            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold font-mono">{patient.rut}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAddLab(true)} className="text-sm bg-slate-100 px-3 py-2 rounded-lg font-bold text-slate-600 hover:bg-slate-200">
              <i className="fa-solid fa-flask mr-2"></i> Ingresar Laboratorio
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
             <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estado Nutricional y Renal</h4>
             <div className="grid grid-cols-2 gap-2">
                <div className={`p-3 rounded-lg border ${lastLab?.albumin && lastLab.albumin < 3 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                   <p className="text-[10px] font-bold text-slate-500">Albúmina</p>
                   <p className="text-lg font-bold">{lastLab?.albumin || '--'} <span className="text-xs">g/dL</span></p>
                </div>
                <div className={`p-3 rounded-lg border ${lastLab?.vfg && lastLab.vfg < 30 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                   <p className="text-[10px] font-bold text-slate-500">VFG (Creat)</p>
                   <p className="text-lg font-bold">{lastLab?.vfg || '--'} <span className="text-xs">ml/min</span></p>
                </div>
             </div>
          </div>

          <div className="space-y-4">
             <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Determinantes Sociales</h4>
             <div className={`p-4 rounded-xl border transition-all ${patient.socialDeterminants?.hasEffectiveSupport ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                <div className="flex justify-between items-center mb-2">
                   <span className="text-sm font-bold">Red de Apoyo</span>
                   <button onClick={toggleSocialSupport} className={`text-[10px] px-2 py-1 rounded font-bold text-white ${patient.socialDeterminants?.hasEffectiveSupport ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                      {patient.socialDeterminants?.hasEffectiveSupport ? 'SÍ' : 'NO'}
                   </button>
                </div>
                <p className="text-xs text-slate-600 italic">
                  {patient.socialDeterminants?.hasEffectiveSupport ? 'Cuenta con cuidador capacitado.' : 'Vive solo / Red inestable.'}
                </p>
             </div>
          </div>

          <div className="space-y-4">
             <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Metas de Control</h4>
             <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex justify-between text-xs mb-1"><span>HbA1c Meta: {patient.metabolicTargets.hba1c}</span> <span className="font-bold text-emerald-600">Cumple</span></div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden"><div className="bg-emerald-500 h-full w-[85%]"></div></div>
             </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-800">Historial de Episodios</h3>
        <button onClick={() => setShowAddEpisode(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-blue-700">
          <i className="fa-solid fa-plus mr-2"></i> Abrir Episodio
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {episodes.map(e => (
          <div key={e.id} onClick={() => onSelectEpisode(e.id)} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-blue-300 transition-all group">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">{e.side}{e.side === 'D' ? 'D' : 'I'}</div>
                <div>
                   <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{e.location}</h4>
                   <p className="text-xs text-slate-400">Iniciado: {formatDate(e.startDate)}</p>
                </div>
             </div>
             <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${e.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                {e.isActive ? 'Activo' : 'Cerrado'}
             </div>
          </div>
        ))}
        {episodes.length === 0 && (
          <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-dashed">
            No hay episodios registrados para este paciente.
          </div>
        )}
      </div>

      {showAddLab && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="text-lg font-bold mb-4">Ingresar Laboratorio</h3>
            <form onSubmit={handleAddLab} className="space-y-4">
               <div><label className="text-xs font-bold text-slate-500">Albúmina (g/dL)</label><input type="number" step="0.1" className="w-full p-2 border rounded" onChange={e => setNewLab({...newLab, albumin: Number(e.target.value)})} /></div>
               <div><label className="text-xs font-bold text-slate-500">VFG (ml/min)</label><input type="number" className="w-full p-2 border rounded" onChange={e => setNewLab({...newLab, vfg: Number(e.target.value)})} /></div>
               <div><label className="text-xs font-bold text-slate-500">PCR (mg/L)</label><input type="number" step="0.1" className="w-full p-2 border rounded" onChange={e => setNewLab({...newLab, pcr: Number(e.target.value)})} /></div>
               <div className="flex justify-end gap-2 pt-4">
                  <button type="button" onClick={() => setShowAddLab(false)} className="px-4 py-2 font-bold text-slate-400">Cancelar</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-bold">Guardar Lab</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientProfile;