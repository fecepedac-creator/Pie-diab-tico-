
import React, { useState } from 'react';
import { Patient, UserRole } from '../types';
import { formatRUT, validateRUT, generateId } from '../utils';

interface PatientListProps {
  patients: Patient[];
  onSelectPatient: (id: string) => void;
  onAddPatient: (p: Patient) => void;
  role: UserRole;
  activeCenterId: string;
}

const PatientList: React.FC<PatientListProps> = ({ patients, onSelectPatient, onAddPatient, role, activeCenterId }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  
  const [newPatient, setNewPatient] = useState<Partial<Patient>>({
    name: '',
    rut: '',
    comuna: '',
    comorbidities: [],
    complications: { retinopathy: false, nephropathy: false, ercStage: 'N/A', iam: { has: false }, acv: { has: false } },
    neuropathy: { has: false, method: 'Monofilamento', lastUpdate: new Date().toISOString() },
    metabolicTargets: { hba1c: '7.0%', pa: '130/80', ldl: '70', lastDate: new Date().toISOString() }
  });

  const filtered = Array.isArray(patients) ? patients.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.rut.includes(search)
  ) : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient.name || !newPatient.rut) return alert('Nombre y RUT son obligatorios');
    if (!validateRUT(newPatient.rut)) return alert('RUT inválido');
    
    const patient: Patient = {
      ...newPatient as Patient,
      id: generateId(),
      createdAt: new Date().toISOString(),
      labHistory: [],
      imagingHistory: [],
      socialDeterminants: { hasEffectiveSupport: false, livingConditions: '' },
      centerId: activeCenterId
    };
    onAddPatient(patient);
    setShowAdd(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Registro de Pacientes</h2>
        {(role === UserRole.ADMIN || role === UserRole.DOCTOR || role === UserRole.NURSE) && (
          <button 
            onClick={() => setShowAdd(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-sm"
          >
            <i className="fa-solid fa-plus"></i> Nuevo Paciente
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input 
            type="text" 
            placeholder="Buscar por nombre o RUT..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => (
          <div 
            key={p.id} 
            onClick={() => onSelectPatient(p.id)}
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{p.name}</h3>
                <p className="text-sm text-slate-500 font-mono">{p.rut}</p>
              </div>
              <div className="bg-slate-100 px-2 py-1 rounded text-[10px] font-bold text-slate-600 uppercase">
                {p.comuna}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex gap-1 flex-wrap">
                {p.comorbidities && p.comorbidities.map((c, i) => (
                  <span key={i} className="text-[10px] bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">{c}</span>
                ))}
              </div>
              <div className="pt-3 border-t border-slate-50 flex justify-between text-xs text-slate-400">
                <span>Registrado: {new Date(p.createdAt).toLocaleDateString()}</span>
                <i className="fa-solid fa-chevron-right text-slate-300"></i>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400">
            No se encontraron pacientes.
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold">Nuevo Registro Longitudinal</h3>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Completo *</label>
                  <input 
                    required
                    type="text" 
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newPatient.name}
                    onChange={e => setNewPatient({...newPatient, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">RUT * (ej: 12345678-k)</label>
                  <input 
                    required
                    type="text" 
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newPatient.rut}
                    onChange={e => setNewPatient({...newPatient, rut: formatRUT(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Fecha Nacimiento</label>
                  <input 
                    type="date" 
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    onChange={e => setNewPatient({...newPatient, birthDate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Comuna</label>
                  <input 
                    type="text" 
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newPatient.comuna}
                    onChange={e => setNewPatient({...newPatient, comuna: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h4 className="font-bold text-slate-800 mb-3">Antecedentes Médicos</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                   {['HTA', 'DLP', 'Tabaquismo', 'Obesidad', 'ERC', 'EPOC'].map(item => (
                     <label key={item} className="flex items-center gap-2 text-sm p-2 border border-slate-100 rounded bg-slate-50 cursor-pointer hover:bg-white transition-colors">
                       <input 
                        type="checkbox" 
                        onChange={e => {
                          const current = newPatient.comorbidities || [];
                          setNewPatient({
                            ...newPatient, 
                            comorbidities: e.target.checked ? [...current, item] : current.filter(x => x !== item)
                          });
                        }}
                       /> {item}
                     </label>
                   ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-6 py-2 border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-200"
                >
                  Guardar Paciente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientList;