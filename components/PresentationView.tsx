
import React, { useState } from 'react';
import { Patient, Episode, Visit } from '../types';
import { formatDate, calculateWifi } from '../utils';

interface PresentationViewProps {
  patient: Patient;
  episode: Episode;
  visits: Visit[];
  onClose: () => void;
}

const PresentationView: React.FC<PresentationViewProps> = ({ patient, episode, visits, onClose }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const sortedVisits = Array.isArray(visits) ? [...visits].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()) : [];
  const firstVisit = sortedVisits.length > 0 ? sortedVisits[0] : null;
  const lastVisit = sortedVisits.length > 0 ? sortedVisits[sortedVisits.length - 1] : null;
  const wifi = calculateWifi(episode, lastVisit || undefined);

  const generateAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const key = import.meta.env.VITE_GEMINI_API_KEY;
      if (!key) throw new Error('Falta VITE_GEMINI_API_KEY en .env.local');
      const prompt = `Analiza este caso clínico de Pie Diabético para una reunión de comité médico multidisciplinario:
      - Paciente: ${patient.name}, RUT: ${patient.rut}.
      - Comorbilidades: ${patient.comorbidities.join(', ')}.
      - Herida: Localizada en ${episode.location}.
      - Score WIfI actual: W${wifi.wound} I${wifi.ischemia} fI${wifi.footInfection}.
      - Riesgo de Amputación: ${wifi.amputationRisk}.
      - Beneficio Revascularización: ${wifi.revascularizationBenefit}.
      - Evolución: ${lastVisit ? `La herida se reporta como "${lastVisit.evolution}"` : "Sin visitas registradas aún"}.
      - Estrategia actual: ${episode.strategy}.
      
      Escribe para la diapositiva:
      1. Un análisis crítico de la coherencia entre el score WIfI y la evolución reportada.
      2. 3 puntos clave para el debate clínico.
      3. Una recomendación estratégica (ej: Mantener salvataje, pasar a paliativo o cirugía urgente).
      
      Formato: Markdown profesional, breve y directo.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`,
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
      setAiAnalysis(text || 'Análisis no disponible.');
    } catch (e) {
      console.error(e);
      setAiAnalysis("Error al generar análisis con IA. Verifique su conexión y API Key.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const slides = [
    {
      title: "Antecedentes del Paciente",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
           <div className="space-y-4">
              <h4 className="text-lg font-bold text-blue-800 border-b pb-2">Identificación</h4>
              <p className="text-3xl font-black text-slate-800">{patient.name}</p>
              <p className="text-xl font-medium text-slate-600">{patient.rut} | {patient.comuna}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                 {patient.comorbidities.map(c => <span key={c} className="bg-slate-100 px-4 py-2 rounded-xl text-sm font-bold border border-slate-200">{c}</span>)}
              </div>
           </div>
           <div className="space-y-4">
              <h4 className="text-lg font-bold text-rose-800 border-b pb-2">Complicaciones Crónicas</h4>
              <ul className="space-y-4 text-xl">
                 <li className="flex items-center gap-3">
                    <i className={`fa-solid ${patient.complications?.retinopathy ? 'fa-check-circle text-rose-500' : 'fa-circle text-slate-200'}`}></i>
                    <span>Retinopatía Diabética</span>
                 </li>
                 <li className="flex items-center gap-3">
                    <i className={`fa-solid ${patient.complications?.nephropathy ? 'fa-check-circle text-rose-500' : 'fa-circle text-slate-200'}`}></i>
                    <span>Nefropatía (Etapa {patient.complications?.ercStage || 'N/A'})</span>
                 </li>
                 <li className="flex items-center gap-3">
                    <i className={`fa-solid ${patient.neuropathy?.has ? 'fa-check-circle text-rose-500' : 'fa-circle text-slate-200'}`}></i>
                    <span>Neuropatía Periférica</span>
                 </li>
              </ul>
           </div>
        </div>
      )
    },
    {
      title: "Estado de la Herida y Evolución",
      content: (
        <div className="space-y-8 animate-in fade-in duration-500">
           {firstVisit && lastVisit ? (
             <div className="flex justify-between items-center bg-slate-50 p-8 rounded-3xl border border-slate-200">
                <div className="text-center space-y-3">
                   <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Estado Inicial</p>
                   <div className="w-72 h-72 bg-slate-200 rounded-2xl overflow-hidden shadow-2xl border-4 border-white">
                      <img src={firstVisit.photoUrl} className="w-full h-full object-cover" alt="Inicio" />
                   </div>
                   <p className="text-sm font-bold text-slate-500">{formatDate(firstVisit.date)}</p>
                </div>
                <div className="flex flex-col items-center gap-4">
                   <i className="fa-solid fa-arrow-right text-6xl text-blue-500 animate-pulse"></i>
                   <div className={`px-6 py-2 rounded-full text-lg font-black ${
                     lastVisit.evolution === 'Mejor' ? 'bg-emerald-500 text-white' : 
                     lastVisit.evolution === 'Peor' ? 'bg-rose-500 text-white' : 'bg-blue-500 text-white'
                   }`}>
                      {lastVisit.evolution.toUpperCase()}
                   </div>
                </div>
                <div className="text-center space-y-3">
                   <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Estado Actual</p>
                   <div className="w-72 h-72 bg-slate-200 rounded-2xl overflow-hidden shadow-2xl border-4 border-white">
                      <img src={lastVisit.photoUrl} className="w-full h-full object-cover" alt="Actual" />
                   </div>
                   <p className="text-sm font-bold text-slate-500">{formatDate(lastVisit.date)}</p>
                </div>
             </div>
           ) : (
             <div className="p-20 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-300">
                <i className="fa-solid fa-images text-6xl text-slate-200 mb-6"></i>
                <p className="text-2xl font-bold text-slate-400">Sin registros fotográficos suficientes para comparación</p>
             </div>
           )}
        </div>
      )
    },
    {
      title: "Análisis Multidisciplinario (Gemini IA)",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in slide-in-from-right duration-500">
           <div className="md:col-span-1 bg-slate-900 p-8 rounded-3xl text-white shadow-2xl space-y-8">
              <h4 className="text-xl font-bold border-b border-white/10 pb-4">Indicadores SVS/WIfI</h4>
              <div className="grid grid-cols-1 gap-4">
                 <div className="bg-white/5 p-4 rounded-2xl">
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Score WIfI</p>
                    <p className="text-3xl font-black text-blue-400">W{wifi.wound} I{wifi.ischemia} fI{wifi.footInfection}</p>
                 </div>
                 <div className="bg-white/5 p-4 rounded-2xl border border-rose-500/20">
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Riesgo Amputación</p>
                    <p className="text-xl font-black text-rose-400">{wifi.amputationRisk}</p>
                 </div>
                 <div className="bg-white/5 p-4 rounded-2xl border border-emerald-500/20">
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Beneficio Revasc.</p>
                    <p className="text-xl font-black text-emerald-400">{wifi.revascularizationBenefit}</p>
                 </div>
              </div>
           </div>
           <div className="md:col-span-2 bg-indigo-50 border-2 border-indigo-100 p-10 rounded-[40px] relative overflow-hidden shadow-inner min-h-[400px]">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                 <i className="fa-solid fa-wand-magic-sparkles text-8xl text-indigo-600"></i>
              </div>
              {!aiAnalysis && !isAnalyzing ? (
                 <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                    <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-3xl shadow-xl shadow-indigo-200">
                       <i className="fa-solid fa-brain"></i>
                    </div>
                    <div>
                       <h4 className="text-2xl font-black text-indigo-900">Análisis Cognitivo del Caso</h4>
                       <p className="text-indigo-600 font-medium">Gemini 3 procesará la coherencia longitudinal del paciente</p>
                    </div>
                    <button 
                      onClick={generateAIAnalysis}
                      className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-2xl shadow-indigo-200 hover:scale-105 hover:bg-indigo-700 transition-all active:scale-95"
                    >
                       EJECUTAR INSIGHTS CLÍNICOS
                    </button>
                 </div>
              ) : isAnalyzing ? (
                 <div className="flex flex-col items-center justify-center h-full space-y-6">
                    <div className="relative">
                       <div className="w-24 h-24 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                       <i className="fa-solid fa-microchip absolute inset-0 flex items-center justify-center text-2xl text-indigo-600"></i>
                    </div>
                    <p className="text-indigo-800 font-black text-xl animate-pulse">Cruzando historial con guías internacionales...</p>
                 </div>
              ) : (
                 <div className="prose prose-indigo max-w-none text-indigo-900 overflow-y-auto max-h-[350px] font-medium leading-relaxed">
                    <div className="whitespace-pre-wrap text-lg">{aiAnalysis}</div>
                 </div>
              )}
           </div>
        </div>
      )
    }
  ];

  const next = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prev = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col z-[200] overflow-hidden animate-in fade-in duration-300">
       <header className="p-8 border-b border-white/10 flex justify-between items-center text-white bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-blue-500/20">
                <i className="fa-solid fa-users-viewfinder"></i>
             </div>
             <div>
                <h2 className="text-3xl font-black tracking-tight">Comité de Salvataje</h2>
                <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">{patient.name} • {episode.location}</p>
             </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-14 h-14 rounded-full hover:bg-white/10 flex items-center justify-center transition-all active:scale-90"
          >
             <i className="fa-solid fa-xmark text-3xl"></i>
          </button>
       </header>

       <main className="flex-1 flex items-center justify-center p-8 md:p-16 bg-gradient-to-b from-slate-900 to-slate-800">
          <div className="w-full max-w-7xl bg-white rounded-[50px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] p-16 min-h-[700px] flex flex-col justify-center animate-in slide-in-from-bottom-20 duration-700">
             <div className="mb-16 flex items-center justify-between">
                <h3 className="text-5xl font-black text-slate-900 border-l-[12px] border-blue-600 pl-8 leading-none">
                  {slides[currentSlide].title}
                </h3>
                <div className="flex items-center gap-3">
                   <div className="w-12 h-1 bg-blue-600 rounded-full"></div>
                   <span className="text-slate-300 font-black text-3xl italic">{currentSlide + 1} / {slides.length}</span>
                </div>
             </div>
             <div className="flex-1 flex items-center">
                <div className="w-full">
                   {slides[currentSlide].content}
                </div>
             </div>
          </div>
       </main>

       <footer className="p-8 border-t border-white/10 flex justify-between items-center bg-slate-950 px-16">
          <div className="flex gap-6">
             <button 
                onClick={prev} 
                className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all shadow-xl"
             >
                <i className="fa-solid fa-chevron-left text-2xl"></i>
             </button>
             <button 
                onClick={next} 
                className="w-16 h-16 rounded-3xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-500 active:scale-90 transition-all shadow-xl shadow-blue-500/20"
             >
                <i className="fa-solid fa-chevron-right text-2xl"></i>
             </button>
          </div>
          <div className="flex gap-6">
             <button 
              onClick={() => {
                const docCtor = (window as any).jspdf?.jsPDF;
                if (!docCtor) {
                  alert('jsPDF no disponible');
                  return;
                }
                const doc = new docCtor();
                const lines = [
                  `Paciente: ${patient.name} (${patient.rut})`,
                  `Episodio: ${episode.location} - Estrategia: ${episode.strategy}`,
                  `WIfI: W${wifi.wound} I${wifi.ischemia} fI${wifi.footInfection} | Riesgo ${wifi.amputationRisk}`,
                  `Última evolución: ${lastVisit?.evolution || 'N/A'}`,
                  `Análisis IA: ${aiAnalysis || 'Sin análisis IA'}`
                ];
                doc.setFontSize(12);
                doc.text(lines, 10, 15);
                doc.save(`comite-${patient.name.replace(/\s+/g,'-').toLowerCase()}.pdf`);
              }} 
              className="px-10 py-4 rounded-2xl bg-slate-800 text-white font-black text-sm hover:bg-slate-700 transition-all active:scale-95 flex items-center gap-3"
             >
                <i className="fa-solid fa-file-pdf"></i> EXPORTAR COMITÉ
             </button>
          </div>
       </footer>
    </div>
  );
};

export default PresentationView;
