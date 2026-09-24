# Atención y evolución: responsabilidades e implementación

12 de septiembre de 2026. Implementación local; sin despliegue en producción.

## RACI por módulo

R registra o ejecuta; A responde por la confirmación de su aporte; C aporta evaluación consultada; I recibe información dentro de su permiso. Las responsabilidades clínicas institucionales deben ratificarse por el centro. La plataforma no atribuye responsabilidad profesional por el mero acceso de lectura.

| Módulo | R | A | C | I |
|---|---|---|---|---|
| Identidad y contacto | TENS / coordinación | Persona que registra el cambio | Equipo tratante | Equipo autorizado |
| Herida compartida | Enfermería o médico | Profesional que confirma esa versión | Colega tratante | Especialidad con caso derivado |
| Curación | Enfermería | Enfermería que confirma | Médico tratante | Especialidad del caso |
| Plan médico y WIfI | Médico tratante | Médico que confirma | Cirugía / vascular según derivación | Enfermería y especialidad autorizada |
| Fotos pre/post | TENS, enfermería o médico | Enfermería o médico que revisa calidad | Autor de la captura | Equipo clínico autorizado |
| Evolución de enfermería | Enfermería | Autor de la revisión del texto | Médico para hechos compartidos | Equipo autorizado |
| Evolución médica | Médico | Autor de la revisión del texto | Enfermería para hechos compartidos | Equipo autorizado |
| Derivación clínica | Enfermería / médico solicitante | Profesional que emite la gestión revisada | Especialidad destinataria | Coordinación recibe solo estado operativo |
| Respuesta especializada | Destinatario del caso | Autor de la respuesta | Equipo tratante | Equipo autorizado |
| Gestión social | Trabajo social del caso | Autor del aporte social | Solicitante | Coordinación según ámbito operativo |
| Cierre y adenda | Enfermería / médico habilitado | Autor del cierre o adenda | Participantes de la atención | Equipo autorizado |

Cirugía general, vascular, traumatología, fisiatría y enfermería vascular consultan los episodios derivados a su perfil y responden sin sobrescribir el aporte tratante. Perfiles combinados conservan capacidades por recurso; el selector de espacio de trabajo organiza la navegación.

## Comportamiento implementado

- Servidor: filtrado por recurso de pacientes, atenciones, gestiones y adjuntos; respuestas fotográficas de TENS sin narrativas, adendas ni secciones clínicas; proyección mínima de identidad. TENS no modifica anamnesis. Coordinación no recibe motivo, respuesta ni instantánea clínica de gestiones ajenas a su perfil.
- Atención: resumen de autoría y confirmación por sección; tipos de atención conjunta, médica y de enfermería; bloqueo de cierre con secciones pendientes; validación de porcentajes y selecciones contradictorias.
- Coherencia: una herida compartida; cambios en herida requieren revisar curación, plan y WIfI; cambios en WIfI requieren revisar plan. Las revisiones previas se conservan en servidor. La actualización del equipo es explícita; no se afirma sincronización en tiempo real.
- Concurrencia: rechazo de versión antigua, conservación del borrador en pantalla y recuperación por sección sobre la versión del equipo. Se advierte antes de salir con cambios de campos clínicos sin guardar.
- Fotos: selección pre/post, vista previa, checklist explícito, límite de tamaño, consentimiento, calidad pendiente/aceptada/repetir y motivo. Las fotografías originales permanecen disponibles.
- Evolución: comparador por fecha, pre/pre o post/post, estados reales, dimensiones y componentes WIfI separados; variación de superficie estimada solo con mediciones confirmadas y basal válida. Las atenciones canceladas se excluyen inicialmente.
- WIfI: ayuda desplegable independiente del puntaje y opción no evaluado; campos de fuente, fecha, ITB, presión de tobillo y ortejo, y TcPO₂. Un valor vacío no se convierte en cero.
- Texto: borrador determinístico, revisión editable propia antes de copiar, comprobación de datos de origen en servidor, persistencia de texto revisado con autoría y versión. No se utiliza IA externa.
- Derivación: antecedentes preparados automáticamente desde la atención y conservados al crear la gestión, revisión explícita, respuesta especializada en borrador o confirmada y documentos según rol. Las evaluaciones indicadas en el plan permiten preparar el formulario con destino y motivo inicial, sin duplicar una gestión activa desde ese acceso. La selección de prioridad y emisión siguen siendo profesionales.
- Correcciones: atención cerrada protegida; adendas atribuibles conservan las mediciones originales.

## Criterios clínicos y límites

Los datos ausentes siguen ausentes; no se deduce normalidad, ausencia de infección, procedimiento realizado ni curación desde un campo vacío o una imagen. Largo × ancho es una estimación geométrica; no representa planimetría ni establece cicatrización. W, I y fI se registran por separado sin suma, etapa o decisión terapéutica automática. Fuente clínica para las ayudas: [IWGDF 2023, clasificación](https://iwgdfguidelines.org/classification-2023/).

Las fotos no son obligatorias para cerrar una evaluación clínica por sí mismas. La confirmación de WIfI incompleto exige explicar el motivo. Los documentos cargados y exámenes solicitados no se convierten automáticamente en resultados verificados. La confirmación de esta plataforma no es firma en la ficha institucional.

La duración del acceso después de una derivación conserva la política existente por equipo; no se agregó caducidad automática sin una regla institucional definida. No se implementó diagnóstico de imágenes ni derivación terapéutica automática. Las observaciones y mediciones siguen sujetas a revisión profesional.

## Validación

- Comprobación de tipos, 12 pruebas unitarias, compilación y revisión de sintaxis.
- La ejecución final de emuladores terminó con código 0; se usaron puertos aislados tras un conflicto de arranque. El entorno local ejecutó Node 24, mientras Functions declara Node 22; no se comprobó aquí el runtime desplegado.
- Pruebas de integración en emuladores con identidades y pacientes sintéticos: aislamiento por rol, subida fotográfica de TENS, cierre incompleto, atención cerrada, adenda, revisión de texto y rechazo de fuente desactualizada; junto con las pruebas existentes del proyecto.
- Revisión visual local de atención y WIfI a 390 × 844: ayuda sin alterar el grado y corrección de desbordamiento horizontal y superposición de botones.
- Vista sintética de desarrollo: `/clinical-preview.html` con el servidor Vite. Ese archivo no se incluye en la compilación de producción y no permite guardar datos.

Estas comprobaciones no constituyen validación clínica institucional ni verificación de producción. Los cambios administrativos que ya estaban en el árbol de trabajo se conservaron.
