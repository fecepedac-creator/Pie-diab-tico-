# Pie Diabético: alcance y plan maestro

Fecha: 12 de septiembre de 2026. Base revisada: `f9fa2ed`.
Estado: primera meta y condiciones generales del piloto aprobadas por el usuario el 12 de septiembre de 2026. Pendientes las decisiones operativas de la sección 8; no constituye habilitación de uso clínico ni autorización de despliegue.

## 1. Objetivo y límite del producto

Coordinar el trabajo multidisciplinario de un paciente con episodios de herida: preparar antecedentes, compartir la evaluación, registrar curaciones y fotografías, solicitar evaluaciones, seguir pendientes y producir un resumen revisable para la ficha institucional.

La ficha institucional sigue siendo el destino del registro formal según el proceso que apruebe el centro. La plataforma conserva información sensible propia y necesita responsables, trazabilidad y operación segura aunque no reemplace esa ficha.

Primera meta aprobada: piloto en un centro, con equipo acotado. Validar primero con casos sintéticos y habilitar datos reales sólo después de la aprobación institucional correspondiente. La arquitectura multicentro existente se conserva y prueba desde el inicio.

Fuera del MVP: diagnóstico o tratamiento automático, cálculo automático de etapa WIfI, IA sobre imágenes, recetas, facturación, portal de pacientes, interoperabilidad automática con ficha institucional, envío automático de WhatsApp y funcionamiento sin conexión con datos clínicos locales. Cualquiera de estas capacidades exige una tarea y aprobación de alcance propia.

## 2. Estado actual frente al objetivo

| Área | Evidencia actual | Brecha para aprobar operación |
|---|---|---|
| Acceso | Google, correo verificado, invitación y membresía activa; separación de administrador de plataforma y perfiles clínicos | Matriz acordada de permisos por dato, acción, perfil combinado y caso asignado |
| Aislamiento | API verifica centro y perfil; Firestore y Storage bloquean acceso directo | Ampliar pruebas negativas entre centros y de revocación; verificar entorno desplegado |
| Preingreso | Identificación, antecedentes estructurados, situación social y validación | Reglas de completitud y corrección, prevención de duplicados concurrentes y definición de identificación excepcional |
| Atención | Episodios, herida compartida, curación, plan médico y WIfI manual | Cierre con requisitos, conservación de versiones confirmadas y correcciones atribuibles |
| Fotos y exámenes | Consentimiento por episodio, fotografías pre/post y adjuntos privados con URL de 15 minutos | Evidencia y retiro del consentimiento, ciclo de vida de archivos, revisión de límites y manejo de enlaces vencidos |
| Derivaciones | Tareas por perfil, prioridad, plazo y respuesta; resumen temporal para especialista | Responsable individual, transiciones válidas, reintentos, reasignación y término del acceso |
| Comité y ficha | Presentación imprimible y narrativas determinísticas | Definir qué está confirmado y vigente; acuerdo y seguimiento del comité; constancia de traslado a ficha |
| UX | Vistas por perfil, búsqueda, pestañas y opciones clínicas rápidas | Pruebas con usuarios, errores recuperables, pérdida de conexión y navegación con cambios sin guardar |
| Operación | Scripts de validación, pruebas sintéticas de emuladores y CI básica | Evidencia de restauración, monitoreo, soporte, reversión y pruebas integrales continuas |

Fuentes: README.md, types.ts, permissions.ts, components/, services/api.ts, functions/index.js, functions/domain.js, functions/emulator-smoke.js y .github/workflows/ci.yml. La revisión no consultó pacientes ni credenciales y no verificó el estado remoto actual.

## 3. Modelo funcional y responsabilidades propuesto

Unidad de seguimiento: paciente → episodio de herida → atenciones, documentos y tareas. Un paciente puede tener varias lesiones; cada atención debe mostrar siempre paciente, lateralidad, ubicación y fecha para evitar registrar en un episodio equivocado.

| Perfil | Trabajo principal y límite propuesto |
|---|---|
| Administrador de plataforma | Crear/suspender centros y facilitar su administración; sin acceso clínico implícito |
| Administrador de centro | Miembros, roles y configuración; permisos clínicos sólo mediante perfil adicional explícito |
| Coordinación | Identificación mínima, responsables, plazos y pendientes; sin editar evaluaciones clínicas |
| TENS | Preparar antecedentes y fotografías autorizadas; no confirmar evaluación médica ni curación |
| Enfermería | Confirmar valoración compartida y curación; gestionar pendientes del equipo |
| Médico de pie diabético | Confirmar evaluación médica y WIfI registrado; plan, seguimiento y derivaciones |
| Especialistas derivados | Consultar episodios habilitados y responder su derivación; sin sobrescribir la evaluación del equipo tratante |
| Enfermería vascular | Respuesta y documentación de su ámbito; acordar si necesita un formulario propio antes de ampliarlo |
| Trabajo social | Evaluación social de casos derivados y respuesta; sin edición de antecedentes médicos |
| Auditoría | Bitácora de acciones; acceso al contenido clínico sólo si se define un permiso adicional específico |

Los roles combinados necesitan pruebas explícitas: el servidor actual resuelve parte de la visibilidad por orden de condiciones. El acceso esperado debe derivarse de una política acordada y coherente, sin que la interfaz sea la única barrera.

Propuesta para especialistas: bandeja por especialidad; al aceptar, registrar responsable. Acordar si otros miembros de esa especialidad mantienen acceso colaborativo y cuánto dura tras resolver. El código actual habilita episodios por existencia de una tarea dirigida al perfil, sin considerar su estado ni el responsable individual.

## 4. Flujo y UX objetivo del MVP

1. Entrar y elegir centro. Mostrar claramente centro activo y funciones disponibles.
2. Abrir una bandeja de trabajo: pendientes propios, vencidos, casos por validar y búsqueda de paciente. Los indicadores describen estado de trabajo; no diagnostican urgencia.
3. Crear o encontrar paciente, verificar identidad y elegir lesión. Completar progresivamente el preingreso y distinguir borrador de confirmado.
4. Registrar atención compartida. Mantener mediciones únicas; confirmar por sección y por profesional. Mostrar guardado pendiente, confirmado y conflicto con acciones comprensibles.
5. Capturar fotos con consentimiento vigente y contexto visible. Revisar imagen antes de guardar; recuperar de forma clara una carga fallida.
6. Derivar con motivo, destinatario, prioridad y plazo; aceptar, trabajar, responder y cerrar según reglas acordadas. Separar prioridad clínica ingresada por el profesional de vencimiento administrativo.
7. Revisar caso en comité cuando corresponda, registrar acuerdo, responsable y fecha de seguimiento.
8. Revisar texto, copiar a ficha institucional y registrar quién indicó haberlo trasladado. Esa constancia manual no prueba una integración ni escritura en la ficha externa.
9. Cerrar atención y, cuando corresponda, episodio. Las correcciones posteriores conservan autor, motivo y versión previa.

Criterios UX propuestos: tareas principales realizables en teléfono de 360 px sin desplazamiento horizontal del formulario; navegación por teclado; etiquetas visibles; estados comprensibles sin depender del color; avisos al salir con cambios sin guardar; ninguna pantalla debe anunciar guardado si el servidor falló. Objetivo inicial de usabilidad: al menos 90% de escenarios completados sin ayuda, con cinco o más representantes que cubran los perfiles principales. Son metas a aprobar, no resultados obtenidos.

## 5. Brechas prioritarias verificadas en código

| ID | Prioridad | Hallazgo y consecuencia | Cierre esperado |
|---|---|---|---|
| B01 | P0 | PUT de atención devuelve el objeto completo aun cuando no se solicita una sección protegida; no tiene autorización general de lectura del caso en esa ruta | Verificar y proteger también respuestas y solicitudes vacías, usando cuentas restringidas y casos ajenos |
| B02 | P0 | `sanitizeWifi` convierte con Number: null y cadena vacía pueden convertirse en grado 0 | Ausencia permanece ausencia; prueba de 0 explícito, null, vacío e inválido |
| B03 | P0 | Se permite cambiar estado de atención sin exigir confirmaciones; los sellos conservan propiedades previas al volver a borrador | Definir y probar cierre, desconfirmación y corrección sin atribución ambigua |
| B04 | P0 | Crear tarea sólo exige identificadores no vacíos; no comprueba allí la relación paciente-episodio-atención. Actualización admite estados sin secuencia y asignación sin validar miembro | Rechazar referencias inconsistentes y responsables no autorizados; validar transiciones y respuesta al resolver |
| B05 | P0 | Acceso de especialista se deriva del perfil de cualquier tarea del episodio | Aplicar política aprobada de asignación, colaboración y fin del acceso |
| B06 | P1 | Duplicado de RUT se consulta antes de crear fuera de una operación atómica | Dos ingresos simultáneos producen un solo paciente o conflicto recuperable |
| B07 | P1 | Control de versión observado en atención; pacientes y tareas usan actualizaciones sin equivalente | Evitar pérdida silenciosa de cambios en los recursos compartidos |
| B08 | P1 | Bitácora se escribe después de la mutación principal; puede fallar tras guardar | Mutación y evidencia consistentes, con recuperación e idempotencia |
| B09 | P1 | `/state` lee todas las colecciones del centro antes de filtrar | Consultas acotadas, paginación y carga de fotos bajo demanda |
| B10 | P1 | Cliente compilado usa URL de API de producción fija; CI no ejecuta emuladores | Separación comprobable de pruebas/producción y pruebas integrales en CI |

P0 bloquea el piloto con datos reales hasta resolver y verificar. P1 debe cerrarse antes del uso operativo sostenido; las partes de identificación, concurrencia, auditoría y separación de entornos forman parte de la puerta del piloto. Son hallazgos estáticos; no se intentó explotar producción.

## 6. Plan de tareas y releases

Cada fila es una unidad acotada, lista para convertirse en una tarea independiente. No se inicia la siguiente release por calendario si no pasa la puerta anterior.

| Release / tarea | Objetivo, alcance y entregable | Dependencias | Criterio de finalización |
|---|---|---|---|
| R0 / T01 — Alcance | Acordar centro piloto, perfiles, responsables, incluidos/excluidos y métricas; acta breve | Ninguna | Responsable del producto confirma alcance y decisiones pendientes |
| R0 / T02 — Reglas | Matriz dato/acción/perfil, roles combinados, estados de atención/tarea y cierre del acceso | T01 | Responsable clínico y de acceso aprueban ejemplos permitidos y prohibidos |
| R1 / T03 — Autorización | Cerrar B01 y B05; validar respuestas, asignación y aislamiento | T02 | Pruebas negativas por perfil, centro, episodio y revocación sin exposición indebida |
| R1 / T04 — Integridad | Cerrar B02, B03, B04, B06 y B07; errores de validación y versiones | T02 | Vacíos no crean datos, duplicados y concurrencia no pierden información; cierres y correcciones trazables |
| R1 / T05 — Evidencia y archivos | Resolver B08; consentimiento, cargas, acceso y conservación de versiones | T02; coordinar con T04 | Mutaciones auditadas, consentimiento comprobable y escenarios de fallo recuperables |
| R1 / T06 — Entornos y pruebas | Resolver B10; CI con emuladores y matriz de regresión sintética | T02; integrar T03–T05 | Una ejecución reproduce escenarios positivos/negativos y demuestra que pruebas no escriben en producción |
| R2 / T07 — UX del equipo | Bandejas, identidad/lateralidad persistente, guardado, conflictos y navegación móvil | R1 | Pruebas por perfil cumplen criterios UX; cero pérdidas silenciosas en los escenarios |
| R2 / T08 — Continuidad | Seguimiento de derivaciones, acuerdo de comité y constancia manual de traslado a ficha | T04, T07 | Caso sintético completo desde ingreso hasta cierre con responsables y pendientes visibles |
| R2 / T09 — Operación | Procedimiento de respaldo/restauración, reversión, monitoreo, soporte y revisión de acceso | T05, T06 | Restauración ensayada, responsables identificados y tiempos de recuperación/pérdida máxima aceptados |
| R2 / T10 — Piloto | Capacitar y ejecutar guion con roles reales y datos sintéticos; decidir habilitación limitada | T07–T09 | Todas las puertas de piloto aprobadas y ningún bloqueo P0 abierto |
| R3 / T11 — Volumen | Resolver B09; medir búsquedas, bandejas y archivos con volumen acordado | R2 | SLO de carga aprobado y medido; paginación sin omisiones ni filtraciones |
| R3 / T12 — Segundo centro | Repetir alta, permisos, configuración, soporte y revisión de aislamiento | T11 | Centro nuevo opera sin cambios de código específicos y sin acceso a datos del primero |
| R4 / T13 — Extensiones | Evaluar integración institucional, indicadores adicionales o nuevas especialidades | R3 y necesidad validada | Cada extensión tiene alcance, costo, riesgos, aceptación y autorización propios |

T03, T04 y T05 pueden prepararse independientemente tras T02, coordinando cambios sobre los archivos compartidos. T06 puede preparar infraestructura en paralelo y completar regresión tras integrarlos. T09 puede preparar procedimientos mientras avanza UX. Primero reutilizar componentes y API existentes; refactorizar sólo cuando facilite una tarea aprobada.

## 7. Criterio de éxito por release

- R0 — Acuerdo: alcance y matriz aprobados, responsables nombrados y decisiones abiertas resueltas. Este documento por sí solo no acredita acuerdo.
- R1 — Base segura: B01–B08 resueltos según alcance anterior, entorno separado, regresión integral aprobada, sin P0 abierto. Listo para ensayo sintético del flujo.
- R2 — MVP piloto: flujo completo aprobado por representantes clínicos, coordinación y operación; restauración demostrada y soporte disponible. Propuesta de seguimiento: dos semanas de piloto limitado; registrar fallos, tareas vencidas, completitud y tiempo de registro. Acordar muestra y umbrales antes de comenzar. Incidentes de acceso o pérdida de datos suspenden ampliación.
- R3 — Uso multicentro: rendimiento medido con volumen acordado, aislamiento entre dos centros comprobado y alta repetible. La existencia del selector de centro no basta.
- R4 — Evolución: sólo extensiones con demanda y criterio de éxito propios. No bloquea la terminación del MVP.

La revisión clínica del catálogo de campos, WIfI y textos debe quedar a cargo de un responsable designado, con referencias y versión aprobadas antes del piloto. No se realizó en esta tarea una validación médica ni una evaluación de cumplimiento normativo.

## 8. Decisiones necesarias para acordar

1. Centro y equipo piloto; quién aprueba producto, contenido clínico, acceso y operación.
2. Acceso por especialidad o por persona, colaboración y vigencia después de resolver.
3. Quién confirma cada sección, requisitos para cierre y procedimiento de corrección.
4. Datos mínimos y alternativa para personas sin RUT; consentimiento, conservación y eliminación de archivos.
5. Qué significa una tarea urgente y cuál es el circuito humano fuera de la plataforma; el aviso genérico actual de WhatsApp sólo abre un mensaje y no prueba envío ni recepción.
6. Metas de tiempo, volumen, soporte, recuperación y aceptación del piloto.

## 9. Validación de esta revisión y estado

Completado: inspección local de documentación, interfaz en código, permisos, servidor, pruebas y CI; comparación funcional y priorización; `npm run validate` aprobado el 12/09/2026 (tipos, cuatro pruebas de lógica, build y sintaxis de dos archivos del servidor). El comando llamado lint ejecuta `node --check`, no una auditoría exhaustiva.

Acuerdo registrado el 12/09/2026: el usuario respondió «de acuerdo» a aprobar como primera meta un piloto en un centro con las condiciones de este plan. La elaboración del plan queda completada; R0 sigue pendiente de los responsables y las decisiones específicas de la sección 8.

Pendiente: decisiones operativas de alcance y permisos, validación clínica del contenido, ejecución actual de emuladores, pruebas visuales con usuarios, auditoría del despliegue y evidencia operativa. Pruebas existentes leídas no equivalen a pruebas ejecutadas en esta revisión. No se inspeccionaron datos reales ni se desplegaron cambios. Esta tarea sólo agrega y actualiza el documento de planificación.

Al finalizar aparecieron cambios concurrentes ajenos a esta tarea en App.tsx, CenterAdminDashboard.tsx, functions/domain.js y functions/index.js, además de un nuevo CSS de administración. Se preservaron. Los hallazgos y la validación corresponden a la lectura realizada durante esta revisión; deben contrastarse con la versión integrada antes de abrir tareas de implementación para evitar duplicar correcciones.
