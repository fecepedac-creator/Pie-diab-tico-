# Demostración del valor para el equipo piloto

**Estado:** guía para una conversación de 20 minutos con datos ficticios. No habilita uso con pacientes reales ni sustituye las aprobaciones R0, la validación móvil o el cierre de T6. No identificar al centro en esta versión.

## Idea central para presentar

«Cada integrante ve el mismo episodio desde su función, registra una vez su aporte y encuentra lo que necesita para continuar. Durante el piloto, la ficha electrónica institucional sigue siendo el registro oficial; cada profesional revisa y copia allí el texto final de su propia atención».

Mostrar el ahorro de pasos y la continuidad con **un solo caso ficticio**. Evitar prometer minutos ahorrados, diagnóstico automático o integración con la ficha oficial: todavía no hay medición ni integración que lo sustente.

## Recorrido de 20 minutos

| Tiempo | Mostrar | Beneficio que debe comprobar el equipo | Estado de la evidencia |
| --- | --- | --- | --- |
| 2 min | Presentar el caso y las pestañas por perfil. | Cada persona encuentra su trabajo sin navegar por funciones ajenas. | La vista sintética local cambia de perfil y no guarda datos. |
| 3 min | **TENS:** preingreso rápido, fotos antes/después, estado «Terminar y enviar registro fotográfico». | La entrega a enfermería queda visible; TENS no tiene que cerrar una atención clínica. | En canary se verificó una entrega sintética y su estado; la demo local es sólo visual. |
| 4 min | **Enfermería:** preingreso completo, curación estructurada, comparación de fotos y revisión de calidad, borrador y texto de evolución. | Ordena datos repetidos, identifica fotos pendientes y prepara un texto revisable para la ficha oficial. | Flujos en candidata; la recepción de la entrega TENS se observó en canary. Falta validación móvil V06/V10/V11. |
| 4 min | **Medicina:** caracterización, WIfI, evolución longitudinal, plan, derivación y texto médico para la ficha. | Reúne antecedentes y evolución sin rehacer el resumen; mantiene separadas las confirmaciones de cada profesional. | Funciones presentes en candidata; no afirmar exactitud clínica ni ahorro medido. |
| 3 min | **Fisiatría:** abrir una derivación ficticia, leer motivo/resumen/fotos cronológicas y ver apartados para preparar respuesta. | Recibe contexto clínico antes de decidir descarga, función y plan; su aporte queda separado de la evolución tratante. | Vista y atajos presentes en candidata; la respuesta de fisiatría necesita validación con el equipo y móvil real. |
| 2 min | **Comité:** cronología y resumen del mismo episodio. | El caso llega ordenado para discusión; toda decisión se registra luego en la ficha oficial. | Vista presente en candidata; documento de apoyo, no acta clínica oficial. |
| 2 min | Cerrar con el texto para ficha y recoger comentarios. | Preguntar qué trabajo evita, qué obliga a repetir y qué impediría usarlo. | La copia a la ficha es un procedimiento propuesto, pendiente de aprobación institucional. |

## Cómo abrir la vista segura

Desde la raíz de una instalación local de esta candidata, ejecutar `npm run dev -- --host 127.0.0.1 --port 5194` y abrir `http://127.0.0.1:5194/clinical-preview.html`. Se comprobó que la página y su módulo responden HTTP 200 en la candidata de esta guía. La página monta `ProfileDemoDashboard` con un paciente, centro, fotos y tareas **ficticios** y muestra «MODO DEMO · SOLO VISUALIZACIÓN». Cambiar entre TENS, Enfermería, Médico y Fisiatra desde el panel lateral. El acceso desde «Plataforma → Demostración de perfiles» existe para una cuenta con rol de superadministración; la cuenta `center_admin` por sí sola no muestra esa pestaña. La vista local permite ensayar el relato sin credenciales ni registros clínicos.

Antes de reunirse: abrir cada perfil y comprobar que carga; preparar la pantalla de enfermería y la de fisiatría; ampliar texto del navegador si se proyecta. Para enseñar guardado real, usar **sólo** el proyecto canary dedicado, una identidad y caso confirmados como ficticios y una ventana coordinada; separar claramente esa prueba funcional de la vista de demostración. No crear ni mostrar datos reales en esta reunión.

## Tres preguntas al terminar

1. «¿Qué parte de tu trabajo te evita repetir y cuál todavía te hace duplicar información?»
2. «¿Qué dato o aviso necesitarías ver primero al abrir tu perfil?»
3. «¿Qué paso te impediría usarlo en una jornada real, especialmente desde el teléfono?»

Registrar por perfil la respuesta y una prioridad. Pedir una prueba con usuarios autorizados en móvil real antes de llamar al flujo listo para piloto. Las sugerencias de nuevas especialidades, automatizaciones o integración con la ficha se anotan para otra etapa.

## No presentar como terminado

- Consentimiento institucional completo: existe borrador conversado, pero aún faltan aprobación y registro de las elecciones separadas.
- Respaldo operativo de fotos: en el piloto quedarían sólo en Pie Diabético; el ensayo de centinelas no demuestra recuperación de las imágenes clínicas.
- Auditoría administrativa integral: las vías por Auth, Admin SDK, consola/CLI y despliegue todavía requieren inventario y control completo.
- MFA, retención, recuperación en 48 horas, validación móvil y seis decisiones R0: siguen pendientes.

Fuentes: [alcance R1](closure-alcance-release1.md), [estado vigente](CURRENT_STATE.md), [evidencia T6](T6_CANARY_PREFLIGHT_2026-09-27.md), componentes `ProfileDemoDashboard`, `EncounterWorkspace`, `SpecialistCaseSummary` y `CommitteeView` de esta candidata.
