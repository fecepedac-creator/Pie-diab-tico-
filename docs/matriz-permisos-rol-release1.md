# Matriz de permisos por rol — Release 1 (Piloto operativo)

Objetivo: acordar datos, acciones y alcance de caso en la candidata local `011db37`. **Propuesta R0 pendiente de aprobación clínica, enfermería y TI/seguridad; no habilita datos reales.** Cuenta autenticada, centro activo y membresía activa en el centro solicitado son precondiciones para toda acción. Se deniega por defecto.

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
- **R:** centros y configuración de plataforma; sin lectura clínica implícita.
- **E/G:** alta, edición, suspensión y archivo de centros; alta/invitación de administradores de centro; configuración de parámetros globales del sistema.
- **V:** no valida contenido clínico.
- **Restricción:** no ingresa ni modifica historia clínica de pacientes por interfaz clínica.

### Administrador de centro
- **Ámbito:** centro propio.
- **R:** miembros, configuración y auditoría operativa del centro; sin lectura clínica implícita.
- **E:** alta/edición de usuarios y perfiles, edición de datos de centro, estados de centro (activo/suspendido), configuración mínima.
- **V:** aprobar accesos; reasignar/confirmar tareas operativas.
- **Restricción:** no puede editar el contenido clínico de otra clínica fuera de su centro.

### TENS
- **R:** su preingreso asignado, episodios relacionados, fotos del caso en curso.
- **E:** abrir preingreso (datos de identificación + anamnesis inicial), registrar fotos pre/post de curación, consentimientos de fotografía.
- **V:** no debe validar sección médica ni cerrar atención.
- **Restricción:** no puede crear/editar evaluaciones de enfermería/médicas ni tareas de derivación.

### Enfermería
- **R:** todos los pacientes, episodios, atenciones y fotos de **su centro** durante el piloto, sujeto a ratificación clínica y TI/seguridad; nunca otro centro.
- **E:** completar sección de enfermería (curación, cuidados, materiales), observaciones y estados parciales.
- **V:** confirmar sección de enfermería, revisar/aceptar/rechazar calidad de fotos, completar parte de la derivación si corresponde.
- **Restricción:** no puede completar campos WIfI ni evaluación/plan médico principal.

### Médico de pie
- **R:** todos los pacientes, episodios, atenciones y fotos de **su centro** durante el piloto, sujeto a ratificación clínica y TI/seguridad; nunca otro centro.
- **E:** valoración de herida/WIfI, revisión clínica, plan de tratamiento, solicitud de exámenes, resolución de tareas de su centro.
- **V:** confirmar secciones médicas y cerrar atención cuando esté completa.
- **Restricción:** no administra usuarios ni configuración de centro.

### Coordinación clínica / CX
- **R:** vista operativa mínima de casos y tareas de su centro; sin historia clínica completa por este rol aislado.
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

## Matriz por dato y acción

| Dato / acción | Acceso propuesto | Límite que debe probarse o decidirse |
|---|---|---|
| Identidad, contacto, búsqueda y alta | Coordinación `R/E` mínimo; TENS `R/E` asignado; enfermería/medicina `R/E` centro | TENS no ve otros asignados; ninguna membresía cruza centros. |
| Anamnesis clínica | TENS `R/E` borrador asignado; enfermería/medicina `R/E/V` centro | TENS no valida ni sobrescribe secciones omitidas. Coordinación recibe proyección mínima. |
| Contexto social | TENS borrador asignado; trabajo social caso derivado; enfermería/medicina centro | Trabajo social aislado no recibe anamnesis clínica completa; ratificar validación social. |
| Herida, WIfI, curación y plan | Enfermería/medicina `R` centro; ambas `E` herida; enfermería `E/V` curación; medicina `E/V` WIfI y plan | Cierre según tipo de atención; TENS no confirma. Acordar cierre de atención sólo de enfermería. |
| Consentimiento y fotos de herida | TENS `E` captura asignada; enfermería/medicina `R/E/V` centro; especialidad `R` caso derivado vigente | Consentimiento por episodio antes de capturar; retiro, evidencia y fotos históricas pendientes. URL temporal no sustituye autorización. |
| Foto de perfil | TENS asignado y enfermería/medicina según permisos de carga/lectura | Requiere autorización institucional separada de fotos de herida; usar iniciales si falta. |
| Tarea y respuesta | Coordinación seguimiento operativo; enfermería/medicina gestión centro; especialidad o trabajo social `R/E/V` tarea dirigida y asignada vigente | Especialidad no edita aporte tratante. Cierre/rechazo corta acceso derivado salvo otro rol vigente. Acordar colaboración por especialidad. |
| Adjuntos y resumen/comité | Enfermería/medicina centro; especialidad caso derivado vigente y documentos permitidos | Exportación y destinatarios pendientes. Fisiatría no dispone de carga general de adjuntos en esta candidata; no prometerla. |
| Usuarios, configuración y bitácora | Admin de centro administra su centro; superadmin administra plataforma; auditor/admin/coordinación leen bitácora según rol | Estos roles aislados no reciben historia clínica. Bitácora no concede acceso a imágenes ni narrativa. |
| Registro institucional | Profesional designado revisa y traslada; custodio comprueba recepción | La plataforma no firma ni escribe automáticamente en la ficha; procedimiento pendiente. |

## Perfiles combinados y aceptación

Las capacidades se suman **por dato y acción dentro de la misma membresía de centro**. `center_admin + nurse` puede administrar y ejercer enfermería; `center_admin` solo no ve pacientes. `auditor + doctor` puede consultar bitácora y ejercer medicina, sin modificar auditoría. `tens + social_worker` sólo ve sus preingresos asignados y tareas sociales activas. `nurse + doctor` puede actuar en ambas secciones; cada confirmación conserva autor y perfil ejercido. Una membresía de otro centro nunca se hereda.

Para aprobar: registrar versión, identidad sintética, centro, solicitud, resultado y evidencia de listado, detalle, foto, adjunto, escritura, revocación, tarea reasignada/cerrada y respuesta tras guardar, usando dos centros y los perfiles combinados anteriores. La cobertura local previa no prueba el destino de piloto.

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

Responsable clínico, enfermería referente y TI/seguridad: **pendiente**. Registrar nombres, fecha, decisión, versión `011db37` y referencia en el acta R0 de `closure-alcance-release1.md`; no duplicar firmas aquí.

