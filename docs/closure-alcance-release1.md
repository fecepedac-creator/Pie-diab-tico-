# Cierre de alcance release 1 — “Pie Diabético” (Piloto operativo)

Documento base para firmar alcance, responsables y límites de esta fase. Base de revisión: candidata local `codex/r1-candidate-20260924` en `011db37` y `CURRENT_STATE.md`. Estado: **propuesta R0, no aprobada**. Piloto de un centro y equipo acotado; datos sintéticos primero.

## Objetivo operativo
Lanzar un piloto controlado de uso diario con:
- Preingreso completo por perfiles aprobados.
- Atención compartida con derivaciones y continuidad por episodio.
- Comité y resumen clínico.
- Dashboards de administración de plataforma y centro.
- Auditoría clínica mínima y trazabilidad.

## Alcance (IN)

### Módulos y procesos **sí**
1. Gestión de pacientes y preingreso (incluye antecedente médico, quirúrgico, alergias, medicación, hábitos, contexto social).
2. Registro de episodio y atenciones:
   - Apertura de episodios.
   - Captura de fotografías (pre/post) con consentimiento y control básico de calidad.
   - Registro clínico compartido por sección: herida, WIfI, enfermería y médico.
3. Derivaciones y seguimiento:
   - Tareas por perfil y estado (creada, asignada, en curso, resuelta).
4. Comité y resumen:
   - Vista cronológica de evolución y presentación de comité basada en datos reales de un episodio.
5. Administración:
   - Plataforma: altas, edición y archivo de centros.
   - Centro: miembros por perfiles y configuración operativa base.
6. Auditoría:
   - Eventos de alta/edición/cierre/derivación/foto.

### Módulos y mejoras **NO** (postergadas a siguientes entregas)
1. IA/automatizaciones avanzadas de sugerencia diagnóstica o cierre automático.
2. “Look and feel” premium o personalización visual extensa.
3. Integración automática con ficha clínica institucional.
4. Flujos externos no aprobados (alertas fuera de WhatsApp predefinido, mensajería no clínica directa).
5. Prescripción, portal de pacientes, facturación, IA sobre imágenes, operación sin conexión con datos clínicos locales y extensión operativa a un segundo centro.

## Decisiones de producto para ratificar

- **Visibilidad:** por instrucción expresa del usuario, enfermería y medicina podrán ver todos los pacientes de **su propio centro** durante el piloto. Preferencia de producto pendiente de aprobación clínica y TI/seguridad. No amplía permisos de escritura ni permite acceso entre centros. La candidata proyecta estado completo a esos perfiles; falta aceptar la necesidad asistencial y verificar aislamiento en el destino elegido.
- **Estados y autoría:** guardar borrador no es confirmar. Cada sección la confirma el perfil competente; el cierre depende del tipo de atención. Las correcciones posteriores son adendas trazables. La tarea resuelta o rechazada termina el acceso derivado de especialidad salvo otro rol vigente. Ratificar con ejemplos de perfiles combinados.
- **Registro formal:** durante el piloto, la ficha electrónica institucional seguirá siendo el registro oficial. Cada profesional copiará allí el texto final de su propia atención; el médico que coordina el piloto supervisará el uso de la plataforma. Por decisión del usuario, **no se añadirá una marca de «copiado» ni una constancia de traslado dentro de Pie Diabético**. La institución aún debe aprobar este procedimiento y definir cómo supervisará su cumplimiento. La integración automática con la ficha oficial queda para una etapa posterior.
- **Fotografías:** aprobar texto y método de otorgamiento/retiro del consentimiento por episodio, destino de imágenes y tratamiento de fotos ya capturadas tras retiro. El booleano actual no demuestra por sí mismo consentimiento informado suficiente. La foto de perfil requiere decisión independiente. Para el piloto se propone guardar las fotos clínicas de pies sólo en Pie Diabético; antes de pacientes reales deben acreditarse respaldo, restauración y conservación específicos para esas imágenes.

## Pendientes con responsable y evidencia

| Decisión | Quién debe aprobar | Evidencia concreta para R0 |
|---|---|---|
| Centro, equipo, duración y criterios de pausa | Sponsor, operación clínica y responsable clínico | Acta con centro, participantes, fechas, y suspensión por acceso indebido, pérdida de datos o error clínico bloqueante |
| Matriz por dato/acción/caso, roles combinados y visibilidad completa del centro | Responsable clínico, enfermería referente y TI/seguridad | Matriz vinculada aprobada; casos permitidos/denegados de dos centros, revocación y rol combinado asociados a versión candidata |
| Consentimiento de herida y foto de perfil | Responsable clínico y privacidad/jurídico institucional | Texto aprobado, registro/retiro, muestra de evidencia por episodio y decisión de foto de perfil |
| Traslado al registro formal | Responsable clínico y custodio institucional de registros | Procedimiento que asigna a cada profesional su registro en la ficha oficial, supervisión externa a Pie Diabético y manejo de omisiones o discrepancias; sin marcador dentro de la aplicación |
| Retención y eliminación de Firestore, fotos/adjuntos de Storage, auditoría y respaldos | Privacidad/jurídico y operación/TI | Plazos por categoría, inicio del plazo, excepciones, responsable, periodicidad de copia, control de acceso, eliminación y ensayo de restauración |
| MFA, RTO/RPO, soporte y recuperación | TI/seguridad y operación/TI; sponsor acepta impacto operativo | Decisión MFA sí/no por perfil, método, excepciones, fecha y prueba si aplica; valores RTO/RPO aceptados, runbook, escalamiento y restauración en destino representativo |

Los plazos, RTO/RPO y MFA quedan sin valor hasta decisión institucional. Privacidad/jurídico debe revisar normativa vigente y registrar su conclusión; este documento no certifica cumplimiento legal.

## Perfiles habilitados en release 1 (tentativo)

- Superadmin de plataforma.
- Admin de centro.
- TENS (captura inicial + foto y preingreso).
- Enfermería.
- Médico de pie.
- CX / Coordinación.
- CV / Enfermería vascular.
- CX vascular.
- Traumatólogo.
- Fisiatra.
- Trabajo social / asistente social.
- Auditor (solo lectura operativa sobre audit logs según política definida).

Convergencia operativa:
- Matriz de permisos por dato, acción y perfil: [matriz-permisos-rol-release1.md](matriz-permisos-rol-release1.md)

## Criterios de salida de R0 (in/scope)

1. Documento firmado por responsable clínico y de operación (quién valida alcance).
2. Matriz de permisos por acción por perfil aprobada.
3. Decisiones explícitas de estados de flujo:
   - Guardado como borrador.
   - Confirmación/validación de sección.
   - Cierre de atención.
4. Decisiones explícitas de salida del piloto:
   - Qué eventos abortan (bloqueantes).
   - Qué errores bloquean continuidad operativa y cómo se recuperan.
5. Criterios técnicos mínimos de Release 1 (registro):
   - Decisión MFA: `sí/no` + fecha + responsable.
   - Retención mínima operacional:
     - Firestore/backup.
     - Storage/fotos.
   - Política de recuperación: RTO y RPO objetivo para piloto.

## Aprobación R0 (pendiente)

Cada firmante registra nombre, cargo, institución, decisión (aprueba / condiciona / rechaza), condiciones, fecha y firma o referencia de acta. Ninguna firma sustituye la evidencia indicada arriba.

| Función | Nombre y cargo | Decisión y condiciones | Fecha | Firma / acta |
|---|---|---|---|---|
| Responsable clínico | Pendiente | Pendiente | Pendiente | Pendiente |
| Enfermería referente | Pendiente | Pendiente | Pendiente | Pendiente |
| Operación clínica / coordinación | Pendiente | Pendiente | Pendiente | Pendiente |
| TI y seguridad | Pendiente | Pendiente | Pendiente | Pendiente |
| Privacidad / jurídico institucional | Pendiente | Pendiente | Pendiente | Pendiente |
| Sponsor y custodio del registro institucional | Pendiente | Pendiente | Pendiente | Pendiente |

### Estado

- **Estado actual de R0**: Pendiente de seis decisiones institucionales, sin firmas atribuidas.
- **Condición de salida R0**: las funciones clínica, enfermería, operación clínica, TI/seguridad, privacidad/jurídico y sponsor/custodio del registro dejan nombre, cargo, decisión, condiciones, fecha y referencia de acta; no queda condición bloqueante. La matriz, el centro/equipo, consentimiento, registro institucional, retención/respaldo, MFA y RTO/RPO están aprobados. Hasta entonces, **NO-GO para datos reales**. V06/V10/V11 móvil, restauración operativa y canary/rollback son puertas posteriores de habilitación del piloto, no pruebas implícitas de R0.
