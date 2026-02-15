
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
  patient?: Patient;
}

// Determinar si es rol médico
const isMedicoRole = (role: UserRole) => {
  return role === UserRole.DOCTOR || role === UserRole.ADMIN;
};

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
        <div className="absolute z-50 bottom-full left-0 mb-2 w-64 bg-slate-800 text-white text-xs rounded-lg shadow-xl p-3" style={{animation: 'fadeIn 0.2s ease-out'}}>
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
  
  // Estado adicional para formulario médico
  const [medicoData, setMedicoData] = useState({
    woundDescription: '',
    woundSize: { length: lastVisit?.size?.length || 0, width: lastVisit?.size?.width || 0, depth: lastVisit?.size?.depth || 0 },
    woundType: '',
    infectionSigns: [] as string[],
    infectionSeverity: '',
    atbIndication: { indicated: lastVisit?.atb?.inCourse || false, scheme: lastVisit?.atb?.scheme || '', duration: '' },
    labResults: { date: new Date().toISOString().split('T')[0], hba1c: '', albumin: '', pcr: '', vhs: '', creatinine: '', leucocitos: '' },
    treatmentPlan: '',
    nextControl: '',
    referToSurgery: false,
    surgeryType: '' as 'Vascular' | 'General' | ''
  });
  
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
    
    // Para médicos no es obligatoria la foto
    if (!isMedicoRole(role) && !formData.photoUrl) {
      return alert('La captura fotográfica es OBLIGATORIA para continuar.');
    }
    
    if (checkConsecutiveWorse()) {
      const confirm = window.confirm('ALERTA: Es la SEGUNDA evolución "Peor" consecutiva. El flujo se bloqueará para revisión del Médico Internista. ¿Desea confirmar el registro?');
      if (!confirm) return;
    }

    // Si es médico, combinar datos específicos
    const finalPlan = isMedicoRole(role) 
      ? medicoData.treatmentPlan 
      : formData.plan;
    
    const finalSize = isMedicoRole(role) 
      ? medicoData.woundSize 
      : formData.size;
    
    const finalAtb = isMedicoRole(role)
      ? { inCourse: medicoData.atbIndication.indicated, scheme: medicoData.atbIndication.scheme, startDate: new Date().toISOString().split('T')[0] }
      : formData.atb;
    
    const finalInfection = isMedicoRole(role)
      ? { has: medicoData.infectionSigns.length > 0, severity: medicoData.infectionSeverity, signs: medicoData.infectionSigns }
      : formData.infectionToday;

    const visit: Visit = {
      ...formData as Visit,
      id: generateId(),
      episodeId,
      professionalId: 'user-1',
      professionalRole: role,
      plan: finalPlan || '',
      size: finalSize,
      atb: finalAtb,
      infectionToday: finalInfection,
      medicoEvaluation: isMedicoRole(role) ? {
        woundDescription: medicoData.woundDescription,
        woundType: medicoData.woundType,
        labResults: medicoData.labResults,
        nextControl: medicoData.nextControl,
        referToSurgery: medicoData.referToSurgery,
        surgeryType: medicoData.surgeryType
      } : undefined
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
           color === 'rose' ? 'bg-rose-600 border-rose-700 text-white shadow-sm' :
           'bg-slate-600 border-slate-700 text-white shadow-sm')
        : `bg-white border-slate-200 text-slate-600 hover:bg-slate-50`
      }`}
    >
      {label}
    </button>
  );

  // Toggle para signos de infección
  const toggleInfectionSign = (sign: string) => {
    const current = medicoData.infectionSigns;
    const updated = current.includes(sign)
      ? current.filter(s => s !== sign)
      : [...current, sign];
    setMedicoData({ ...medicoData, infectionSigns: updated });
  };

  // FORMULARIO PARA MÉDICO DIABETOLOGÍA
  if (isMedicoRole(role)) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
          <div className="p-6 border-b border-slate-100 bg-blue-50 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-blue-900">Evaluación Médica - Registro Clínico</h3>
              <p className="text-sm text-blue-700 font-medium">Documentación completa del caso clínico</p>
            </div>
            <div className="text-blue-800 font-bold bg-white px-3 py-1 rounded-full text-sm shadow-sm">
              {role}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            
            {/* SECCIÓN 1: Descripción de la Herida */}
            <div className="space-y-4">
              <h4 className="text-sm font-black uppercase text-slate-500 flex items-center gap-2">
                <i className="fa-solid fa-notes-medical text-blue-500"></i> 1. Descripción de la Herida
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Largo (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                    value={medicoData.woundSize.length}
                    onChange={e => setMedicoData({
                      ...medicoData,
                      woundSize: { ...medicoData.woundSize, length: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Ancho (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                    value={medicoData.woundSize.width}
                    onChange={e => setMedicoData({
                      ...medicoData,
                      woundSize: { ...medicoData.woundSize, width: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Profundidad (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                    value={medicoData.woundSize.depth}
                    onChange={e => setMedicoData({
                      ...medicoData,
                      woundSize: { ...medicoData.woundSize, depth: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Tipo de Herida</label>
                <div className="flex flex-wrap gap-2">
                  {['Úlcera Neuropática', 'Úlcera Isquémica', 'Úlcera Neuroisquémica', 'Pie de Charcot', 'Post-quirúrgica'].map(tipo => (
                    <SelectionButton
                      key={tipo}
                      label={tipo}
                      active={medicoData.woundType === tipo}
                      onClick={() => setMedicoData({ ...medicoData, woundType: tipo })}
                      color="blue"
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Descripción Clínica</label>
                <textarea
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm"
                  rows={3}
                  placeholder="Describa características de la herida: bordes, lecho, tejido circundante, exudado..."
                  value={medicoData.woundDescription}
                  onChange={e => setMedicoData({ ...medicoData, woundDescription: e.target.value })}
                />
              </div>
            </div>

            {/* SECCIÓN 2: Evaluación de Infección */}
            <div className="space-y-4 pt-6 border-t border-slate-100">
              <h4 className="text-sm font-black uppercase text-slate-500 flex items-center gap-2">
                <i className="fa-solid fa-virus text-rose-500"></i> 2. Evaluación de Infección
              </h4>
              
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Signos de Infección</label>
                <div className="flex flex-wrap gap-2">
                  {['Eritema >2cm', 'Edema', 'Calor local', 'Dolor', 'Secreción purulenta', 'Mal olor', 'Fiebre', 'Leucocitosis'].map(sign => (
                    <SelectionButton
                      key={sign}
                      label={sign}
                      active={medicoData.infectionSigns.includes(sign)}
                      onClick={() => toggleInfectionSign(sign)}
                      color="rose"
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Severidad (IDSA/IWGDF)</label>
                <div className="flex flex-wrap gap-2">
                  {['Sin infección', 'Leve (Grado 2)', 'Moderada (Grado 3)', 'Severa (Grado 4)'].map(sev => (
                    <SelectionButton
                      key={sev}
                      label={sev}
                      active={medicoData.infectionSeverity === sev}
                      onClick={() => setMedicoData({ ...medicoData, infectionSeverity: sev })}
                      color={sev.includes('Severa') ? 'rose' : sev.includes('Moderada') ? 'amber' : 'emerald'}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: Indicación de Antibióticos */}
            <div className="space-y-4 pt-6 border-t border-slate-100">
              <h4 className="text-sm font-black uppercase text-slate-500 flex items-center gap-2">
                <i className="fa-solid fa-capsules text-amber-500"></i> 3. Indicación de Antibióticos
              </h4>
              
              <div className="flex items-center gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={medicoData.atbIndication.indicated}
                    onChange={e => setMedicoData({
                      ...medicoData,
                      atbIndication: { ...medicoData.atbIndication, indicated: e.target.checked }
                    })}
                    className="w-4 h-4"
                  />
                  <span className="font-bold text-slate-700">Indicar antibióticos</span>
                </label>
              </div>

              {medicoData.atbIndication.indicated && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Esquema Antibiótico</label>
                    <select
                      className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                      value={medicoData.atbIndication.scheme}
                      onChange={e => setMedicoData({
                        ...medicoData,
                        atbIndication: { ...medicoData.atbIndication, scheme: e.target.value }
                      })}
                    >
                      <option value="">Seleccionar...</option>
                      <option value="Amoxicilina/Clav 875mg c/12h">Amoxicilina/Clavulánico 875mg c/12h</option>
                      <option value="Clindamicina 300mg c/8h">Clindamicina 300mg c/8h</option>
                      <option value="Ciprofloxacino 500mg c/12h">Ciprofloxacino 500mg c/12h</option>
                      <option value="Levofloxacino 750mg/día">Levofloxacino 750mg/día</option>
                      <option value="Cotrimoxazol Forte c/12h">Cotrimoxazol Forte c/12h</option>
                      <option value="Metronidazol 500mg c/8h + Cipro">Metronidazol 500mg c/8h + Ciprofloxacino</option>
                      <option value="Otro">Otro (especificar en plan)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Duración</label>
                    <select
                      className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                      value={medicoData.atbIndication.duration}
                      onChange={e => setMedicoData({
                        ...medicoData,
                        atbIndication: { ...medicoData.atbIndication, duration: e.target.value }
                      })}
                    >
                      <option value="">Seleccionar...</option>
                      <option value="7 días">7 días</option>
                      <option value="10 días">10 días</option>
                      <option value="14 días">14 días</option>
                      <option value="21 días">21 días</option>
                      <option value="Hasta control">Hasta próximo control</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* SECCIÓN 4: Exámenes de Laboratorio */}
            <div className="space-y-4 pt-6 border-t border-slate-100">
              <h4 className="text-sm font-black uppercase text-slate-500 flex items-center gap-2">
                <i className="fa-solid fa-flask text-indigo-500"></i> 4. Exámenes de Laboratorio (últimos resultados)
              </h4>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">HbA1c (%)</label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                    placeholder="ej: 8.2"
                    value={medicoData.labResults.hba1c}
                    onChange={e => setMedicoData({
                      ...medicoData,
                      labResults: { ...medicoData.labResults, hba1c: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Albúmina (g/dL)</label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                    placeholder="ej: 3.5"
                    value={medicoData.labResults.albumin}
                    onChange={e => setMedicoData({
                      ...medicoData,
                      labResults: { ...medicoData.labResults, albumin: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">PCR (mg/L)</label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                    placeholder="ej: 45"
                    value={medicoData.labResults.pcr}
                    onChange={e => setMedicoData({
                      ...medicoData,
                      labResults: { ...medicoData.labResults, pcr: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">VHS (mm/h)</label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                    placeholder="ej: 60"
                    value={medicoData.labResults.vhs}
                    onChange={e => setMedicoData({
                      ...medicoData,
                      labResults: { ...medicoData.labResults, vhs: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Creatinina</label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                    placeholder="ej: 1.2"
                    value={medicoData.labResults.creatinine}
                    onChange={e => setMedicoData({
                      ...medicoData,
                      labResults: { ...medicoData.labResults, creatinine: e.target.value }
                    })}
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN 5: Derivación a Cirugía */}
            <div className="space-y-4 pt-6 border-t border-slate-100">
              <h4 className="text-sm font-black uppercase text-slate-500 flex items-center gap-2">
                <i className="fa-solid fa-user-doctor text-violet-500"></i> 5. Derivación a Especialidad Quirúrgica
              </h4>
              
              <div className="flex items-center gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={medicoData.referToSurgery}
                    onChange={e => setMedicoData({ ...medicoData, referToSurgery: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="font-bold text-slate-700">Solicitar evaluación quirúrgica</span>
                </label>
              </div>

              {medicoData.referToSurgery && (
                <div className="flex gap-4 p-4 bg-violet-50 rounded-xl border border-violet-200">
                  {['Vascular', 'General'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setMedicoData({ ...medicoData, surgeryType: type as 'Vascular' | 'General' })}
                      className={`flex-1 py-3 rounded-xl font-bold border transition-all ${
                        medicoData.surgeryType === type
                          ? 'bg-violet-600 border-violet-700 text-white shadow-lg'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <i className={`fa-solid ${type === 'Vascular' ? 'fa-heart-pulse' : 'fa-scissors'} mr-2`}></i>
                      Cirugía {type}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* SECCIÓN 6: Plan de Tratamiento */}
            <div className="space-y-4 pt-6 border-t border-slate-100">
              <h4 className="text-sm font-black uppercase text-slate-500 flex items-center gap-2">
                <i className="fa-solid fa-clipboard-list text-emerald-500"></i> 6. Plan de Tratamiento
              </h4>
              
              <textarea
                required
                className="w-full border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                rows={4}
                value={medicoData.treatmentPlan}
                onChange={e => setMedicoData({ ...medicoData, treatmentPlan: e.target.value })}
                placeholder="Describa el plan de tratamiento integral: indicaciones, recomendaciones, próximos pasos..."
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Próximo Control</label>
                  <input
                    type="date"
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                    value={medicoData.nextControl}
                    onChange={e => setMedicoData({ ...medicoData, nextControl: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Botones */}
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
                <i className="fa-solid fa-floppy-disk"></i> GUARDAR EVALUACIÓN
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // FORMULARIO PARA ENFERMERÍA (curación)

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