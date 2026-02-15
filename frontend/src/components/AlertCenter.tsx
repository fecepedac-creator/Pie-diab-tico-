
import React from 'react';
import { Alert } from '../types';
import { formatDate } from '../utils';

interface AlertCenterProps {
  alerts: Alert[];
  onNavigateEpisode: (id: string) => void;
}

const AlertCenter: React.FC<AlertCenterProps> = ({ alerts, onNavigateEpisode }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Centro de Alertas y Notificaciones</h2>
        <span className="text-sm text-slate-500 font-medium">{alerts.length} Alertas activas en el sistema</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {alerts.length === 0 ? (
          <div className="p-20 text-center space-y-4">
             <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl">
                <i className="fa-solid fa-check-double"></i>
             </div>
             <p className="text-slate-400 font-medium">No hay alertas críticas pendientes de gestión.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {alerts.map(alert => (
              <div key={alert.id} className="p-6 hover:bg-slate-50 transition-colors flex gap-6 items-start">
                 <div className={`mt-1 w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                   alert.severity === 'High' ? 'bg-rose-100 text-rose-600 shadow-sm shadow-rose-100' : 'bg-amber-100 text-amber-600 shadow-sm shadow-amber-100'
                 }`}>
                   <i className="fa-solid fa-triangle-exclamation"></i>
                 </div>
                 <div className="flex-1">
                    <div className="flex justify-between mb-2">
                       <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                         alert.severity === 'High' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                       }`}>
                         Prioridad {alert.severity === 'High' ? 'Crítica' : 'Media'}
                       </span>
                       <span className="text-xs text-slate-400 font-mono">{formatDate(alert.createdAt)}</span>
                    </div>
                    <p className="text-slate-800 font-bold text-lg mb-2">{alert.message}</p>
                    <div className="flex items-center gap-4">
                       {alert.episodeId && (
                         <button 
                           onClick={() => onNavigateEpisode(alert.episodeId!)}
                           className="text-sm bg-blue-50 text-blue-600 font-bold px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors"
                         >
                           Gestionar Episodio
                         </button>
                       )}
                       <button className="text-sm text-slate-400 font-bold hover:text-slate-600">Marcar como leída</button>
                    </div>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertCenter;
