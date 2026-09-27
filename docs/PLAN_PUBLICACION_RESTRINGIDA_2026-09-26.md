# Publicación restringida de Pie Diabético — plan del 26/09/2026

## Resultado buscado

Publicar **la aplicación completa** en `simulador-clinico.web.app` (Hosting, `api`, reglas Firestore y Storage) para un grupo invitado que pruebe **únicamente casos sintéticos**. El dominio principal `policlinico-de-pie-diabetico.web.app` y sus datos no forman parte de esta publicación. La revisión jurídica y de privacidad puede seguir pendiente para este estado; **ningún paciente real se incorpora** mientras falte.

El objetivo operativo del día es llegar a **DESPLEGADA RESTRINGIDA** con evidencias de acceso, flujos, recuperación y reversión. Si una dependencia externa o una prueba bloqueante no se resuelve hoy, se registra el estado alcanzado sin llamar completo al despliegue.

## Estado comprobado al iniciar (26/09/2026, Chile)

- La candidata integrada `codex/r1-production-readiness` está en `21560b4`; CI del PR borrador #14, emuladores y auditorías de dependencias constan en `CANDIDATE_MANIFEST_R1.md`. No se ha desplegado.
- El checkout `main` contiene cambios posteriores sin confirmar, entre ellos curaciones y catálogo de enfermería. `npm run validate` pasó hoy allí con 16 pruebas, pero **esos cambios no forman parte del commit candidato**. Antes de publicar «todos los cambios locales» hay que compararlos e integrarlos en un nuevo commit, o excluirlos por decisión explícita.
- `simulador-clinico` tiene web app, pero `GET /api/health` devuelve 404. `firebase functions:list` devuelve `SERVICE_DISABLED`. Un `firebase deploy --dry-run --only functions:api` exige plan Blaze para habilitar Cloud Build. No hay evidencia actual de Auth Google, Storage, respaldo, ausencia de datos reales ni límite de gasto en ese proyecto.

## Protocolo vigente: estados separados

| Estado | Evidencia mínima | Uso permitido |
| --- | --- | --- |
| `CANDIDATA_CONGELADA` | Un commit exacto, checkout limpio, manifiesto, validación completa y emuladores en verde | Revisión local con datos sintéticos |
| `PUBLICADA_PARA_VALIDAR` | Blaze/APIs, Auth Google, Hosting + Function + reglas del mismo commit y proyecto; `/api/health` JSON 200, `/api/session` anónimo 401; cuentas invitadas, proyecto sin datos reales comprobado | Validación remota sintética por invitación; observación iniciada |
| `DESPLEGADA_RESTRINGIDA` | Además: V06/V10/V11 en móviles reales con casos sintéticos, aislamiento entre perfiles/centros, restauración de dato y archivo en el destino, reversión ensayada, monitoreo y responsables activos, decisión MFA y cierre clínico/TI de la matriz; cero fallos altos | Validación controlada sostenida; revisión jurídica/privacidad puede quedar pendiente |
| `PILOTO_CON_PACIENTES_REALES` | Todo lo anterior, observación aprobada y autorización clínica, operativa y jurídica/de privacidad para la versión y centro exactos | Uso clínico limitado según acta |

La publicación técnica **no equivale** a aprobación para datos reales. Un resultado de Hosting no acredita el backend; cada capa se comprueba por separado. La observación de 24–48 h comienza al publicar y sigue como control operativo; no se declara terminada antes de transcurrir ese tiempo.

## Secuencia de hoy, por dependencia

| Orden | Responsable | Acción y evidencia de salida | Corte si falla |
| --- | --- | --- | --- |
| 1. Entorno | Titular de facturación + operación | Activar Blaze y presupuesto/alerta en `simulador-clinico`; habilitar APIs requeridas; confirmar Auth Google, dominio autorizado, Storage y que no haya datos reales. Repetir `functions:list` sin `SERVICE_DISABLED`. | Sin Blaze/API/identidad aislada: no desplegar. |
| 2. Versión | Desarrollo + revisor | Comparar `main` sucio con `21560b4`; decidir inclusión de cada cambio, integrar en checkout aislado, congelar SHA y manifiesto. No incluir credenciales ni datos. | Sin commit exacto revisado: no desplegar. |
| 3. Puerta local | Desarrollo | `npm ci`, `npm ci --prefix functions`, `npm run validate`, `npm run test:emulators`, auditorías de dependencias y revisión de reglas; compilar con `build:canary` usando exclusivamente la configuración web de `simulador-clinico`. | Fallo de compilación, aislamiento o seguridad: corregir y repetir sobre nuevo SHA. |
| 4. Publicación | Operación técnica | Registrar estado anterior; desplegar por proyecto explícito `functions:api`, reglas revisadas y Hosting desde el mismo SHA. Guardar revisiones, hora y operador. | Si alguna capa falla: detener y comprobar que no se habilita la URL como completa. |
| 5. Prueba remota | QA + clínica | Health JSON, sesión anónima 401, login invitado, denegación de usuario no invitado, dos perfiles y dos centros, alta/lectura/foto sintéticas, auditoría y ausencia de referencia al proyecto principal. | Exposición, cruce de centro, escritura en proyecto principal o fallo clínico alto: retirar acceso y revertir. |
| 6. Cierre técnico | Clínica + TI + operación | V06/V10/V11 en móvil real, aprobación de matriz y alcance de **validación sintética**, MFA decidido, respaldo y restauración del canario, reversión ensayada, responsables y monitoreo de 24–48 h asignados. | Si falta una evidencia: queda `PUBLICADA_PARA_VALIDAR`, no `DESPLEGADA_RESTRINGIDA`. |

**Corte de las 23:59, hora de Chile:** anotar URL, SHA, estado de cada capa y prueba, bloqueos y próximo responsable. No comprimir ni dar por aprobadas las sesiones móviles, la restauración o la observación sólo para cumplir la fecha. Si la activación Blaze u otra intervención humana no ocurre hoy, la entrega de hoy es el protocolo y la candidata preparada; la publicación queda bloqueada.

## Revisión que puede quedar pendiente

Sólo después de alcanzar `DESPLEGADA_RESTRINGIDA`, la revisión jurídica/de privacidad puede ser el único expediente de **aprobación pendiente**. Incluye contrato y roles de tratamiento, información y consentimiento, localización y conservación de datos y archivos, y autorización institucional para pacientes reales. No se interpreta aquí que esos puntos estén aprobados ni se deriva autorización clínica de un despliegue sintético.

## Registro de cierre de la jornada

| Evidencia | Resultado / enlace / responsable |
| --- | --- |
| SHA congelado y manifiesto | Pendiente |
| Blaze, APIs, Auth y Storage verificados | Pendiente; Blaze bloquea Functions en la comprobación inicial |
| Hosting + Function + reglas publicados | No ejecutado |
| Health, sesión y aislamiento remotos | Pendiente |
| V06/V10/V11 y matriz clínica/TI | Pendiente |
| Restauración, reversión y monitoreo | Pendiente |
| Dictamen técnico | **NO-GO actual para publicación**; actualizar sólo con evidencia del candidato exacto |
| Revisión jurídica/de privacidad | Pendiente para uso con pacientes reales |
