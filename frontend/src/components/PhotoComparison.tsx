
import React, { useState } from 'react';
import { Visit } from '../types';
import { formatDate } from '../utils';

interface PhotoComparisonProps {
  visits: Visit[];
}

const PhotoComparison: React.FC<PhotoComparisonProps> = ({ visits }) => {
  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(visits.length > 1 ? 1 : 0);

  if (visits.length === 0) return <div className="p-12 text-center text-slate-400">No hay fotos para comparar.</div>;

  return (
    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
           <div className="flex justify-between items-center mb-4">
              <select 
                className="text-sm font-bold bg-slate-50 border border-slate-200 rounded px-2 py-1"
                value={leftIndex}
                onChange={e => setLeftIndex(Number(e.target.value))}
              >
                {visits.map((v, i) => <option key={v.id} value={i}>{formatDate(v.date)}</option>)}
              </select>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                visits[leftIndex].evolution === 'Mejor' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {visits[leftIndex].evolution}
              </span>
           </div>
           <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
              <img src={visits[leftIndex].photoUrl} className="w-full h-full object-cover" alt="Visita Izquierda" />
           </div>
           <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="p-1.5 bg-slate-50 rounded"><p className="text-[10px] text-slate-400 font-bold">L: {visits[leftIndex].size.length}mm</p></div>
              <div className="p-1.5 bg-slate-50 rounded"><p className="text-[10px] text-slate-400 font-bold">W: {visits[leftIndex].size.width}mm</p></div>
              <div className="p-1.5 bg-slate-50 rounded"><p className="text-[10px] text-slate-400 font-bold">D: {visits[leftIndex].size.depth}mm</p></div>
           </div>
        </div>

        <div className="flex items-center justify-center text-slate-300">
           <i className="fa-solid fa-arrows-left-right text-3xl hidden md:block"></i>
           <i className="fa-solid fa-arrows-up-down text-3xl md:hidden"></i>
        </div>

        <div className="flex-1 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
           <div className="flex justify-between items-center mb-4">
              <select 
                className="text-sm font-bold bg-slate-50 border border-slate-200 rounded px-2 py-1"
                value={rightIndex}
                onChange={e => setRightIndex(Number(e.target.value))}
              >
                {visits.map((v, i) => <option key={v.id} value={i}>{formatDate(v.date)}</option>)}
              </select>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                visits[rightIndex].evolution === 'Mejor' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {visits[rightIndex].evolution}
              </span>
           </div>
           <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
              <img src={visits[rightIndex].photoUrl} className="w-full h-full object-cover" alt="Visita Derecha" />
           </div>
           <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="p-1.5 bg-slate-50 rounded"><p className="text-[10px] text-slate-400 font-bold">L: {visits[rightIndex].size.length}mm</p></div>
              <div className="p-1.5 bg-slate-50 rounded"><p className="text-[10px] text-slate-400 font-bold">W: {visits[rightIndex].size.width}mm</p></div>
              <div className="p-1.5 bg-slate-50 rounded"><p className="text-[10px] text-slate-400 font-bold">D: {visits[rightIndex].size.depth}mm</p></div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoComparison;
