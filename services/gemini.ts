import { Patient, Visit, Episode } from '../types';
import { calculateWifi } from '../utils';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const geminiService = {
    async generateClinicalSummary(patient: Patient, episode: Episode, visit: Visit, history: Visit[]): Promise<string> {
        if (!API_KEY) throw new Error('API Key no configurada');

        const wifi = calculateWifi(episode, visit);
        const age = patient.birthDate ? new Date().getFullYear() - new Date(patient.birthDate).getFullYear() : 'N/A';

        // Contexto clínico resumido
        const prompt = `Actúa como un Médico Especialista en Pie Diabético. Genera un resumen clínico conciso y técnico de esta atención para la ficha médica.
    
    PACIENTE: ${patient.name} (${age} años aprox).
    COMORBILIDADES: ${patient.comorbidities.join(', ')}.
    
    LESIÓN:
    - Ubicación: ${episode.location}.
    - Estado actual: ${visit.evolution} respecto a la última vez.
    - Dimensiones: ${visit.size?.length}x${visit.size?.width}x${visit.size?.depth} cm.
    - WIfI Score: W${wifi.wound} I${wifi.ischemia} fI${wifi.footInfection} (Riesgo Amputación: ${wifi.amputationRisk}).
    - Infección: ${visit.infectionToday?.has ? `SÍ (${visit.infectionToday.severity || 'Leve'})` : 'NO'}.
    
    TRATAMIENTO ACTUAL:
    - Antibióticos: ${visit.atb?.inCourse ? `SÍ (${visit.atb.scheme || 'Consultar'})` : 'NO'}.
    - Descarga: ${visit.offloading?.required ? `SÍ (${visit.offloading.type || 'Indicada'})` : 'NO'}.
    - Plan: ${visit.plan}.
    
    ESTRUCTURA DEL RESUMEN:
    1. Paciente con [Comorbilidades] presenta úlcera en [Ubicación] de [Dimensiones] cm. 
    2. Evolución [Evolución] con riesgo WIfI [Riesgo Amputación]. 
    3. Conducta: [Plan] y [Descarga].
    
    Genera un texto de un solo párrafo, máximo 150 palabras. Evita repeticiones.`;

        try {
            // Usando el modelo Gemini 1.5 Flash (o 2.0 si disponible endpoint)
            // Nota: 2.0 flash experimental puede tener otro endpoint, usamos el estándar 1.5 flash que es rápido y estable
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            maxOutputTokens: 250,
                            temperature: 0.3
                        }
                    }),
                }
            );

            if (!response.ok) throw new Error(`Error Gemini: ${response.status}`);
            const data = await response.json();
            return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No se pudo generar el resumen.';
        } catch (error) {
            console.error('Gemini Error:', error);
            return 'Error al conectar con el servicio de IA.';
        }
    }
};
