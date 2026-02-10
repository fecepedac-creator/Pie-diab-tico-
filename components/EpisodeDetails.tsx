
import React, { useState } from 'react';
import { Episode, Patient, Visit, UserRole, SurgicalProcedure, MedicalDocument } from '../types';
import { formatDate, calculateWifi, generateId } from '../utils';
import PhotoComparison from './PhotoComparison';
import SurgicalReferralModal from './SurgicalReferralModal';

interface EpisodeDetailsProps {
  episode: Episode;
  patient: Patient;
  visits: Visit[];
  onNewVisit: () => void;
  onUpdateEpisode: (ep: Episode) => void;
  role: UserRole;
  onSendReferral: (content: string, epId: string, patId: string) => void;
  onOpenPresentation: () => void;
}

const EpisodeDetails: React.FC<EpisodeDetailsProps> = ({ episode, patient, visits, onNewVisit, onUpdateEpisode, role, onSendReferral, onOpenPresentation }) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'wifi' | 'proa' | 'surgical' | 'documents'>('timeline');
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [newDoc, setNewDoc] = useState<Partial<MedicalDocument>>({
    type: 'Epicrisis',
    title: '',
    content: ''
  });
  
  const sortedVisits = Array.isArray(visits) ? [...visits].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [];
  const lastVisit = sortedVisits[0];
  const wifi = calculateWifi(episode, lastVisit);

  const addProcedure = (proc: Partial<SurgicalProcedure>) => {
    const newProc: SurgicalProcedure = {
      ...proc as SurgicalProcedure,
      id: generateId(),
      date: new Date().toISOString(),
      specialistId: 'user-1',
      specialistRole: role
    };
    onUpdateEpisode({
      ...episode,
      procedures: [...(episode.procedures || []), newProc]
    });
  };

  const addDocument = (e: React.FormEvent) => {
    e.preventDefault();
    const doc: MedicalDocument = {
      ...newDoc as MedicalDocument,
      id: generateId(),
      date: new Date().toISOString(),
      authorRole: role
    };
    onUpdateEpisode({
      ...episode,
      documents: [...(episode.documents || []), doc]
    });
    setShowAddDoc(false);
    setNewDoc({ type: 'Epicrisis', title: '', content: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
             <span>{patient.name}</span>
             <i className="fa-solid fa-chevron-right text-[10px]"></i>
             <span className="font-bold text-slate-600">Episodio {episode.location}</span>
           </div>
           <h2 className="text-2xl font-bold text-slate-800">Gestión de Episodio: {episode.location}</h2>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={onOpenPresentation}
             className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-blue-700"
           >
             <i className="fa-solid fa-display mr-2"></i> Presentación de Caso
           </button>
           {role === UserRole.DOCTOR && (
             <button 
               onClick={() => setShowReferralModal(true)}
               className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-slate-900"
             >
               <i className="fa-solid fa-paper-plane mr-2"></i> Solicitar Evaluación Cx
             </button>
           )}
           <button 
             onClick={onNewVisit}
             className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-emerald-700"
           >
             <i className="fa-solid fa-plus mr-2"></i> Nueva Visita
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
         <div className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center text-center ${
           wifi.amputationRisk === 'Alto' ? 'bg-rose-50 border-rose-200' :
           wifi.amputationRisk === 'Moderado' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
         }`}>
            <span className="text-[10px] font-bold uppercase text-slate-500 mb-1">Score WIfI</span>
            <span className={`text-sm font-black ${
               wifi.amputationRisk === 'Alto' ? 'text-rose-700' :
               wifi.amputationRisk === 'Moderado' ? 'text-amber-700' : 'text-emerald-700'
            }`}>Riesgo {wifi.amputationRisk}</span>
         </div>

         <div className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center ${lastVisit?.atb.inCourse ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
            <span className="text-[10px] font-bold uppercase text-slate-500 mb-1">Antibiótico</span>
            <span className="text-xs font-bold text-blue-700">{lastVisit?.atb.inCourse ? lastVisit.atb.scheme : 'Sin ATB'}</span>
         </div>

         <div className={`p-4 rounded-xl border bg-slate-50 border-slate-100 flex flex-col items-center justify-center text-center ${episode.vascularStatus?.abi !== undefined && episode.vascularStatus.abi < 0.5 ? 'bg-rose-50 border-rose-200' : ''}`}>
            <span className="text-[10px] font-bold uppercase text-slate-500 mb-1">Perfusión (ABI)</span>
            <span className={`text-sm font-bold ${episode.vascularStatus?.abi !== undefined && episode.vascularStatus.abi < 0.5 ? 'text-rose-700' : ''}`}>{episode.vascularStatus?.abi || 'N/A'}</span>
         </div>

         <div className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center ${episode.strategy === 'Plan Amputación' ? 'bg-rose-100 border-rose-200' : 'bg-slate-50 border-slate-100'}`}>
            <span className="text-[10px] font-bold uppercase text-slate-500 mb-1">Estrategia</span>
            <span className="text-sm font-bold">{episode.strategy}</span>
         </div>
      </div>

      <div className="border-b border-slate-200 flex gap-6 overflow-x-auto">
        {[
          { id: 'timeline', label: 'Evolución', icon: 'fa-history' },
          { id: 'wifi', label: 'Score WIfI', icon: 'fa-chart-pie' },
          { id: 'proa', label: 'Microbiología', icon: 'fa-flask' },
          { id: 'surgical', label: 'Consola Quirúrgica', icon: 'fa-scalpel' },
          { id: 'documents', label: 'Documentos', icon: 'fa-file-medical' },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 text-sm font-bold flex items-center gap-2 whitespace-nowrap border-b-2 transition-all ${
              activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <i className={`fa-solid ${tab.icon}`}></i> {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white min-h-[400px]">
        {activeTab === 'timeline' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="lg:col-span-2 space-y-6">
                {sortedVisits.map((v) => (
                  <div key={v.id} className="relative pl-8 border-l-2 border-slate-100 pb-8 last:pb-0">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-white shadow-sm"></div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex gap-6">
                       <div className="w-24 h-24 bg-slate-200 rounded-lg overflow-hidden flex-shrink-0">
                          <img src={v.photoUrl} alt="Visit" className="w-full h-full object-cover" />
                       </div>
                       <div className="flex-1">
                          <p className="font-bold text-slate-800">{formatDate(v.date)} - {v.evolution}</p>
                          <p className="text-xs text-slate-500 mb-2 italic">"{v.plan}"</p>
                          <div className="flex gap-2">
                             {v.nursingTactics?.debridement && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">{v.nursingTactics.debridement}</span>}
                             {v.nursingTactics?.advancedTherapies.map(at => <span key={at} className="text-[9px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-bold">{at}</span>)}
                          </div>
                       </div>
                    </div>
                  </div>
                ))}
                {sortedVisits.length === 0 && (
                  <div className="p-12 text-center text-slate-400 italic">No hay visitas registradas aún.</div>
                )}
             </div>
             <div className="space-y-4">
                <h4 className="font-bold text-slate-800 text-sm uppercase">Procedimientos Quirúrgicos</h4>
                <div className="space-y-2">
                   {episode.procedures?.map(p => (
                     <div key={p.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1">
                           <span>{formatDate(p.date)}</span>
                           <span>{p.type}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-800">{p.description}</p>
                     </div>
                   ))}
                   {(!episode.procedures || episode.procedures.length === 0) && (
                     <p className="text-xs text-slate-400 text-center italic py-4">Sin registros quirúrgicos</p>
                   )}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="p-6 space-y-6">
             <div className="flex justify-between items-center">
                <h4 className="font-bold text-slate-800">Archivo de Reportes y Protocolos</h4>
                <button onClick={() => setShowAddDoc(true)} className="text-sm bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-100 transition-colors">
                   <i className="fa-solid fa-file-arrow-up mr-2"></i> Subir Documento
                </button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {episode.documents?.map(doc => (
                  <div key={doc.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors shadow-sm">
                     <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded bg-slate-500 uppercase">{doc.type}</span>
                        <span className="text-[10px] font-medium text-slate-400">{formatDate(doc.date)}</span>
                     </div>
                     <h5 className="font-bold text-slate-800 mb-1">{doc.title}</h5>
                     <p className="text-xs text-slate-500 line-clamp-3 mb-3">{doc.content}</p>
                     <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 italic">Por: {doc.authorRole}</span>
                        <button className="text-blue-600 text-[10px] font-bold hover:underline">Ver completo</button>
                     </div>
                  </div>
                ))}
                {(!episode.documents || episode.documents.length === 0) && (
                   <div className="md:col-span-2 p-12 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                      <p className="text-slate-400 italic">No hay documentos cargados en este episodio.</p>
                   </div>
                )}
             </div>

             {showAddDoc && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                   <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6">
                      <h3 className="text-xl font-bold mb-4">Cargar Documento Médico</h3>
                      <form onSubmit={addDocument} className="space-y-4">
                         <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Tipo de Documento</label>
                            <select 
                               className="w-full border rounded p-2 text-sm"
                               value={newDoc.type}
                               onChange={e => setNewDoc({...newDoc, type: e.target.value as any})}
                            >
                               <option value="Epicrisis">Epicrisis</option>
                               <option value="Protocolo Operatorio">Protocolo Operatorio</option>
                               <option value="Informe de Alta">Informe de Alta</option>
                               <option value="Interconsulta">Interconsulta</option>
                               <option value="Otros">Otros</option>
                            </select>
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Título del Documento</label>
                            <input 
                               required
                               placeholder="Ej: Epicrisis Hospitalización Mayo 2024"
                               className="w-full border rounded p-2 text-sm"
                               value={newDoc.title}
                               onChange={e => setNewDoc({...newDoc, title: e.target.value})}
                            />
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Resumen / Contenido</label>
                            <textarea 
                               required
                               placeholder="Extraiga los puntos clave o copie el contenido aquí..."
                               className="w-full border rounded p-2 text-sm"
                               rows={6}
                               value={newDoc.content}
                               onChange={e => setNewDoc({...newDoc, content: e.target.value})}
                            />
                         </div>
                         <div className="flex justify-end gap-3 pt-4 border-t">
                            <button type="button" onClick={() => setShowAddDoc(false)} className="px-4 py-2 font-bold text-slate-500">Cancelar</button>
                            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded font-bold">Guardar Documento</button>
                         </div>
                      </form>
                   </div>
                </div>
             )}
          </div>
        )}

        {activeTab === 'surgical' && (
          <div className="p-6 space-y-8 bg-slate-50 rounded-xl border border-slate-200">
             {role === UserRole.VASCULAR && (
                <div className="space-y-6">
                   <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      <i className="fa-solid fa-heart-pulse text-rose-500"></i> Módulo de Perfusión Vascular
                   </h4>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                         <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Índice Tobillo-Brazo (ABI)</label>
                         <div className="flex gap-2">
                            <input 
                              type="number" step="0.01" 
                              className="w-full p-2 border rounded text-sm font-bold"
                              value={episode.vascularStatus?.abi || ''}
                              onChange={e => onUpdateEpisode({...episode, vascularStatus: {...episode.vascularStatus, abi: Number(e.target.value)}})}
                            />
                            <button className="bg-blue-600 text-white px-3 rounded"><i className="fa-solid fa-check"></i></button>
                         </div>
                         <p className="text-[10px] text-slate-400 mt-2 italic">Valores < 0.5 sugieren isquemia crítica.</p>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                         <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Decisión Táctica</label>
                         <select 
                           className="w-full p-2 border rounded text-sm font-bold"
                           value={episode.vascularStatus?.revascularizable}
                           onChange={e => onUpdateEpisode({...episode, vascularStatus: {...episode.vascularStatus, revascularizable: e.target.value as any}})}
                         >
                            <option value="En estudio">En estudio</option>
                            <option value="Sí">Sí - Revascularizable</option>
                            <option value="No">No - Fuera de alcance</option>
                         </select>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                         <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Pulsos DP / PT</label>
                         <div className="grid grid-cols-2 gap-2">
                            <input 
                              placeholder="DP" className="p-2 border rounded text-xs"
                              value={episode.vascularStatus?.pulses.dp || ''}
                              onChange={e => onUpdateEpisode({...episode, vascularStatus: {...episode.vascularStatus, pulses: {...episode.vascularStatus.pulses, dp: e.target.value}}})}
                            />
                            <input 
                              placeholder="PT" className="p-2 border rounded text-xs"
                              value={episode.vascularStatus?.pulses.pt || ''}
                              onChange={e => onUpdateEpisode({...episode, vascularStatus: {...episode.vascularStatus, pulses: {...episode.vascularStatus.pulses, pt: e.target.value}}})}
                            />
                         </div>
                      </div>
                   </div>
                   <div>
                      <p className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wider">Procedimientos Vasculares Rápidos</p>
                      <div className="flex flex-wrap gap-2">
                         {['ATP / Angioplastia', 'Bypass Fémoro-Poplíteo', 'Bypass Distal', 'Trombectomía'].map(t => (
                           <button 
                            key={t}
                            onClick={() => addProcedure({type: 'Vascular', description: t})}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm"
                           >
                              {t}
                           </button>
                         ))}
                      </div>
                   </div>
                </div>
             )}

             {role === UserRole.SURGERY && (
                <div className="space-y-6">
                   <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      <i className="fa-solid fa-vial text-blue-500"></i> Monitor de Infección y Salvataje
                   </h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                         <p className="text-xs font-bold text-slate-400 uppercase mb-4">Curvas Bioquímicas Recientes</p>
                         <div className="space-y-3">
                            {patient.labHistory?.slice(-3).map(lab => (
                              <div key={lab.id} className="flex justify-between items-center text-sm border-b pb-1">
                                 <span className="text-slate-500">{formatDate(lab.date)}</span>
                                 <span className="font-bold">PCR: {lab.pcr || '--'}</span>
                                 <span className="font-bold">VHS: {lab.vhs || '--'}</span>
                              </div>
                            ))}
                         </div>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                         <p className="text-xs font-bold text-slate-400 uppercase mb-4">Hitos de Cirugía General</p>
                         <div className="grid grid-cols-2 gap-2">
                            {['Aseo Quirúrgico', 'Biopsia Ósea', 'Amputación Menor', 'Injerto / Colgajo'].map(t => (
                              <button 
                                key={t}
                                onClick={() => addProcedure({type: 'General', description: t})}
                                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold hover:bg-emerald-50 hover:border-emerald-300 transition-all"
                              >
                                 {t}
                              </button>
                            ))}
                         </div>
                      </div>
                   </div>
                   <div className={`p-4 rounded-xl border-2 flex flex-col md:flex-row items-center justify-between gap-4 ${episode.strategy === 'Plan Amputación' ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100'}`}>
                      <div>
                         <p className="text-sm font-bold text-slate-800">Estrategia Actual: {episode.strategy}</p>
                         <p className="text-[10px] text-slate-500">Si se activa "Plan Amputación", el sistema vigilará el deterioro reincidente.</p>
                      </div>
                      <select 
                        className="bg-white border rounded p-2 text-xs font-bold"
                        value={episode.strategy}
                        onChange={e => onUpdateEpisode({...episode, strategy: e.target.value as any})}
                      >
                         <option value="Salvataje">Salvataje</option>
                         <option value="Paliativo">Paliativo</option>
                         <option value="Plan Amputación">Plan Amputación</option>
                      </select>
                   </div>
                </div>
             )}

             {role !== UserRole.SURGERY && role !== UserRole.VASCULAR && (
                <div className="p-12 text-center">
                   <i className="fa-solid fa-lock text-slate-300 text-4xl mb-4"></i>
                   <p className="text-slate-400 font-medium">Consola quirúrgica restringida a Cirujanos Especialistas.</p>
                </div>
             )}
          </div>
        )}
      </div>

      {showReferralModal && (
        <SurgicalReferralModal 
          patient={patient} 
          episode={episode} 
          visits={visits} 
          wifi={wifi}
          onClose={() => setShowReferralModal(false)} 
          onConfirm={(report) => {
            onSendReferral(report, episode.id, patient.id);
            setShowReferralModal(false);
          }}
        />
      )}
    </div>
  );
};

export default EpisodeDetails;