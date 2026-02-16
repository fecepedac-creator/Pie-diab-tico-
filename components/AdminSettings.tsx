
import React, { useState } from 'react';
import { ClinicalConfig } from '../types.ts';

interface Props {
    config: ClinicalConfig;
    onUpdate: (newConfig: ClinicalConfig) => void;
}

const AdminSettings: React.FC<Props> = ({ config, onUpdate }) => {
    const [saving, setSaving] = useState(false);
    const [localConfig, setLocalConfig] = useState(config);

    const handleToggle = (scale: keyof ClinicalConfig['activeScales']) => {
        setLocalConfig(prev => ({
            ...prev,
            activeScales: {
                ...prev.activeScales,
                [scale]: !prev.activeScales[scale]
            }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            onUpdate(localConfig);
            alert('Configuración guardada correctamente');
        } catch (e) {
            alert('Error al guardar: ' + (e as Error).message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl bg-white rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 font-display">Configuración Clínica</h2>

            <p className="text-slate-600 mb-8">
                Selecciona qué escalas de evaluación estarán disponibles para todo el equipo.
            </p>

            <div className="space-y-4">
                {[
                    { id: 'wifi', name: 'WIfI (Sociedad de Cirugía Vascular)', desc: 'Wound, Ischemia, Foot Infection' },
                    { id: 'wagner', name: 'Escala de Wagner', desc: 'Clasificación de profundidad y gangrena' },
                    { id: 'texas', name: 'Escala de Texas', desc: 'Clasificación por Estadio (Isquemia/Infección) y Grado' }
                ].map(scale => (
                    <div
                        key={scale.id}
                        className={`flex items-center justify-between p-4 rounded-lg border transition-all ${localConfig.activeScales[scale.id as keyof ClinicalConfig['activeScales']]
                                ? 'border-indigo-200 bg-indigo-50/30'
                                : 'border-slate-100 bg-slate-50/30'
                            }`}
                    >
                        <div>
                            <h3 className="font-semibold text-slate-800">{scale.name}</h3>
                            <p className="text-sm text-slate-500">{scale.desc}</p>
                        </div>
                        <button
                            onClick={() => handleToggle(scale.id as keyof ClinicalConfig['activeScales'])}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localConfig.activeScales[scale.id as keyof ClinicalConfig['activeScales']] ? 'bg-indigo-600' : 'bg-slate-200'
                                }`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localConfig.activeScales[scale.id as keyof ClinicalConfig['activeScales']] ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-10 pt-6 border-t border-slate-100 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 transition-all disabled:opacity-50"
                >
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>
        </div>
    );
};

export default AdminSettings;
