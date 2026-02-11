
import React, { useState, useEffect } from 'react';
import { Patient, Episode, Visit, WifiScore } from '../types';
import { formatDate } from '../utils';

interface SurgicalReferralModalProps {
  patient: Patient;
  episode: Episode;
  visits: Visit[];
  wifi: WifiScore;
  onClose: () => void;
  onConfirm: (report: string) => void;
}

const SurgicalReferralModal: React.FC<SurgicalReferralModalProps> = ({ patient, episode, visits, wifi, onClose, onConfirm }) => {
  const [reportContent, setReportContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSections, setSelectedSections] = useState({
    history: true,
    vascular: true,
    wifi: true,
    lab: true,
  });

  const generateDataSnapshot = () => {
    const lastLab = patient.labHistory?.length ? patient.labHistory[patient.labHistory.length - 1] : null;
    const sortedVisits = [...visits].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);

    return {
      patient: { name: patient.name, comorbidities: patient.comorbidities },
      wifi: `W:${wifi.wound} I:${wifi.ischemia} fI:${wifi.footInfection} (Riesgo: ${wifi.amputationRisk}, Beneficio Revasc: ${wifi.revascularizationBenefit})`,
      vascular: `ABI: ${episode.vascularStatus.abi || 'N/A'}, Pulsos: DP ${episode.vascularStatus.pulses.dp}/PT ${episode.vascularStatus.pulses.pt}`,
      labs: lastLab ? `PCR: ${lastLab.pcr}, VHS: ${lastLab.vhs}, Albúmina: ${lastLab.albumin}, VFG: ${lastLab.vfg}` : 'No disponibles',
      evolution: sortedVisits.map(v => `${formatDate(v.date)}: ${v.evolution} (Plan previo: ${v.plan})`).join(' | ')
    };
  };

  // Corrección: Inicializar el contenido usando useEffect para evitar bucles de renderizado
  useEffect(() => {
    if (!reportContent && !isGenerating) {
      const snapshot = generateDataSnapshot();
      setReportContent(`SOLICITUD DE EVALUACIÓN\nPaciente: ${snapshot.patient.name}\n\n[Haga clic en el botón lateral para que Gemini IA genere un análisis de coherencia clínica basado en el historial del paciente]`);
    }
  }, []);

  const generateAIReport = async () => {
    setIsGenerating(true);
    const data = generateDataSnapshot();
    try {
      const key = import.meta.env.VITE_GEMINI_API_KEY;
      if (!key) throw new Error('Falta VITE_GEMINI_API_KEY en .env.local');
      const prompt = `Actúa como un Especialista Senior en Pie Diabético y Cirugía Vascular. 
      Tu objetivo es redactar una INTERCONSULTA QUIRÚRGICA COHERENTE y RIGUROSA para un colega cirujano.
      
      DATOS DEL PACIENTE:
      - Antecedentes: ${data.patient.comorbidities.join(', ')}
      - Score WIfI: ${data.wifi}
      - Estado Vascular: ${data.vascular}
      - Laboratorio Reciente: ${data.labs}
      - Evolución de Herida: ${data.evolution}
      
      REQUERIMIENTOS CLÍNICOS:
      1. Correlaciona la bioquímica (inflamación/estado nutricional) con la tása de curación.
      2. Justifica la necesidad de intervención basándote en el Score WIfI.
      3. Determina si el paciente requiere Revascularización (Vascular) o Aseo/Desbridamiento/Amputación Menor (Cirugía General).
      4. Estructura: Resumen Clínico, Justificación Quirúrgica y Recomendación Táctica.
      
      Respuesta en español, tono formal, técnico y conciso.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      setReportContent(text || 'Error al procesar la narrativa clínica.');
    } catch (error) {
      console.error("AI Error:", error);
      alert("Error de conexión con el motor de IA clínica. Verifique su API Key.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
       <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
          <div className="p-6 border-b border-slate-100 bg-slate-800 text-white flex justify-between items-center shrink-0">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
                   <i className="fa-solid fa-microchip"></i>
                </div>
                <div>
                   <h3 className="text-xl font-bold">Generador Quirúrgico Cognitivo</h3>
                   <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">Inteligencia Clínica Gemini 3 Pro</p>
                </div>
             </div>
             <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><i className="fa-solid fa-xmark text-xl"></i></button>
          </div>
          
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-4 bg-slate-50">
             <div className="p-6 border-r border-slate-200 space-y-4 overflow-y-auto">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-tighter">Parámetros de Interconsulta</h4>
                <div className="space-y-2">
                   {Object.entries(selectedSections).map(([key, val]) => (
                    <label key={key} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300 transition-all shadow-sm">
                       <span className="text-xs font-bold text-slate-600 capitalize">{key === 'wifi' ? 'Score WIfI' : key}</span>
                       <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        checked={val} 
                        onChange={() => setSelectedSections({...selectedSections, [key as any]: !val})} 
                       />
                    </label>
                   ))}
                </div>
                <div className="pt-4">
                  <button 
                    onClick={generateAIReport}
                    disabled={isGenerating}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] shadow-xl shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
                  >
                    {isGenerating ? (
                      <i className="fa-solid fa-circle-notch animate-spin text-lg"></i>
                    ) : (
                      <i className="fa-solid fa-wand-magic-sparkles text-lg"></i>
                    )}
                    {isGenerating ? 'ANALIZANDO COHERENCIA...' : 'GENERAR CON IA'}
                  </button>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <p className="text-[9px] text-amber-700 leading-tight">
                    <i className="fa-solid fa-circle-info mr-1"></i>
                    La IA analizará la tendencia de laboratorio y la evolución fotográfica para redactar una solicitud coherente.
                  </p>
                </div>
             </div>

             <div className="md:col-span-3 relative flex flex-col">
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                   <span className="bg-emerald-500/10 text-emerald-600 text-[10px] font-bold px-2 py-1 rounded-full border border-emerald-200 backdrop-blur-sm">
                      Narrativa Verificada
                   </span>
                </div>
                <textarea 
                  className="flex-1 w-full bg-slate-900 text-emerald-400 font-mono text-sm p-8 outline-none border-none resize-none leading-relaxed"
                  value={reportContent}
                  onChange={(e) => setReportContent(e.target.value)}
                  placeholder="El informe se mostrará aquí..."
                />
             </div>
          </div>

          <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-white shrink-0">
             <button onClick={onClose} className="px-6 py-2 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all">
                Cerrar
             </button>
             <button 
              onClick={() => onConfirm(reportContent)} 
              disabled={!reportContent || isGenerating}
              className="px-8 py-2 bg-blue-600 text-white font-black rounded-xl shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95"
             >
                <i className="fa-solid fa-check-double mr-2"></i> Confirmar y Enviar
             </button>
          </div>
       </div>
    </div>
  );
};

export default SurgicalReferralModal;
