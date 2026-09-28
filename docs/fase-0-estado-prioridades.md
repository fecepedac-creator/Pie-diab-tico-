# Fase 0 — Estado, prioridades y plan de seis semanas

12 de septiembre de 2026. Revisión local sobre HEAD `f9fa2ed` y cambios de trabajo concurrentes. Complementa `plan-maestro.md`; actualiza la situación de sus hallazgos sin convertir propuestas en funcionalidades terminadas.

## 1. Estado real del repositorio

**Conclusión:** hay una base funcional y una integración en curso. Aún no hay evidencia suficiente para declarar listo el piloto con datos reales. La meta aprobada sigue siendo un centro, equipo acotado y ensayo sintético previo.

| Nivel de evidencia | Situación observada |
|---|---|
| Base registrada en Git | Acceso por invitación, centros, roles, preingreso, atención compartida, fotografías, adjuntos, tareas, resumen de especialista, comité imprimible y textos para ficha institucional. Último commit: `f9fa2ed`, alineación de demos con permisos. |
| Modificaciones locales | Ocho archivos registrados modificados al revisar: App, administración de centro, dominio y API del servidor, prueba de emuladores, permisos, cliente API y tipos. No forman todavía una versión cerrada. |
| Código nuevo local | `clinical-workflow.js` incorpora proyección por permisos, grados WIfI estrictos, requisitos de cierre y resumen de derivación. Hay comprobaciones administrativas nuevas y componentes de evolución y captura fotográfica. La búsqueda de referencias sólo encontró la definición de esos dos componentes, sin uso desde el flujo existente en ese momento. |
| Correcciones en curso | PUT de atención ya exige médico/enfermería; WIfI deja de convertir vacíos a cero; aparecen revisiones, bloqueo tras cierre y adendas. Crear derivación valida paciente/episodio y atención de origen; resolver exige respuesta. Son avances sobre B01–B04, pendientes de regresión integral. |
| Diseño disponible | Documentos de superadministración, preingreso, atención/evolución y comité son propuestas. Administración de centro describe cambios locales. No asumir que todas las propuestas están implementadas. |
| Validación ejecutada ahora | `npm run validate` aprobado: tipos, cuatro pruebas de lógica, compilación y comprobación de sintaxis de index.js/domain.js. No equivale a pruebas del flujo nuevo. |
| Integración y producción | No ejecuté emuladores ni consulté producción en esta revisión. El informe local de administración registra un intento fallido de emuladores antes de las aserciones: Functions no cargó y health respondió 504, con Node 24 frente al 22 declarado. Ese antecedente requiere diagnóstico; no demuestra por sí solo la causa. |

Fortalezas: separación entre administración y clínica, permisos de servidor, datos directos de Firestore/Storage bloqueados, reutilización de una herida compartida y narrativas sin servicio de IA externo. El producto debe seguir siendo coordinación del equipo y apoyo al traslado revisado a la ficha institucional.

Fuera del piloto: portal de pacientes, facturación, prescripción, diagnóstico automático, IA sobre fotografías, integración automática con ficha, WhatsApp automático y expansión operativa multicentro. No añadir roles nuevos para resolver diferencias de diseño entre pantallas.

## 2. Backlog ordenado

P0 bloquea datos reales. P1 completa el MVP y su operación; respaldo, restauración y soporte también deben pasar antes de habilitar datos reales. P2 no bloquea el piloto. Los criterios son propuestas de aceptación, no resultados ya obtenidos.

| Orden / ID | Prioridad | Alcance y entregable | Criterio de cierre |
|---|---|---|---|
| 1 / F00 | P0 | Cerrar centro piloto, responsables y matriz por campo/acción; definir roles combinados, asignación y cierre | Responsable de producto y clínico validan ejemplos permitidos/prohibidos y reglas de estados |
| 2 / F01 | P0 | Integrar cambios actuales, reproducir entorno de Node 22 y separar destino de API por entorno | Versión identificable, API/emuladores arrancan, CI integral y prueba de que ensayo no escribe en producción |
| 3 / F02 | P0 | Permisos en todas las rutas y respuestas, especialmente PUT de pacientes y fotos; alcance de trabajo social y especialista | Perfiles restringidos no consultan ni modifican casos fuera de alcance, incluyendo respuestas tras guardar y combinaciones de roles |
| 4 / F03 | P0 | Guardado parcial de pacientes, versiones, RUT único bajo concurrencia y sellos independientes | Omitir campos conserva datos; dos ediciones no pierden cambios; no hay duplicado concurrente ni validación accidental |
| 5 / F04 | P0 | Completar y probar WIfI vacío, cierre, adendas, cambios de herida y consentimiento fotográfico | Ausencia no se vuelve cero; cierre exige aportes definidos; correcciones conservan versión y autor; cargas sin consentimiento se rechazan |
| 6 / F05 | P0 | Derivaciones: transiciones, responsable válido, aceptación, respuesta y duración del acceso | No se salta el circuito aprobado ni se asigna a una cuenta ajena; casos resueltos siguen la política acordada |
| 7 / F06 | P0 | Consistencia entre guardado y auditoría; reintentos e idempotencia de operaciones críticas | Fallo de bitácora no deja éxito ambiguo ni reintento duplicado; prueba de recuperación |
| 8 / F07 | P1 | UX de preingreso, guardado y bandejas; integrar componentes existentes de evolución/fotos | Flujos móviles por perfil, recuperación de errores y aviso de cambios pendientes sin pérdida silenciosa |
| 9 / F08 | P1 | Resumen único para especialista/comité, fechas de evidencia, acuerdos y traslado manual a ficha | Un caso completo permite identificar origen, versión, responsable y pendientes; constancia manual diferenciada de integración |
| 10 / F09 | P1 | Restauración, monitoreo, reversión, revisión de accesos y soporte | Ensayo de restauración aprobado, responsables y tiempos máximos acordados; procedimiento operativo utilizable |
| 11 / F10 | P1 | Consultas acotadas y carga progresiva donde el volumen piloto lo requiera | Medir con volumen acordado y cumplir tiempo objetivo sin descargar todo el historial/fotos al abrir |
| 12 / F11 | P2 | Mejoras visuales de superadministración, indicadores adicionales y búsquedas avanzadas | Cada mejora prueba una necesidad del piloto y tiene criterio propio; no retrasa correcciones P0 |
| 13 / F12 | P2 | Segundo centro e integraciones externas | Requieren nueva aceptación de alcance después de medir el piloto |

Hallazgos abiertos comprobados en la lectura actual: PUT de pacientes reconstruye bloques omitidos, devuelve paciente completo y no comprueba asignación social; creación de paciente consulta duplicados fuera de transacción; acceso derivado sigue dependiendo del perfil de una tarea sin considerar estado/responsable; actualización de tareas aún no tiene una secuencia de estados completa ni validación del miembro asignado; auditoría se guarda después de las mutaciones; `/state` lee colecciones completas; cliente compilado mantiene una API de producción fija y CI no ejecuta emuladores. No se explotaron estas rutas en producción.

Respecto del plan maestro, B01/B02 tienen corrección local observada y B03/B04 están parcialmente atendidos. No abrir implementaciones duplicadas: primero probar la versión integrada. B05–B10 conservan trabajo pendiente. F02/F03 amplían la prioridad del preingreso porque la lectura concreta muestra riesgos de exposición y pérdida de datos.

## 3. Dependencias entre roles y dashboards

| Unidad | Depende de | Desbloquea / contrato que debe compartir |
|---|---|---|
| Plataforma | Identidad global y estados de centro | Alta y continuidad administrativa; ninguna lectura clínica implícita |
| Administración de centro | Centro activo y autorización administrativa | Invitaciones, perfiles y bajas fiables para todas las vistas |
| Coordinación / TENS / trabajo social | Matriz de campos, búsqueda, guardado parcial y versiones de paciente | Preingreso con validación clínica/social separada; trabajo social limitado a casos habilitados |
| Enfermería / médico | Paciente, episodio, identidad y lateralidad; permisos de cada sección | Herida compartida, curación y plan; requisitos según atención de enfermería, médica o conjunta |
| Especialistas | Derivación válida, responsable, alcance y resumen con versión de origen | Respuesta trazable y documentos del episodio; sin sobrescribir el aporte del tratante |
| Comité | Atención y evidencia fechadas, derivaciones y acceso aprobado | Acuerdo, responsable y seguimiento; reutiliza el resumen longitudinal |
| Auditoría | Eventos consistentes en cada operación | Revisión administrativa sin otorgar acceso clínico automático |

Orden estructural: identidad/centro → membresías/permisos → paciente/episodio → atención → derivación → comité/seguimiento. Auditoría, concurrencia y aislamiento son transversales. El diseño visual puede avanzar con datos sintéticos mientras se cierra el contrato, pero la integración de dashboards depende de ese contrato estable.

Decisión pendiente: definir si una misma persona con varios roles dispone de capacidades acumuladas por recurso. La nueva proyección del servidor ya intenta combinar capacidades; debe coincidir con navegación, formularios y respuestas de cada ruta. No basta que cada dashboard funcione de forma aislada.

## 4. Riesgos técnicos y de adopción

| Riesgo | Consecuencia | Tratamiento propuesto |
|---|---|---|
| Cambios simultáneos en API, tipos y permisos | Una prueba pasa sobre una versión que cambia minutos después; integración parcial | Un responsable de integración por iteración, versión congelada para aceptación y cambios pequeños con dependencias explícitas |
| Cuatro pruebas de lógica con nueva funcionalidad extensa | Falsa confianza pese a build correcto | Regresión de permisos, estados, concurrencia y fallos en emuladores; probar rutas de lectura y escritura |
| Entorno de prueba conectado a API fija de producción | Ensayo local puede alcanzar servicios reales | Resolver entorno antes de pruebas autenticadas del flujo |
| Consulta masiva y URLs de archivos temporales | Demora móvil, consumo innecesario y fotos que dejan de abrir | Carga por caso, medición de volumen y renovación autorizada de enlaces |
| Formularios o cierres que no reflejan el trabajo real | Doble registro, campos rellenados sólo para poder avanzar | Validación con representantes y tipos de atención acordados; permitir ausencia explícita justificada cuando corresponda |
| Tareas sin responsable y WhatsApp interpretado como recepción | Pendientes abandonados | Bandeja con aceptación y responsable; mensaje preparado no equivale a enviado ni recibido |
| Acceso demasiado amplio o demasiado estrecho | Exposición o rechazo del equipo al sistema | Casos concretos de colaboración por especialidad; política explícita y prueba de roles combinados |
| Piloto sin soporte, restauración ni responsable clínico | Incidentes sin resolución y pérdida de confianza | Nombrar responsables, ensayar recuperación y fijar criterio de pausa antes de usar datos reales |

No se realizó validación médica del contenido ni revisión normativa. Son entregables institucionales pendientes antes de habilitación, no supuestos resueltos por compilar.

## 5. Plan propuesto de seis semanas

Semanas relativas al inicio acordado. Estimación de planificación, condicionada a disponibilidad del equipo clínico, responsable técnico y entorno. Seis semanas cubren preparación y piloto inicial; no el proyecto multicentro completo. Si una puerta falla, se corrige antes de avanzar aunque cambie la fecha.

| Iteración | Objetivo y entregable | Dependencia | Criterio de salida |
|---|---|---|---|
| Semana 1 — R0 | F00 y F01: alcance, matriz, responsables, integración de cambios y entorno sintético reproducible | Acuerdo de piloto ya registrado | Centro/equipo definidos; decisiones de acceso/cierre aprobadas; versión candidata identificada; API y prueba básica de emuladores operativas sin destinos reales |
| Semana 2 — R1a | F02 y F03: permisos en respuestas, guardado parcial, concurrencia e identidad | Semana 1 | Matriz negativa completa por centro/rol/caso; cero exposición y pérdida de datos en escenarios; duplicado concurrente controlado |
| Semana 3 — R1b | F04–F06: atención, fotografías, tareas y auditoría; completar regresión de cambios locales | Semana 2 | Circuito sintético completo; estados inválidos rechazados, adendas y autorías conservadas; reintentos recuperables; ningún P0 abierto |
| Semana 4 — R2a | F07–F09: UX, resumen/comité mínimo y operación; medir carga para decidir F10 | Semana 3; procedimientos pueden prepararse antes | Cinco o más representantes cubren perfiles principales; ≥90% de escenarios sin ayuda y cero pérdida silenciosa; restauración/reversión ensayadas; responsables aprueban puerta de piloto |
| Semana 5 — R2b | Piloto limitado y acompañado; empezar con ensayo sintético y habilitar datos reales sólo tras aprobación correspondiente | Puerta completa de semana 4 | Registro diario de incidentes, tiempos y pendientes; toda tarea del piloto tiene responsable/plazo o excepción justificada; sin incidente de acceso o pérdida de datos abierto |
| Semana 6 — R2c | Corregir fallos del piloto, repetir aceptación y decidir continuidad | Evidencia de semana 5 | Sin P0; ≥90% de escenarios acordados sin ayuda; sin pendientes vencidos sin responsable/acción; soporte y recuperación vigentes; acta de continuar, extender piloto o suspender |

La muestra de casos, tiempo objetivo de registro, volumen de carga y tiempos máximos de recuperación se fijan en semana 1; no inventar una reducción porcentual sin línea base. Un incidente de acceso o pérdida de datos pausa el uso afectado y la ampliación hasta resolverlo. P2 queda fuera de estas seis semanas salvo que una necesidad medida cambie formalmente el alcance.

Estado de esta tarea: mini-informe completado. Sólo se agregó este documento; no se modificó código ni se desplegó. La revisión refleja una instantánea de un repositorio con trabajo concurrente y debe contrastarse al congelar cada versión candidata.
