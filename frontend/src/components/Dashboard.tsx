
import React, { useMemo } from 'react';
import { Patient, Episode, Visit, Alert, UserRole } from '../types';
import { formatDate } from '../utils';

interface DashboardProps {
  patients: Patient[];
  episodes: Episode[];
  visits: Visit[];
  alerts: Alert[];
  onNavigateEpisode: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ patients, episodes, visits, alerts, onNavigateEpisode }) => {
  const activeEpisodes = episodes.filter(e => e.isActive);
  
  const stats = [
    { label: 'Pacientes Activos', value: patients.length, color: 'blue', icon: 'fa-users' },
    { label: 'Heridas en Tratamiento', value: activeEpisodes.length, color: 'emerald', icon: 'fa-file-medical' },
    { label: 'Alertas Críticas', value: alerts.filter(a => a.severity === 'High').length, color: 'rose', icon: 'fa-triangle-exclamation' },
    { label: 'En Antibióticos', value: visits.filter(v => episodes.find(e => e.id === v.episodeId)?.isActive && v.atb.inCourse).length, color: 'amber', icon: 'fa-capsules' },
  ];

  const prioritizedEpisodes = useMemo(() => {
    return activeEpisodes.map(ep => {
      const patient = patients.find(p => p.id === ep.patientId);
      const epVisits = visits.filter(v => v.episodeId === ep.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastVisit = epVisits[0];
      const hasPhotoAlert = lastVisit ? (new Date().getTime() - new Date(lastVisit.date).getTime()) / (1000 * 60 * 60 * 24) > 7 : true;
      const isWorse = lastVisit?.evolution === 'Peor';
      const isCritical = alerts.some(a => a.episodeId === ep.id && a.severity === 'High');

      let priority = 3; // Baja
      if (isCritical || isWorse) priority = 1; // Alta
      else if (hasPhotoAlert) priority = 2; // Media

      return { ep, patient, lastVisit, hasPhotoAlert, isWorse, priority, isCritical };
    }).sort((a, b) => a.priority - b.priority);
  }, [activeEpisodes, patients, visits, alerts]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium mb-1">{s.label}</p>
                <p className="text-3xl font-bold text-slate-800">{s.value}</p>
              </div>
              <div className={`w-12 h-12 bg-${s.color}-100 text-${s.color}-600 rounded-full flex items-center justify-center text-xl`}>
                <i className={`fa-solid ${s.icon}`}></i>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Prioridad Operativa de Enfermería</h3>
              <span className="text-xs text-slate-500 font-medium">Ordenado por criticidad</span>
            </div>
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-auto">
              {prioritizedEpisodes.map(({ ep, patient, lastVisit, hasPhotoAlert, priority, isCritical }) => (
                <div 
                  key={ep.id} 
                  onClick={() => onNavigateEpisode(ep.id)}
                  className="p-4 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-10 rounded-full ${priority === 1 ? 'bg-rose-500' : priority === 2 ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                    <div>
                      <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{patient?.name}</h4>
                      <p className="text-xs text-slate-500">{ep.location} • Última visita: {lastVisit ? formatDate(lastVisit.date) : 'Nunca'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {isCritical && <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded text-[10px] font-bold uppercase">Urgente</span>}
                    {hasPhotoAlert && <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[10px] font-bold uppercase">Sin Foto</span>}
                    <i className="fa-solid fa-chevron-right text-slate-300 group-hover:text-blue-500 ml-2"></i>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800">Alertas de Determinantes Sociales</h3>
            </div>
            <div className="p-4 space-y-4">
               {patients.filter(p => p.complications.retinopathy && !p.socialDeterminants?.hasEffectiveSupport).map(p => (
                 <div key={p.id} className="p-3 bg-rose-50 border border-rose-100 rounded-lg flex gap-3">
                    <i className="fa-solid fa-eye-low-vision text-rose-600 mt-1"></i>
                    <div>
                       <p className="text-xs font-bold text-rose-800">{p.name}</p>
                       <p className="text-[10px] text-rose-600 font-medium">Reforzar educación: Retinopatía + Sin red de apoyo.</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
