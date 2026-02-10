
import React, { useState } from 'react';
import { Visit, UserRole } from '../types';
import { formatDate, generateId } from '../utils';

interface WeeklyVisitFormProps {
  episodeId: string;
  lastVisit?: Visit;
  onSubmit: (v: Visit) => void;
  onCancel: () => void;
  role: UserRole;
}

const WeeklyVisitForm: React.FC<WeeklyVisitFormProps> = ({ episodeId, lastVisit, onSubmit, onCancel, role }) => {
  const [showOther, setShowOther] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Visit>>({
    date: new Date().toISOString().split('T')[0],
    photoUrl: `https://picsum.photos/seed/${Math.random()}/600/400`,
    evolution: 'Igual',
    size: lastVisit?.size || { length: 0, width: 0, depth: 0 },
    infectionToday: { has: false },
    plan: '',
    atb: lastVisit?.atb || { inCourse: false },
    // Fix: resultStatus is a required property of the culture object in the Visit interface.
    culture: { taken: false, resultStatus: 'No tomado' },
    isClinicalAlert: false,
    nursingTactics: {
      cleaning: '',
      debridement: '',
      dressings: [],
      advancedTherapies: [],
      otherTechnique: ''
    },
    responsiblePlan: role
  });

  const checkConsecutiveWorse = () => {
    return lastVisit?.evolution === 'Peor' && formData.evolution === 'Peor';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.photoUrl) return alert('La captura fotográfica es OBLIGATORIA para continuar.');
    
    if (checkConsecutiveWorse()) {
      const confirm = window.confirm('ALERTA: Es la SEGUNDA evolución "Peor" consecutiva. El flujo se bloqueará para revisión del Médico Internista. ¿Desea confirmar el registro?');
      if (!confirm) return;
    }

    const visit: Visit = {
      ...formData as Visit,
      id: generateId(),
      episodeId,
      professionalId: 'user-1',
      professionalRole: role,
    };
    onSubmit(visit);
  };

  const toggleArrayItem = (field: 'dressings' | 'advancedTherapies', value: string) => {
    const current = formData.nursingTactics?.[field] || [];
    const updated = current.includes(value) 
      ? current.filter(x => x !== value) 
      : [...current, value];
    setFormData({
      ...formData,
      nursingTactics: { ...formData.nursingTactics!, [field]: updated }
    });
  };

  const setTactic = (field: 'cleaning' | 'debridement', value: string) => {
    setFormData({
      ...formData,
      nursingTactics: { ...formData.nursingTactics!, [field]: value }
    });
  };

  const SelectionButton = ({ label, active, onClick, color = 'blue' }: any) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all ${
        active 
        ? (color === 'blue' ? 'bg-blue-600 border-blue-700 text-white shadow-sm' :
           color === 'emerald' ? 'bg-emerald-600 border-emerald-700 text-white shadow-sm' :
           color === 'amber' ? 'bg-amber-600 border-amber-700 text-white shadow-sm' :
           color === 'indigo' ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm' :
           color === 'violet' ? 'bg-violet-600 border-violet-700 text-white shadow-sm' :
           'bg-slate-600 border-slate-700 text-white shadow-sm')
        : `bg-white border-slate-200 text-slate-600 hover:bg-slate-50`
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <div className="p-6 border-b border-slate-100 bg-emerald-50 flex justify-between items-center">
           <div>
              <h3 className="text-xl font-bold text-emerald-900">Curación Avanzada - Registro Táctico</h3>
              <p className="text-sm text-emerald-700 font-medium">Eficiencia operativa: Foco en enfermería clínica</p>
           </div>
           <div className="text-emerald-800 font-bold bg-white px-3 py-1 rounded-full text-sm shadow-sm">
             {role}
           </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
           
           {/* SECCIÓN FOTOGRÁFICA COMPARATIVA */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                 <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Control Anterior ({lastVisit ? formatDate(lastVisit.date) : 'N/A'})</p>
                 <div className="aspect-video bg-slate-200 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
                    {lastVisit ? (
                      <img src={lastVisit.photoUrl} className="w-full h-full object-cover" alt="Anterior" />
                    ) : (
                      <span className="text-slate-400 text-xs italic">Sin registros previos</span>
                    )}
                 </div>
              </div>
              <div className="relative">
                 <p className="text-[10px] font-black uppercase text-blue-500 mb-2">Captura Actual (Obligatoria *)</p>
                 <div className="aspect-video bg-white border-2 border-dashed border-blue-200 rounded-xl overflow-hidden relative group cursor-pointer hover:border-blue-400 transition-all">
                    <img src={formData.photoUrl} className="absolute inset-0 w-full h-full object-cover opacity-30" alt="Preview" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                       <i className="fa-solid fa-camera text-3xl text-blue-400 group-hover:scale-110 transition-transform"></i>
                       <span className="text-[10px] font-bold text-blue-500 mt-2 uppercase tracking-wider">Tomar Foto Herida</span>
                    </div>
                 </div>
              </div>
           </div>

           {/* NÚCLEO MÍNIMO CLÍNICO */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-3">Evolución Clínica</label>
                <div className="flex gap-3">
                  {['Mejor', 'Igual', 'Peor'].map(evo => (
                    <button 
                      key={evo}
                      type="button"
                      onClick={() => setFormData({...formData, evolution: evo as any})}
                      className={`flex-1 py-3 rounded-xl font-black border transition-all ${
                        formData.evolution === evo 
                        ? (evo === 'Mejor' ? 'bg-emerald-500 border-emerald-600 text-white shadow-lg' :
                           evo === 'Igual' ? 'bg-blue-500 border-blue-600 text-white shadow-lg' :
                           'bg-rose-50 border-rose-600 text-white shadow-lg')
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {evo}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                 <label className="flex items-center gap-2 cursor-pointer font-bold text-rose-700 mb-2">
                   <input 
                     type="checkbox" 
                     checked={formData.isClinicalAlert}
                     onChange={e => setFormData({...formData, isClinicalAlert: e.target.checked})}
                   />
                   <i className="fa-solid fa-triangle-exclamation"></i> Alerta Clínica
                 </label>
                 <p className="text-[10px] text-slate-500 leading-tight">Activar para notificar directamente al Médico Internista por sospecha de deterioro.</p>
              </div>
           </div>

           {/* FORMULARIO TÁCTICO ENFERMERÍA (Botones rápidos) */}
           <div className="space-y-6 pt-6 border-t border-slate-100">
              
              <div>
                 <p className="text-xs font-black uppercase text-slate-400 mb-3">1. Técnica de Limpieza</p>
                 <div className="flex flex-wrap gap-2">
                    {['Duchoterapia', 'Lavado SF', 'Ringer Lactato'].map(t => (
                      <SelectionButton 
                        key={t} label={t} 
                        active={formData.nursingTactics?.cleaning === t} 
                        onClick={() => setTactic('cleaning', t)}
                        color="emerald"
                      />
                    ))}
                 </div>
              </div>

              <div>
                 <p className="text-xs font-black uppercase text-slate-400 mb-3">2. Debridamiento</p>
                 <div className="flex flex-wrap gap-2">
                    {['Mecánico/Curetaje', 'Autolítico/Hidrogel', 'Enzimático', 'Quirúrgico'].map(t => (
                      <SelectionButton 
                        key={t} label={t} 
                        active={formData.nursingTactics?.debridement === t} 
                        onClick={() => setTactic('debridement', t)}
                        color="amber"
                      />
                    ))}
                 </div>
              </div>

              <div>
                 <p className="text-xs font-black uppercase text-slate-400 mb-3">3. Clasificación de Apósitos (INH)</p>
                 <div className="space-y-3">
                    <div>
                       <span className="text-[10px] font-bold text-slate-500 block mb-1">Pasivos</span>
                       <div className="flex flex-wrap gap-2">
                          {['Gasa', 'Apósito Tradicional', 'Espuma Poliuretano'].map(t => (
                            <SelectionButton 
                              key={t} label={t} 
                              active={formData.nursingTactics?.dressings.includes(t)} 
                              onClick={() => toggleArrayItem('dressings', t)}
                            />
                          ))}
                       </div>
                    </div>
                    <div>
                       <span className="text-[10px] font-bold text-slate-500 block mb-1">Activos / Bioactivos</span>
                       <div className="flex flex-wrap gap-2">
                          {['Alginatos', 'Hidrocoloide', 'Plata', 'PHMB', 'Colágeno'].map(t => (
                            <SelectionButton 
                              key={t} label={t} 
                              active={formData.nursingTactics?.dressings.includes(t)} 
                              onClick={() => toggleArrayItem('dressings', t)}
                              color="indigo"
                            />
                          ))}
                       </div>
                    </div>
                 </div>
              </div>

              <div>
                 <p className="text-xs font-black uppercase text-slate-400 mb-3">4. Terapias Avanzadas y Regenerativas</p>
                 <div className="flex flex-wrap gap-2">
                    {['Miel Médica', 'PRP', 'Parche Leucocitos', 'Presión Negativa'].map(t => (
                      <SelectionButton 
                        key={t} label={t} 
                        active={formData.nursingTactics?.advancedTherapies.includes(t)} 
                        onClick={() => toggleArrayItem('advancedTherapies', t)}
                        color="violet"
                      />
                    ))}
                    <button 
                      type="button"
                      onClick={() => setShowOther(!showOther)}
                      className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all ${
                        showOther ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'
                      }`}
                    >
                      {showOther ? 'Ocultar Otros' : 'Otros...'}
                    </button>
                 </div>
                 {showOther && (
                    <input 
                      type="text"
                      className="mt-3 w-full border-slate-200 border rounded-lg p-2 text-sm"
                      placeholder="Especifique otra técnica..."
                      value={formData.nursingTactics?.otherTechnique}
                      onChange={e => setFormData({
                        ...formData,
                        nursingTactics: { ...formData.nursingTactics!, otherTechnique: e.target.value }
                      })}
                    />
                 )}
              </div>
           </div>

           <div className="pt-6 border-t border-slate-100">
              <label className="block text-sm font-bold text-slate-700 mb-2">Plan de Trabajo y Observaciones</label>
              <textarea 
                required
                className="w-full border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                rows={4}
                value={formData.plan}
                onChange={e => setFormData({...formData, plan: e.target.value})}
                placeholder="Describa el plan de curación y recomendaciones para el paciente..."
              />
           </div>

           <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
              <button 
                type="button"
                onClick={onCancel}
                className="px-8 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="px-10 py-3 bg-blue-600 text-white font-black rounded-xl shadow-lg hover:bg-blue-700 shadow-blue-200 transition-all active:scale-95 flex items-center gap-2"
              >
                <i className="fa-solid fa-floppy-disk"></i> GUARDAR REGISTRO
              </button>
           </div>
        </form>
      </div>
    </div>
  );
};

export default WeeklyVisitForm;
