# Matriz de permisos por rol — Release 1 (Piloto operativo)

Objetivo: alinear qué puede hacer cada perfil en producción piloto para evitar ambigüedad de alcance y asegurar trazabilidad.

## Convención
- **Lectura (R):** puede visualizar.
- **Edición (E):** puede crear/actualizar.
- **Validación (V):** puede confirmar o cerrar secciones/estados.
- **Gestión (G):** acciones de configuración o administración.
- **No aplica (N/A):** no corresponde al flujo.

## Alcance válido (Release 1)

- Preingreso (paciente, anamnesis médica/social, consentimiento).
- Episodio y atención compartida (fotos, herida/WIfI/enfermería/médico).
- Tareas/derivaciones entre perfiles.
- Adjuntos y documentación del episodio.
- Comité y resumen clínico.
- Dashboards de administración plataforma/centro.
- Auditoría/bitácora de eventos críticos.

## Perfil por perfil

### Superadmin (plataforma)
- **Ámbito:** todos los centros y configuración global.
- **R:** pacientes/atenciones/centros/auditorías de cualquier centro.
- **E/G:** alta, edición, suspensión y archivo de centros; alta/invitación de administradores de centro; configuración de parámetros globales del sistema.
- **V:** no valida contenido clínico.
- **Restricción:** no ingresa ni modifica historia clínica de pacientes por interfaz clínica.

### Administrador de centro
- **Ámbito:** centro propio.
- **R:** pacientes, atenciones, tareas, adjuntos y auditoría operativa del centro.
- **E:** alta/edición de usuarios y perfiles, edición de datos de centro, estados de centro (activo/suspendido), configuración mínima.
- **V:** aprobar accesos; reasignar/confirmar tareas operativas.
- **Restricción:** no puede editar el contenido clínico de otra clínica fuera de su centro.

### TENS
- **R:** su preingreso asignado, episodios relacionados, fotos del caso en curso.
- **E:** abrir preingreso (datos de identificación + anamnesis inicial), registrar fotos pre/post de curación, consentimientos de fotografía.
- **V:** no debe validar sección médica ni cerrar atención.
- **Restricción:** no puede crear/editar evaluaciones de enfermería/médicas ni tareas de derivación.

### Enfermería
- **R:** preingreso del episodio asignado al centro, atenciones activas, fotos y tareas asociadas.
- **E:** completar sección de enfermería (curación, cuidados, materiales), observaciones y estados parciales.
- **V:** confirmar sección de enfermería, revisar/aceptar/rechazar calidad de fotos, completar parte de la derivación si corresponde.
- **Restricción:** no puede completar campos WIfI ni evaluación/plan médico principal.

### Médico de pie
- **R:** paciente/episodio/atención y contenido de enfermería del mismo caso.
- **E:** valoración de herida/WIfI, revisión clínica, plan de tratamiento, solicitud de exámenes, resolución de tareas de su centro.
- **V:** confirmar secciones médicas y cerrar atención cuando esté completa.
- **Restricción:** no administra usuarios ni configuración de centro.

### Coordinación clínica / CX
- **R:** casos activos de su centro, tareas derivadas, vista de progreso por paciente.
- **E:** crear tareas de coordinación/solicitud externa, actualizar estado de seguimiento.
- **V:** confirmar tareas cerradas y priorización.
- **Restricción:** no puede editar campos clínicos de WIfI, enfermería o cierre médico.

### Cirugía vascular / vascular enfermería / cirugía general / traumatología / fisiatría
- **R:** casos asignados al rol.
- **E:** registrar respuesta de consulta/encuentro derivado; adjuntar exámenes propios si aplica.
- **V:** confirmar resolución de gestión según su rol y dejar evidencia.
- **Restricción:** no editar episodios clínicos completos fuera de su respuesta asignada.

### Trabajo social / Asistente social
- **R:** casos con tareas sociales asignadas y preingreso social del paciente.
- **E:** registrar antecedentes sociales, barreras de acceso, situación familiar/laboral relevante.
- **V:** cerrar tareas sociales y observaciones de respuesta.
- **Restricción:** no realiza cierre médico de atención.

### Auditor
- **R:** historial de cambios y bitácora del centro.
- **E:** no.
- **V:** no.
- **Restricción:** no modifica registros clínicos ni administrativos.

## Estados de flujo (mínimos v1)

- **Borrador:** registro parcial no listo para usar clínicamente.
- **Guardado:** cambios persistidos en versión actual, sin validación requerida.
- **Conflicto:** versión desincronizada (se exige recarga antes de guardar).
- **Enviado:** atención marcada como `ready_for_review` o tarea derivada con destinatario.
- **Validado:** sección o estado clínico cerrado por perfil competente (médico/nurse según sección).

## Matriz de decisiones (acciones no permitidas en Release 1)

- Editar o cerrar atención sin rol autorizado: **rechazado 403**.
- Guardar fotos sin consentimiento activo: **rechazado 400**.
- Cerrar atención sin secciones requeridas: **rechazado 400**.
- Acceso a centros/episodios fuera de membresía: **rechazado 403**.
- Editar centro/platforma sin rol de administración: **rechazado 403**.

## Aprobación de matriz (release 1)

- Responsable clínico: ___________________________  Fecha: __/__/____  
- Responsable TI/seguridad: ______________________  Fecha: __/__/____  
- Sponsor operativo: _____________________________  Fecha: __/__/____

