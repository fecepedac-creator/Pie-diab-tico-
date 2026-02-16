
import React, { useState, useRef } from 'react';
import { Patient, Episode, Visit, UserRole } from '../types';
import { formatDate, generateId } from '../utils';
import { api } from '../services/api';

interface Props {
    patients: Patient[];
    episodes: Episode[];
    onSaveVisit: (visit: Visit) => void;
    authToken: string | null;
    activeCenterId: string;
}

const ParamedicView: React.FC<Props> = ({ patients, episodes, onSaveVisit, authToken, activeCenterId }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
    const [photoUrl, setPhotoUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredPatients = patients.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.rut.includes(searchTerm)
    );

    const handlePhotoUpload = async (file?: File) => {
        if (!file) return;
        setUploading(true);
        const reader = new FileReader();
        reader.onload = async () => {
            const dataUrl = String(reader.result);
            if (authToken) {
                try {
                    const uploaded = await api.uploadPhoto(authToken, dataUrl, file.name);
                    setPhotoUrl(uploaded.url);
                } catch (e) {
                    alert('Error al subir foto: ' + (e as Error).message);
                }
            } else {
                setPhotoUrl(dataUrl);
            }
            setUploading(false);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = () => {
        if (!selectedEpisode || !photoUrl) return;

        const visit: Visit = {
            id: generateId(),
            episodeId: selectedEpisode.id,
            date: new Date().toISOString(),
            professionalId: 'paramedic-1', // Should be current user ID
            professionalRole: UserRole.PARAMEDIC,
            centerId: activeCenterId,
            photoUrl,
            evolution: 'Igual', // Default
            size: { length: 0, width: 0, depth: 0 },
            infectionToday: { has: false },
            atb: { inCourse: false },
            culture: { taken: false, resultStatus: 'No tomado' },
            plan: 'Registro Fotográfico (TENS)',
            responsiblePlan: UserRole.PARAMEDIC,
            nursingTactics: { cleaning: '', debridement: '', dressings: [], advancedTherapies: [] }
        };

        onSaveVisit(visit);
        alert('Foto guardada correctamente');
        setPhotoUrl('');
        setSelectedEpisode(null);
        setSelectedPatient(null);
        setSearchTerm('');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Captura Fotográfica Rápida</h2>
                <p className="text-slate-500 mb-6">Seleccione paciente y herida para actualizar el registro visual.</p>

                {!selectedPatient ? (
                    <div>
                        <input
                            type="text"
                            placeholder="Buscar por Nombre o RUT..."
                            className="w-full p-4 text-lg border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none mb-4"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <div className="space-y-2">
                            {searchTerm && filteredPatients.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => setSelectedPatient(p)}
                                    className="p-4 bg-slate-50 hover:bg-blue-50 cursor-pointer rounded-xl transition-colors flex justify-between items-center"
                                >
                                    <div>
                                        <p className="font-bold text-slate-800">{p.name}</p>
                                        <p className="text-sm text-slate-500">{p.rut}</p>
                                    </div>
                                    <i className="fa-solid fa-chevron-right text-slate-400"></i>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : !selectedEpisode ? (
                    <div>
                        <button onClick={() => setSelectedPatient(null)} className="text-sm text-slate-500 mb-4 hover:text-blue-600">
                            <i className="fa-solid fa-arrow-left"></i> Volver a buscar
                        </button>
                        <h3 className="font-bold text-lg mb-4">Seleccione la Herida de {selectedPatient.name}:</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {episodes.filter(e => e.patientId === selectedPatient.id && e.isActive).map(ep => (
                                <div
                                    key={ep.id}
                                    onClick={() => setSelectedEpisode(ep)}
                                    className="p-4 border border-slate-200 rounded-xl hover:border-blue-500 cursor-pointer transition-all bg-white shadow-sm"
                                >
                                    <p className="font-bold text-slate-800">{ep.location}</p>
                                    <p className="text-sm text-slate-500">Iniciado: {formatDate(ep.startDate)}</p>
                                </div>
                            ))}
                            {episodes.filter(e => e.patientId === selectedPatient.id && e.isActive).length === 0 && (
                                <p className="text-slate-500 italic">No hay episodios activos.</p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div>
                        <button onClick={() => setSelectedEpisode(null)} className="text-sm text-slate-500 mb-4 hover:text-blue-600">
                            <i className="fa-solid fa-arrow-left"></i> Volver a episodios
                        </button>

                        <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-300 text-center">
                            {photoUrl ? (
                                <div className="relative aspect-video max-w-md mx-auto rounded-xl overflow-hidden shadow-lg mb-4">
                                    <img src={photoUrl} className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => setPhotoUrl('')}
                                        className="absolute top-2 right-2 bg-rose-500 text-white w-8 h-8 rounded-full shadow-md"
                                    >
                                        <i className="fa-solid fa-times"></i>
                                    </button>
                                </div>
                            ) : (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="py-12 cursor-pointer hover:bg-slate-100 transition-colors rounded-xl"
                                >
                                    <i className="fa-solid fa-camera text-4xl text-slate-300 mb-3"></i>
                                    <p className="font-bold text-slate-600">Toque aquí para tomar/subir foto</p>
                                </div>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e => handlePhotoUpload(e.target.files?.[0])}
                            />
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={!photoUrl || uploading}
                            className="w-full mt-6 py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {uploading ? 'Subiendo...' : 'Guardar Registro'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ParamedicView;
