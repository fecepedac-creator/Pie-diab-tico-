
import React from 'react';
import { ReferralReport } from '../types';
import { formatDate } from '../utils';

interface SurgicalInboxProps {
  referrals: ReferralReport[];
  onMarkAsRead: (id: string) => void;
  onNavigateEpisode: (id: string) => void;
}

const SurgicalInbox: React.FC<SurgicalInboxProps> = ({ referrals, onMarkAsRead, onNavigateEpisode }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Bandeja de Interconsultas Quirúrgicas</h2>
        <span className="text-sm text-slate-500">{referrals.filter(r => r.status === 'Pendiente').length} Solicitudes nuevas</span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {referrals.length === 0 ? (
          <div className="p-20 text-center bg-white rounded-xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-medium">No hay solicitudes de evaluación en este momento.</p>
          </div>
        ) : (
          referrals.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(ref => (
            <div key={ref.id} className={`bg-white p-6 rounded-xl border shadow-sm transition-all ${ref.status === 'Pendiente' ? 'border-blue-400 shadow-blue-50' : 'border-slate-200'}`}>
              <div className="flex justify-between items-start mb-4">
                 <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatDate(ref.date)}</span>
                    <h3 className="font-bold text-slate-800 text-lg">Solicitud de evaluación</h3>
                    <p className="text-xs text-blue-600 font-bold">Enviado por: {ref.senderRole}</p>
                 </div>
                 {ref.status === 'Pendiente' && <span className="bg-blue-600 text-white text-[10px] px-2 py-1 rounded font-bold uppercase">Nueva</span>}
              </div>
              
              <div className="bg-slate-50 p-4 rounded-lg font-mono text-[11px] whitespace-pre-wrap text-slate-700 border border-slate-100 mb-4">
                 {ref.content}
              </div>

              <div className="flex justify-end gap-3">
                 <button 
                  onClick={() => { onMarkAsRead(ref.id); onNavigateEpisode(ref.episodeId); }}
                  className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-900 transition-all"
                 >
                   Ver Episodio y Fotos
                 </button>
                 {ref.status === 'Pendiente' && (
                   <button 
                    onClick={() => onMarkAsRead(ref.id)}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-all"
                   >
                     Marcar como revisado
                   </button>
                 )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SurgicalInbox;
