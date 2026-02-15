
import React, { useState, useRef } from 'react';
import { Visit, UserRole, Patient, LabResult } from '../types';
import { formatDate, generateId } from '../utils';
import { api } from '../services/api';

interface WeeklyVisitFormProps {
  episodeId: string;
  lastVisit?: Visit;
  onSubmit: (v: Visit, updatedPatient?: Patient) => void;
  onCancel: () => void;
  role: UserRole;
  authToken?: string | null;
  patient: Patient;
}

// Componente de Tooltip para historial de laboratorio
const LabHistoryTooltip: React.FC<{
  fieldName: string;
  fieldKey: keyof LabResult;
  labHistory: LabResult[];
  children: React.ReactNode;
}> = ({ fieldName, fieldKey, labHistory, children }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const relevantHistory = labHistory
    .filter(lab => lab[fieldKey] !== undefined && lab[fieldKey] !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="relative">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {children}
      </div>
      {showTooltip && relevantHistory.length > 0 && (
        <div className="absolute z-50 bottom-full left-0 mb-2 w-64 bg-slate-800 text-white text-xs rounded-lg shadow-xl p-3 animate-fade-in">
          <div className="font-bold text-amber-400 mb-2 flex items-center gap-2">
            <i className="fa-solid fa-clock-rotate-left"></i>
            Historial de {fieldName}
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {relevantHistory.map((lab, idx) => (
              <div key={lab.id || idx} className="flex justify-between items-center border-b border-slate-700 pb-1 last:border-0">
                <span className="text-slate-400">{formatDate(lab.date)}</span>
                <span className="font-bold text-emerald-400">{lab[fieldKey]}</span>
              </div>
            ))}
          </div>
          {relevantHistory.length === 0 && (
            <p className="text-slate-400 italic">Sin registros previos</p>
          )}
          <div className="absolute -bottom-2 left-4 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-slate-800"></div>
        </div>
      )}
    </div>
  );
};

const WeeklyVisitForm: React.FC<WeeklyVisitFormProps> = ({ episodeId, lastVisit, onSubmit, onCancel, role, authToken, patient }) => {
  const [showOther, setShowOther] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  
  const isDoctor = role === UserRole.DOCTOR;
  const isNurse = role === UserRole.NURSE;

  const [formData, setFormData] = useState<Partial<Visit>>({
    date: new Date().toISOString().split('T')[0],
    photoUrl: '',
    evolution: 'Igual',
    size: lastVisit?.size || { length: 0, width: 0, depth: 0 },
    infectionToday: { has: false },
    plan: '',
    atb: lastVisit?.atb || { inCourse: false },
    culture: { taken: false, resultStatus: 'No tomado' },
    isClinicalAlert: false,
    nursingTactics: {
      cleaning: '',
      debridement: '',
      dressings: [],
      advancedTherapies: [],
      otherTechnique: ''
    },
    labResults: {
      date: new Date().toISOString().split('T')[0],
      albumin: undefined,
      vfg: undefined,
      pcr: undefined,
      vhs: undefined,
      leucocitos: undefined,
      hba1c: undefined
    },
    responsiblePlan: role
  });

  const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handlePhotoUpload = async (file?: File) => {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    if (authToken) {
      try {
        const uploaded = await api.uploadPhoto(authToken, dataUrl, file.name);
        setFormData(prev => ({ ...prev, photoUrl: uploaded.url }));
        return;
      } catch (e) {
        // fallback local data url
      }
    }
    setFormData(prev => ({ ...prev, photoUrl: dataUrl }));
  };

  const checkConsecutiveWorse = () => {
    return lastVisit?.evolution === 'Peor' && formData.evolution === 'Peor';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Solo enfermería requiere foto obligatoria
    if (isNurse && !formData.photoUrl) {
      return alert('La captura fotográfica es OBLIGATORIA para continuar.');
    }
    
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

    // Si es médico y hay datos de laboratorio, actualizar el historial del paciente
    let updatedPatient: Patient | undefined;
    if (isDoctor && formData.labResults?.date) {
      const hasLabData = formData.labResults.albumin || formData.labResults.vfg || 
                         formData.labResults.pcr || formData.labResults.vhs || 
                         formData.labResults.leucocitos || formData.labResults.hba1c;
      
      if (hasLabData) {
        const newLabResult: LabResult = {
          id: generateId(),
          date: formData.labResults.date,
          albumin: formData.labResults.albumin,
          vfg: formData.labResults.vfg,
          pcr: formData.labResults.pcr,
          vhs: formData.labResults.vhs,
          leucocitos: formData.labResults.leucocitos,
          hba1c: formData.labResults.hba1c
        };
        
        updatedPatient = {
          ...patient,
          labHistory: [...(patient.labHistory || []), newLabResult]
        };
      }
    }

    onSubmit(visit, updatedPatient);
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

  const setLabResult = (field: keyof typeof formData.labResults, value: number | string | undefined) => {
    setFormData({
      ...formData,
      labResults: { ...formData.labResults!, [field]: value }
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

  // Formulario para Médico
  if (isDoctor) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
          <div className="p-6 border-b border-slate-100 bg-blue-50 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-blue-900">Evaluación Médica - {patient.name}</h3>
              <p className="text-sm text-blue-700 font-medium">Control clínico y seguimiento metabólico</p>
            </div>
            <div className="text-blue-800 font-bold bg-white px-3 py-1 rounded-full text-sm shadow-sm">
              {role}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            
            {/* Fecha de Visita */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Fecha de Evaluación</label>
                <input 
                  type="date"
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Evolución Clínica</label>
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
                           'bg-rose-500 border-rose-600 text-white shadow-lg')
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {evo}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sección de Exámenes de Laboratorio */}
            <div className="space-y-4 p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                    <i className="fa-solid fa-flask text-white"></i>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">Exámenes de Laboratorio</h4>
                    <p className="text-xs text-slate-500">Pase el cursor sobre cada campo para ver el historial</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-600">Fecha de exámenes:</label>
                  <input 
                    type="date"
                    className="border border-amber-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-amber-400 outline-none"
                    value={formData.labResults?.date || ''}
                    onChange={e => setLabResult('date', e.target.value)}
                    data-testid="lab-date-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4">
                <LabHistoryTooltip fieldName="Albúmina" fieldKey="albumin" labHistory={patient.labHistory || []}>
                  <div className="bg-white rounded-xl p-3 border border-slate-200 hover:border-amber-400 transition-all cursor-help">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Albúmina (g/dL)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      className="w-full text-lg font-bold text-slate-800 border-0 p-0 focus:ring-0 bg-transparent"
                      placeholder="--"
                      value={formData.labResults?.albumin || ''}
                      onChange={e => setLabResult('albumin', e.target.value ? Number(e.target.value) : undefined)}
                      data-testid="lab-albumin-input"
                    />
                  </div>
                </LabHistoryTooltip>

                <LabHistoryTooltip fieldName="VFG" fieldKey="vfg" labHistory={patient.labHistory || []}>
                  <div className="bg-white rounded-xl p-3 border border-slate-200 hover:border-amber-400 transition-all cursor-help">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">VFG (mL/min)</label>
                    <input 
                      type="number"
                      className="w-full text-lg font-bold text-slate-800 border-0 p-0 focus:ring-0 bg-transparent"
                      placeholder="--"
                      value={formData.labResults?.vfg || ''}
                      onChange={e => setLabResult('vfg', e.target.value ? Number(e.target.value) : undefined)}
                      data-testid="lab-vfg-input"
                    />
                  </div>
                </LabHistoryTooltip>

                <LabHistoryTooltip fieldName="PCR" fieldKey="pcr" labHistory={patient.labHistory || []}>
                  <div className="bg-white rounded-xl p-3 border border-slate-200 hover:border-amber-400 transition-all cursor-help">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">PCR (mg/L)</label>
                    <input 
                      type="number"
                      className="w-full text-lg font-bold text-slate-800 border-0 p-0 focus:ring-0 bg-transparent"
                      placeholder="--"
                      value={formData.labResults?.pcr || ''}
                      onChange={e => setLabResult('pcr', e.target.value ? Number(e.target.value) : undefined)}
                      data-testid="lab-pcr-input"
                    />
                  </div>
                </LabHistoryTooltip>

                <LabHistoryTooltip fieldName="VHS" fieldKey="vhs" labHistory={patient.labHistory || []}>
                  <div className="bg-white rounded-xl p-3 border border-slate-200 hover:border-amber-400 transition-all cursor-help">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">VHS (mm/h)</label>
                    <input 
                      type="number"
                      className="w-full text-lg font-bold text-slate-800 border-0 p-0 focus:ring-0 bg-transparent"
                      placeholder="--"
                      value={formData.labResults?.vhs || ''}
                      onChange={e => setLabResult('vhs', e.target.value ? Number(e.target.value) : undefined)}
                      data-testid="lab-vhs-input"
                    />
                  </div>
                </LabHistoryTooltip>

                <LabHistoryTooltip fieldName="Leucocitos" fieldKey="leucocitos" labHistory={patient.labHistory || []}>
                  <div className="bg-white rounded-xl p-3 border border-slate-200 hover:border-amber-400 transition-all cursor-help">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Leucocitos (/µL)</label>
                    <input 
                      type="number"
                      className="w-full text-lg font-bold text-slate-800 border-0 p-0 focus:ring-0 bg-transparent"
                      placeholder="--"
                      value={formData.labResults?.leucocitos || ''}
                      onChange={e => setLabResult('leucocitos', e.target.value ? Number(e.target.value) : undefined)}
                      data-testid="lab-leucocitos-input"
                    />
                  </div>
                </LabHistoryTooltip>

                <LabHistoryTooltip fieldName="HbA1c" fieldKey="hba1c" labHistory={patient.labHistory || []}>
                  <div className="bg-white rounded-xl p-3 border border-slate-200 hover:border-amber-400 transition-all cursor-help">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">HbA1c (%)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      className="w-full text-lg font-bold text-slate-800 border-0 p-0 focus:ring-0 bg-transparent"
                      placeholder="--"
                      value={formData.labResults?.hba1c || ''}
                      onChange={e => setLabResult('hba1c', e.target.value ? Number(e.target.value) : undefined)}
                      data-testid="lab-hba1c-input"
                    />
                  </div>
                </LabHistoryTooltip>
              </div>
            </div>

            {/* Evaluación de Infección */}
            <div className="space-y-4 p-6 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center">
                  <i className="fa-solid fa-virus text-white"></i>
                </div>
                <h4 className="font-bold text-slate-800">Evaluación de Infección</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input 
                      type="checkbox" 
                      checked={formData.infectionToday?.has}
                      onChange={e => setFormData({...formData, infectionToday: {...formData.infectionToday!, has: e.target.checked}})}
                      className="w-5 h-5 rounded"
                    />
                    <span className="font-bold text-slate-700">Infección presente</span>
                  </label>
                  
                  {formData.infectionToday?.has && (
                    <select 
                      className="w-full border border-slate-200 rounded-lg p-3 text-sm"
                      value={formData.infectionToday?.severity || ''}
                      onChange={e => setFormData({...formData, infectionToday: {...formData.infectionToday!, severity: e.target.value as any}})}
                    >
                      <option value="">Seleccionar severidad...</option>
                      <option value="Grado 1 (Limpia)">Grado 1 (Limpia)</option>
                      <option value="Grado 2 (Leve)">Grado 2 (Leve)</option>
                      <option value="Grado 3 (Moderada)">Grado 3 (Moderada)</option>
                      <option value="Grado 4 (Severa/Sepsis)">Grado 4 (Severa/Sepsis)</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input 
                      type="checkbox" 
                      checked={formData.atb?.inCourse}
                      onChange={e => setFormData({...formData, atb: {...formData.atb!, inCourse: e.target.checked}})}
                      className="w-5 h-5 rounded"
                    />
                    <span className="font-bold text-slate-700">Antibiótico en curso</span>
                  </label>
                  
                  {formData.atb?.inCourse && (
                    <input 
                      type="text"
                      className="w-full border border-slate-200 rounded-lg p-3 text-sm"
                      placeholder="Esquema ATB..."
                      value={formData.atb?.scheme || ''}
                      onChange={e => setFormData({...formData, atb: {...formData.atb!, scheme: e.target.value}})}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Foto (Opcional para médico) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Control Anterior ({lastVisit ? formatDate(lastVisit.date) : 'N/A'})</p>
                <div className="aspect-video bg-slate-200 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
                  {lastVisit?.photoUrl ? (
                    <img src={lastVisit.photoUrl} className="w-full h-full object-cover" alt="Anterior" />
                  ) : (
                    <span className="text-slate-400 text-xs italic">Sin registros previos</span>
                  )}
                </div>
              </div>
              <div className="relative">
                <p className="text-[10px] font-black uppercase text-blue-500 mb-2">Captura Actual (Opcional)</p>
                <div className="aspect-video bg-white border-2 border-dashed border-blue-200 rounded-xl overflow-hidden relative group cursor-pointer hover:border-blue-400 transition-all">
                  {formData.photoUrl && <img src={formData.photoUrl} className="absolute inset-0 w-full h-full object-cover" alt="Preview" />}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <i className="fa-solid fa-camera text-3xl text-blue-400 group-hover:scale-110 transition-transform"></i>
                    <span className="text-[10px] font-bold text-blue-500 mt-2 uppercase tracking-wider">Subir Foto</span>
                  </div>
                </div>
                <input type="file" accept="image/*" className="mt-3 text-xs" onChange={e => handlePhotoUpload(e.target.files?.[0])} />
              </div>
            </div>

            {/* Alerta Clínica */}
            <div className="bg-rose-50 p-4 rounded-xl border border-rose-200">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-rose-700 mb-2">
                <input 
                  type="checkbox" 
                  checked={formData.isClinicalAlert}
                  onChange={e => setFormData({...formData, isClinicalAlert: e.target.checked})}
                />
                <i className="fa-solid fa-triangle-exclamation"></i> Marcar como Alerta Clínica
              </label>
              <p className="text-[10px] text-rose-600 leading-tight">Activar para escalar el caso a revisión urgente.</p>
            </div>

            {/* Plan */}
            <div className="pt-6 border-t border-slate-100">
              <label className="block text-sm font-bold text-slate-700 mb-2">Plan de Tratamiento y Observaciones</label>
              <textarea 
                required
                className="w-full border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                rows={4}
                value={formData.plan}
                onChange={e => setFormData({...formData, plan: e.target.value})}
                placeholder="Describa el plan de tratamiento, indicaciones y seguimiento..."
                data-testid="doctor-plan-textarea"
              />
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
              <button 
                type="button"
                onClick={onCancel}
                className="px-8 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
                data-testid="cancel-visit-btn"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="px-10 py-3 bg-blue-600 text-white font-black rounded-xl shadow-lg hover:bg-blue-700 shadow-blue-200 transition-all active:scale-95 flex items-center gap-2"
                data-testid="save-visit-btn"
              >
                <i className="fa-solid fa-floppy-disk"></i> GUARDAR EVALUACIÓN
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Formulario para Enfermería (original)
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
                       <span className="text-[10px] font-bold text-blue-500 mt-2 uppercase tracking-wider">Subir Foto Herida</span>
                    </div>
                 </div>
                 <input type="file" accept="image/*" className="mt-3 text-xs" onChange={e => handlePhotoUpload(e.target.files?.[0])} />
              </div>
           </div>

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
