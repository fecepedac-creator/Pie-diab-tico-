
import React, { useState, useRef } from 'react';
import { Visit, UserRole, ClinicalConfig, WifiScore, WagnerScore, TexasScore, Patient, Episode } from '../types';
import { formatDate, generateId } from '../utils';
import { api } from '../services/api';
import { geminiService } from '../services/gemini';

interface WeeklyVisitFormProps {
  episodeId: string;
  lastVisit?: Visit;
  onSubmit: (v: Visit) => void;
  onCancel: () => void;
  role: UserRole;
  authToken?: string | null;
  clinicalConfig: ClinicalConfig | null;
  patient: Patient;
  onUpdatePatient?: (p: Patient) => void;
  activeCenterId: string;
}

const WeeklyVisitForm: React.FC<WeeklyVisitFormProps> = ({ episodeId, lastVisit, onSubmit, onCancel, role, authToken, clinicalConfig, patient, onUpdatePatient, activeCenterId }) => {
  const [showOther, setShowOther] = useState(false);
  const [showWifiModal, setShowWifiModal] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [newComorbidity, setNewComorbidity] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

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
    responsiblePlan: role,
    offloading: { required: false, type: '', ambulation: 'Independiente', assistiveDevices: [] },
    aiSummary: ''
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
      centerId: activeCenterId,
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

  const handleAddComorbidity = () => {
    if (!newComorbidity.trim() || !onUpdatePatient) return;
    const updated = [...patient.comorbidities, newComorbidity.trim()];
    onUpdatePatient({ ...patient, comorbidities: updated });
    setNewComorbidity('');
  };

  const handleGenerateAI = async () => {
    setIsGeneratingAI(true);
    try {
      // Mock Episode/History structure for service if not fully available
      const episodeMock = { id: episodeId, location: 'Sitio Actual', strategy: 'Salvataje' } as Episode;
      const summary = await geminiService.generateClinicalSummary(patient, episodeMock, formData as Visit, []);
      setFormData(prev => ({ ...prev, aiSummary: summary }));
    } catch (e) {
      alert('Error generando resumen IA');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const SelectionButton = ({ label, active, onClick, color = 'blue' }: any) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all ${active
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

  /* 
  /* 
   * RENDER LOGIC BASED ON ROLE
   */
  if (role === UserRole.DOCTOR || role === UserRole.VASCULAR || role === UserRole.SURGERY) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
          <div className="p-6 border-b border-slate-100 bg-indigo-50 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-indigo-900">Evaluación Médica Especializada</h3>
              <p className="text-sm text-indigo-700 font-medium">Diagnóstico, Infección y Plan Terapeútico</p>
            </div>
            <div className="text-indigo-800 font-bold bg-white px-3 py-1 rounded-full text-sm shadow-sm">
              {role}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-8">

            {/* ANTECEDENTES (Solo si se pasa onUpdatePatient) */}
            {onUpdatePatient && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <i className="fa-solid fa-file-medical"></i> Antecedentes Mórbidos
                </h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {patient.comorbidities.map((c, i) => (
                    <span key={i} className="bg-white px-3 py-1 rounded-full text-xs font-bold border border-slate-200 text-slate-600 shadow-sm">
                      {c}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Agregar antecedente (Ej: Dislipidemia, Tabaquismo...)"
                    className="flex-1 p-2 text-sm border rounded-lg"
                    value={newComorbidity}
                    onChange={e => setNewComorbidity(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddComorbidity())}
                  />
                  <button type="button" onClick={handleAddComorbidity} className="bg-slate-200 px-4 py-2 rounded-lg font-bold text-slate-600 text-xs hover:bg-slate-300">
                    AGREGAR
                  </button>
                </div>
              </div>
            )}

            {/* Foto y Evolución (Común) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="relative">
                <p className="text-[10px] font-black uppercase text-blue-500 mb-2">Estado Actual de la Lesión *</p>
                <div className="aspect-video bg-white border-2 border-dashed border-blue-200 rounded-xl overflow-hidden relative group cursor-pointer hover:border-blue-400 transition-all">
                  <img src={formData.photoUrl} className="absolute inset-0 w-full h-full object-cover opacity-30" alt="Preview" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <i className="fa-solid fa-camera text-3xl text-blue-400 group-hover:scale-110 transition-transform"></i>
                    <span className="text-[10px] font-bold text-blue-500 mt-2 uppercase">Subir Foto Clínica</span>
                  </div>
                </div>
                <input type="file" accept="image/*" capture="environment" className="mt-3 text-xs" onChange={e => handlePhotoUpload(e.target.files?.[0])} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">Evolución Global</label>
                <div className="flex gap-2 mb-6">
                  {['Mejor', 'Igual', 'Peor'].map(evo => (
                    <button
                      key={evo} type="button"
                      onClick={() => setFormData({ ...formData, evolution: evo as any })}
                      className={`flex-1 py-3 rounded-xl font-black border transition-all ${formData.evolution === evo
                        ? (evo === 'Mejor' ? 'bg-emerald-500 border-emerald-600 text-white' : evo === 'Igual' ? 'bg-blue-500 border-blue-600 text-white' : 'bg-rose-500 border-rose-600 text-white')
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      {evo}
                    </button>
                  ))}
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <p className="text-xs font-bold text-slate-500 mb-2 uppercase">Dimensiones (cm)</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className="text-[10px]">Largo</label><input type="number" step="0.1" className="w-full p-1 border rounded" value={formData.size?.length || ''} onChange={e => setFormData({ ...formData, size: { ...formData.size!, length: parseFloat(e.target.value) } })} /></div>
                    <div><label className="text-[10px]">Ancho</label><input type="number" step="0.1" className="w-full p-1 border rounded" value={formData.size?.width || ''} onChange={e => setFormData({ ...formData, size: { ...formData.size!, width: parseFloat(e.target.value) } })} /></div>
                    <div><label className="text-[10px]">Profundidad</label><input type="number" step="0.1" className="w-full p-1 border rounded" value={formData.size?.depth || ''} onChange={e => setFormData({ ...formData, size: { ...formData.size!, depth: parseFloat(e.target.value) } })} /></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Infección y Cultivo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100">
                <h4 className="text-sm font-bold text-rose-800 mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-virus"></i> Estado Infeccioso
                </h4>
                <label className="flex items-center gap-2 mb-4 cursor-pointer">
                  <input type="checkbox" checked={formData.infectionToday?.has} onChange={e => setFormData({ ...formData, infectionToday: { ...formData.infectionToday!, has: e.target.checked } })} />
                  <span className="text-sm font-bold text-rose-900">¿Signos de Infección Activa?</span>
                </label>

                {formData.infectionToday?.has && (
                  <select
                    className="w-full p-2 text-sm border border-rose-200 rounded-lg mb-2"
                    value={formData.infectionToday.severity || ''}
                    onChange={e => setFormData({ ...formData, infectionToday: { ...formData.infectionToday!, severity: e.target.value as any } })}
                  >
                    <option value="">Seleccione Severidad...</option>
                    <option value="Grado 2 (Leve)">Grado 2 (Leve)</option>
                    <option value="Grado 3 (Moderada)">Grado 3 (Moderada)</option>
                    <option value="Grado 4 (Severa/Sepsis)">Grado 4 (Severa/Sepsis)</option>
                  </select>
                )}
              </div>

              <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100">
                <h4 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-vial"></i> Cultivo / Biopsia
                </h4>
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center gap-2 text-sm"><input type="radio" name="culture" checked={!formData.culture?.taken} onChange={() => setFormData({ ...formData, culture: { taken: false, resultStatus: 'No tomado' } })} /> No se requiere</label>
                  <label className="flex items-center gap-2 text-sm"><input type="radio" name="culture" checked={formData.culture?.taken} onChange={() => setFormData({ ...formData, culture: { taken: true, resultStatus: 'Pendiente' } })} /> Muestra Tomada</label>
                </div>
                {formData.culture?.taken && (
                  <select
                    className="w-full p-2 text-sm border border-amber-200 rounded-lg"
                    value={formData.culture.type || ''}
                    onChange={e => setFormData({ ...formData, culture: { ...formData.culture!, type: e.target.value as any } })}
                  >
                    <option value="">Tipo de Muestra...</option>
                    <option value="Tejido profundo">Tejido Profundo (Biopsia)</option>
                    <option value="Óseo">Hueso</option>
                    <option value="Hisopo">Hisopo (No recomendado)</option>
                  </select>
                )}
              </div>
            </div>

            {/* Antibióticos */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <i className="fa-solid fa-pills"></i> Manejo Antibiótico
                </h4>
                <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1 rounded shadow-sm border border-slate-200">
                  <input type="checkbox" checked={formData.atb?.inCourse} onChange={e => setFormData({ ...formData, atb: { ...formData.atb!, inCourse: e.target.checked } })} />
                  <span className="text-xs font-bold">Indicar ATB</span>
                </label>
              </div>

              {formData.atb?.inCourse && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" placeholder="Esquema (Ej: Ciprofloxacino + Clinda)" className="w-full p-2 border rounded text-sm" value={formData.atb.scheme || ''} onChange={e => setFormData({ ...formData, atb: { ...formData.atb!, scheme: e.target.value } })} />
                  <input type="text" placeholder="Dosis e Intervalo" className="w-full p-2 border rounded text-sm" value={formData.atb.dose || ''} onChange={e => setFormData({ ...formData, atb: { ...formData.atb!, dose: e.target.value } })} />
                </div>
              )}
            </div>

            {/* Clasificación WIfI - SOLO MEDICOS */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="block text-sm font-bold text-slate-700">Clasificación WIfI</label>
                <button type="button" onClick={() => setShowWifiModal(true)} className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg font-bold shadow-sm hover:bg-blue-700">
                  <i className="fa-solid fa-table-list mr-1"></i> Calcular WIfI
                </button>
              </div>

              {formData.wifiScore && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex justify-around items-center">
                  <div className="text-center">
                    <span className="block text-[10px] font-bold text-blue-400">HERIDA (W)</span>
                    <span className="text-2xl font-black text-blue-700">{formData.wifiScore.wound}</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-[10px] font-bold text-blue-400">ISQUEMIA (I)</span>
                    <span className="text-2xl font-black text-blue-700">{formData.wifiScore.ischemia}</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-[10px] font-bold text-blue-400">INFECCIÓN (fI)</span>
                    <span className="text-2xl font-black text-blue-700">{formData.wifiScore.footInfection}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Descarga y Deambulación */}
            <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100">
              <h4 className="text-sm font-bold text-orange-800 mb-3 flex items-center gap-2">
                <i className="fa-solid fa-shoe-prints"></i> Descarga y Deambulación
              </h4>
              <label className="flex items-center gap-2 mb-4 cursor-pointer">
                <input type="checkbox" checked={formData.offloading?.required} onChange={e => setFormData({ ...formData, offloading: { ...formData.offloading!, required: e.target.checked } })} />
                <span className="text-sm font-bold text-orange-900">¿Requiere Descarga?</span>
              </label>
              {formData.offloading?.required && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-bold text-orange-700 block mb-1">Tipo de Descarga</label>
                    <input type="text" placeholder="Ej: Zapato Quirúrgico, Yeso, Bota..." className="w-full p-2 border rounded text-sm" value={formData.offloading.type || ''} onChange={e => setFormData({ ...formData, offloading: { ...formData.offloading!, type: e.target.value } })} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-orange-700 block mb-1">Estado Deambulación</label>
                    <select className="w-full p-2 border rounded text-sm" value={formData.offloading.ambulation || 'Independiente'} onChange={e => setFormData({ ...formData, offloading: { ...formData.offloading!, ambulation: e.target.value } })}>
                      <option value="Independiente">Independiente</option>
                      <option value="Bastón">Bastón</option>
                      <option value="Andador">Andador</option>
                      <option value="Silla de Ruedas">Silla de Ruedas</option>
                      <option value="Postrado">Postrado</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Plan Médico */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Indicaciones Médicas y Plan</label>
              <textarea
                required
                className="w-full border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                rows={4}
                value={formData.plan}
                onChange={e => setFormData({ ...formData, plan: e.target.value })}
                placeholder="Indique conducta a seguir, solicitud de exámenes, o derivaciones..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
              <button type="button" onClick={onCancel} className="px-8 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl">Cancelar</button>
              <button type="submit" className="px-10 py-3 bg-indigo-600 text-white font-black rounded-xl shadow-lg hover:bg-indigo-700 flex items-center gap-2">
                <i className="fa-solid fa-stethoscope"></i> GUARDAR EVALUACIÓN
              </button>
            </div>
          </form>
        </div>
        {/* WIfI MODAL */}
        {showWifiModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                <h3 className="text-lg font-bold text-slate-800">Clasificación SVS WIfI</h3>
                <button onClick={() => setShowWifiModal(false)} className="text-slate-400 hover:text-slate-600"><i className="fa-solid fa-xmark text-xl"></i></button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                {/* WOUND TABLE */}
                <div>
                  <h4 className="text-sm font-bold text-blue-600 mb-2 border-b border-blue-100 pb-1">W - Herida (Wound)</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { grade: 0, desc: 'Sin úlcera (Dolor isquémico reposo)', detail: 'No hay úlcera ni gangrena.' },
                      { grade: 1, desc: 'Úlcera Superficial', detail: 'Sin compromiso óseo. Limitada a falange distal.' },
                      { grade: 2, desc: 'Úlcera Profunda / Gangrena Local', detail: 'Expone hueso/tendón O Gangrena digital limitada.' },
                      { grade: 3, desc: 'Gangrena Extensa', detail: 'Compromete antepié/mediopié o calcáneo.' }
                    ].map((item) => (
                      <button
                        key={item.grade}
                        type="button"
                        onClick={() => setFormData({ ...formData, wifiScore: { ...(formData.wifiScore || { ischemia: 0, footInfection: 0, clinicalStage: 0, amputationRisk: 'Muy Bajo', revascularizationBenefit: 'Mínimo' }), wound: item.grade as any } })}
                        className={`flex items-start text-left p-3 rounded-lg border transition-all ${formData.wifiScore?.wound === item.grade ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-lg mr-4 shrink-0 ${formData.wifiScore?.wound === item.grade ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{item.grade}</div>
                        <div>
                          <p className={`font-bold ${formData.wifiScore?.wound === item.grade ? 'text-blue-700' : 'text-slate-700'}`}>{item.desc}</p>
                          <p className="text-xs text-slate-500">{item.detail}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ISCHEMIA TABLE */}
                <div>
                  <h4 className="text-sm font-bold text-rose-600 mb-2 border-b border-rose-100 pb-1">I - Isquemia (Ischemia)</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { grade: 0, desc: 'Sin Isquemia Significativa', detail: 'ABI ≥ 0.80 | Presión Ortejo ≥ 60 mmHg' },
                      { grade: 1, desc: 'Isquemia Leve', detail: 'ABI 0.60 - 0.79 | Presión Ortejo 40 - 59 mmHg' },
                      { grade: 2, desc: 'Isquemia Moderada', detail: 'ABI 0.40 - 0.59 | Presión Ortejo 30 - 39 mmHg' },
                      { grade: 3, desc: 'Isquemia Severa', detail: 'ABI < 0.40 | Presión Ortejo < 30 mmHg' }
                    ].map((item) => (
                      <button
                        key={item.grade}
                        type="button"
                        onClick={() => setFormData({ ...formData, wifiScore: { ...(formData.wifiScore || { wound: 0, footInfection: 0, clinicalStage: 0, amputationRisk: 'Muy Bajo', revascularizationBenefit: 'Mínimo' }), ischemia: item.grade as any } })}
                        className={`flex items-start text-left p-3 rounded-lg border transition-all ${formData.wifiScore?.ischemia === item.grade ? 'bg-rose-50 border-rose-500 ring-1 ring-rose-500' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-lg mr-4 shrink-0 ${formData.wifiScore?.ischemia === item.grade ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{item.grade}</div>
                        <div>
                          <p className={`font-bold ${formData.wifiScore?.ischemia === item.grade ? 'text-rose-700' : 'text-slate-700'}`}>{item.desc}</p>
                          <p className="text-xs text-slate-500">{item.detail}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* FOOT INFECTION TABLE */}
                <div>
                  <h4 className="text-sm font-bold text-emerald-600 mb-2 border-b border-emerald-100 pb-1">fI - Infección (foot Infection)</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { grade: 0, desc: 'Sin Infección', detail: 'No hay signos ni síntomas de infección.' },
                      { grade: 1, desc: 'Infección Leve (Celulitis < 2cm)', detail: 'Limitada a piel/subcutáneo. Erasitema ≤ 2cm.' },
                      { grade: 2, desc: 'Infección Moderada (Celulitis > 2cm)', detail: 'Eritema > 2cm o afecta estructuras profundas (absceso, osteomielitis).' },
                      { grade: 3, desc: 'Infección Severa (SIRS)', detail: 'Signos de repuesta inflamatoria sistémica / Sepsis.' }
                    ].map((item) => (
                      <button
                        key={item.grade}
                        type="button"
                        onClick={() => setFormData({ ...formData, wifiScore: { ...(formData.wifiScore || { wound: 0, ischemia: 0, clinicalStage: 0, amputationRisk: 'Muy Bajo', revascularizationBenefit: 'Mínimo' }), footInfection: item.grade as any } })}
                        className={`flex items-start text-left p-3 rounded-lg border transition-all ${formData.wifiScore?.footInfection === item.grade ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-lg mr-4 shrink-0 ${formData.wifiScore?.footInfection === item.grade ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{item.grade}</div>
                        <div>
                          <p className={`font-bold ${formData.wifiScore?.footInfection === item.grade ? 'text-emerald-700' : 'text-slate-700'}`}>{item.desc}</p>
                          <p className="text-xs text-slate-500">{item.detail}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
                <button type="button" onClick={() => setShowWifiModal(false)} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-sm">
                  Confirmar Clasificación
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // DEFAULT RENDER (NURSE / PARAMEDIC / PODIATRY)
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
              <input type="file" accept="image/*" capture="environment" className="mt-3 text-xs" onChange={e => handlePhotoUpload(e.target.files?.[0])} />
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
                    onClick={() => setFormData({ ...formData, evolution: evo as any })}
                    className={`flex-1 py-3 rounded-xl font-black border transition-all ${formData.evolution === evo
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
                  onChange={e => setFormData({ ...formData, isClinicalAlert: e.target.checked })}
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
                  className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all ${showOther ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'
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

          {/* Clinical Scales Section */}
          {(clinicalConfig?.activeScales.wagner || clinicalConfig?.activeScales.texas || clinicalConfig?.activeScales.wifi) && (
            <div className="pt-8 border-t border-slate-100 space-y-8">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <i className="fa-solid fa-stethoscope text-blue-500"></i> Escalas de Evaluación (Opcionales)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {clinicalConfig?.activeScales.wagner && (
                  <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                    <p className="text-xs font-black uppercase text-orange-600 mb-3">Escala de Wagner</p>
                    <div className="flex flex-wrap gap-2">
                      {[0, 1, 2, 3, 4, 5].map(g => (
                        <SelectionButton
                          key={g} label={`Grado ${g}`}
                          active={formData.wagnerScore?.grade === g}
                          onClick={() => setFormData({ ...formData, wagnerScore: { grade: g as any, description: '' } })}
                          color="amber"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {clinicalConfig?.activeScales.texas && (
                  <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                    <p className="text-xs font-black uppercase text-indigo-600 mb-3">Escala de Texas</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-indigo-400 block mb-1">Grado</span>
                        <div className="flex flex-wrap gap-1">
                          {[0, 1, 2, 3].map(g => (
                            <button
                              key={g} type="button"
                              onClick={() => setFormData({ ...formData, texasScore: { ...formData.texasScore!, grade: g as any } })}
                              className={`w-8 h-8 rounded text-xs font-bold border ${formData.texasScore?.grade === g ? 'bg-indigo-600 border-indigo-700 text-white' : 'bg-white border-indigo-200 text-indigo-600'}`}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-indigo-400 block mb-1">Estadio</span>
                        <div className="flex flex-wrap gap-1">
                          {['A', 'B', 'C', 'D'].map(s => (
                            <button
                              key={s} type="button"
                              onClick={() => setFormData({ ...formData, texasScore: { ...formData.texasScore!, stage: s as any } })}
                              className={`w-8 h-8 rounded text-xs font-bold border ${formData.texasScore?.stage === s ? 'bg-indigo-600 border-indigo-700 text-white' : 'bg-white border-indigo-200 text-indigo-600'}`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {clinicalConfig?.activeScales.wifi && (
                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <p className="text-xs font-black uppercase text-blue-600 mb-3">WIfI Score (Clínico)</p>
                  <div className="flex gap-6 overflow-x-auto pb-2">
                    <div className="min-w-fit">
                      <span className="text-[10px] font-bold text-blue-400 block mb-1">Herida (W)</span>
                      <div className="flex gap-1">
                        {[0, 1, 2, 3].map(v => (
                          <button key={v} type="button" onClick={() => setFormData({ ...formData, wifiScore: { ...(formData.wifiScore || { ischemia: 0, footInfection: 0, clinicalStage: 0, amputationRisk: 'Muy Bajo', revascularizationBenefit: 'Mínimo' }), wound: v as any } })} className={`w-8 h-8 rounded border text-xs font-bold ${formData.wifiScore?.wound === v ? 'bg-blue-600 border-blue-700 text-white' : 'bg-white border-blue-200 text-blue-600'}`}>{v}</button>
                        ))}
                      </div>
                    </div>
                    <div className="min-w-fit border-l border-blue-100 pl-6">
                      <span className="text-[10px] font-bold text-blue-400 block mb-1">Infección (fI)</span>
                      <div className="flex gap-1">
                        {[0, 1, 2, 3].map(v => (
                          <button key={v} type="button" onClick={() => setFormData({ ...formData, wifiScore: { ...(formData.wifiScore || { wound: 0, ischemia: 0, clinicalStage: 0, amputationRisk: 'Muy Bajo', revascularizationBenefit: 'Mínimo' }), footInfection: v as any } })} className={`w-8 h-8 rounded border text-xs font-bold ${formData.wifiScore?.footInfection === v ? 'bg-blue-600 border-blue-700 text-white' : 'bg-white border-blue-200 text-blue-600'}`}>{v}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-blue-400 mt-2 italic">* Isquemia (I) se calcula automáticamente desde el perfil del episodio.</p>
                </div>
              )}
            </div>
          )}

          <div className="pt-6 border-t border-slate-100">
            <label className="block text-sm font-bold text-slate-700 mb-2">Plan de Trabajo y Observaciones</label>
            <textarea
              required
              className="w-full border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              rows={4}
              value={formData.plan}
              onChange={e => setFormData({ ...formData, plan: e.target.value })}
              placeholder="Describa el plan de curación y recomendaciones para el paciente..."
            />
          </div>

          {/* AI Summary Section NURSE */}
          <div className="pt-6 border-t border-slate-100">
            <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 relative overflow-hidden">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold text-indigo-900 flex items-center gap-2"><i className="fa-solid fa-wand-magic-sparkles"></i> Resumen Clínico IA (Gemini 2.0)</label>
                <button type="button" onClick={handleGenerateAI} disabled={isGeneratingAI} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-lg font-bold shadow-sm hover:bg-indigo-700 disabled:opacity-50">
                  {isGeneratingAI ? <i className="fa-solid fa-circle-notch animate-spin"></i> : 'GENERAR RESUMEN'}
                </button>
              </div>
              <textarea
                className="w-full border border-indigo-200 rounded-xl p-3 text-sm bg-white"
                rows={3}
                value={formData.aiSummary || ''}
                onChange={e => setFormData({ ...formData, aiSummary: e.target.value })}
                placeholder="El resumen generado por IA aparecerá aquí..."
              />
            </div>
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