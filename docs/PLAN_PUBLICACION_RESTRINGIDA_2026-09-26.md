# Pie Diabético — ruta de publicación restringida

> **Destino corregido el 27/09/2026:** el usuario confirmó que `simulador-clinico` corresponde a otra aplicación y eligió `pie-diabetico-canary-2026` para el canary sintético. Este plan conserva decisiones históricas, pero sus comandos con el destino anterior no deben ejecutarse. El estado operativo actualizado está en [CURRENT_STATE.md](CURRENT_STATE.md).

> **Actualización del 27/09/2026:** la integración funcional local pasó validación, emuladores y compilación canary. La inspección remota descubrió que `simulador-clinico` contiene `AVATARES` y `Sesiones_Alumnos`, colecciones ajenas a esta aplicación; Auth no tiene proveedor habilitado y Storage carece de bucket. El destino previsto debe revisarse antes de publicar reglas o datos. La secuencia y tabla históricas siguientes no acreditan un GO.

> **Decisión vigente (26/09/2026): `simulador-clinico` está en Blaze.** La consola mostró «Plan de facturación: Blaze» para ese proyecto, con cuenta «Pago de Firebase» en CLP. Hay dos presupuestos de alerta mensuales iguales de CLP 25 (50 %, 90 % y 100 %), sin límite de gasto; el usuario decidió mantener ese monto por ahora. Blaze habilita la preparación del entorno, pero **no publica código ni autoriza pacientes reales**. La decisión anterior de mantener Spark queda superada.

## Objetivo vigente

Publicar **la aplicación completa** en `simulador-clinico.web.app` (Hosting, `api`, reglas Firestore y Storage) para un grupo invitado que pruebe **únicamente casos sintéticos**. El dominio principal `policlinico-de-pie-diabetico.web.app` y sus datos no forman parte de esta publicación. La revisión jurídica y de privacidad puede seguir pendiente para este estado; **ningún paciente real se incorpora** mientras falte.

El objetivo de `DESPLEGADA RESTRINGIDA` se retoma por etapas. No se cambia de proyecto ni se conecta el frontend canary al backend principal como atajo. La activación de Blaze cierra sólo una parte de la puerta de entorno.

## Estado comprobado al iniciar (26/09/2026, Chile)

- La candidata integrada `codex/r1-production-readiness` está en `21560b4`; CI del PR borrador #14, emuladores y auditorías de dependencias constan en `CANDIDATE_MANIFEST_R1.md`. No se ha desplegado.
- El checkout `main` contiene cambios posteriores sin confirmar, entre ellos curaciones y catálogo de enfermería. `npm run validate` pasó hoy allí con 16 pruebas, pero **esos cambios no forman parte del commit candidato**. Antes de publicar «todos los cambios locales» hay que compararlos e integrarlos en un nuevo commit, o excluirlos por decisión explícita.
- `simulador-clinico` tiene web app. Tras activar Blaze, `firebase functions:list --project simulador-clinico` respondió «No functions found» y `GET /api/health` continúa en 404 HTML. No se publicó código. No hay evidencia actual de Auth Google, Storage, respaldo ni ausencia de datos reales en ese proyecto.

## Protocolo vigente: estados separados

| Estado | Evidencia mínima | Uso permitido |
| --- | --- | --- |
| `CANDIDATA_CONGELADA` | Un commit exacto, checkout limpio, manifiesto, validación completa y emuladores en verde | Revisión local con datos sintéticos |
| `PUBLICADA_PARA_VALIDAR` | Blaze/APIs, Auth Google, Hosting + Function + reglas del mismo commit y proyecto; `/api/health` JSON 200, `/api/session` anónimo 401; cuentas invitadas, proyecto sin datos reales comprobado | Validación remota sintética por invitación; observación iniciada |
| `DESPLEGADA_RESTRINGIDA` | Además: V06/V10/V11 en móviles reales con casos sintéticos, aislamiento entre perfiles/centros, restauración de dato y archivo en el destino, reversión ensayada, monitoreo y responsables activos, decisión MFA y cierre clínico/TI de la matriz; cero fallos altos | Validación controlada sostenida; revisión jurídica/privacidad puede quedar pendiente |
| `PILOTO_CON_PACIENTES_REALES` | Todo lo anterior, observación aprobada y autorización clínica, operativa y jurídica/de privacidad para la versión y centro exactos | Uso clínico limitado según acta |

La publicación técnica **no equivale** a aprobación para datos reales. Un resultado de Hosting no acredita el backend; cada capa se comprueba por separado. La observación de 24–48 h comienza al publicar y sigue como control operativo; no se declara terminada antes de transcurrir ese tiempo.

La ruta estática prevista durante Spark queda archivada como alternativa, no como sustituto de `PUBLICADA_PARA_VALIDAR` ni de `DESPLEGADA_RESTRINGIDA`. `clinical-preview.html` sigue siendo exclusivo de desarrollo.

## Preparación inmediata tras activar Blaze

1. **Entorno y costo:** verificar Auth, Storage, APIs requeridas, datos existentes y responsables de `simulador-clinico`. Mantener por ahora los dos presupuestos de CLP 25; son alertas, no un tope automático de gasto.
2. **Candidata y alcance:** inventariar e integrar selectivamente los cambios sin confirmar de `main` en checkout aislado, sin sobrescribirlos. La comprobación de integración detectó conflictos en 12 archivos: todavía no existe un commit que reúna de forma verificada todos los cambios locales.
3. **Puerta local y publicación:** seguir la secuencia siguiente sobre un SHA exacto, sólo con datos sintéticos y acceso por invitación. Registrar por separado resultados locales, remotos y de observación.

## Secuencia para el backend canary

| Orden | Responsable | Acción y evidencia de salida | Corte si falla |
| --- | --- | --- | --- |
| 1. Entorno | Titular de facturación + operación | Blaze y consulta de Functions verificados; alertas de CLP 25 mantenidas por decisión del usuario; habilitar APIs requeridas y confirmar Auth Google, dominio autorizado, Storage y ausencia de datos reales. | Sin API/identidad aislada: no desplegar. |
| 2. Versión | Desarrollo + revisor | Comparar `main` sucio con `21560b4`; decidir inclusión de cada cambio, integrar en checkout aislado, congelar SHA y manifiesto. No incluir credenciales ni datos. | Sin commit exacto revisado: no desplegar. |
| 3. Puerta local | Desarrollo | `npm ci`, `npm ci --prefix functions`, `npm run validate`, `npm run test:emulators`, auditorías de dependencias y revisión de reglas; compilar con `build:canary` usando exclusivamente la configuración web de `simulador-clinico`. | Fallo de compilación, aislamiento o seguridad: corregir y repetir sobre nuevo SHA. |
| 4. Publicación | Operación técnica | Registrar estado anterior; desplegar por proyecto explícito `functions:api`, reglas revisadas y Hosting desde el mismo SHA. Guardar revisiones, hora y operador. | Si alguna capa falla: detener y comprobar que no se habilita la URL como completa. |
| 5. Prueba remota | QA + clínica | Health JSON, sesión anónima 401, login invitado, denegación de usuario no invitado, dos perfiles y dos centros, alta/lectura/foto sintéticas, auditoría y ausencia de referencia al proyecto principal. | Exposición, cruce de centro, escritura en proyecto principal o fallo clínico alto: retirar acceso y revertir. |
| 6. Cierre técnico | Clínica + TI + operación | V06/V10/V11 en móvil real, aprobación de matriz y alcance de **validación sintética**, MFA decidido, respaldo y restauración del canario, reversión ensayada, responsables y monitoreo de 24–48 h asignados. | Si falta una evidencia: queda `PUBLICADA_PARA_VALIDAR`, no `DESPLEGADA_RESTRINGIDA`. |

**Corte de las 23:59, hora de Chile:** anotar SHA, pruebas locales, estado de cada capa remota y bloqueos. No comprimir ni dar por aprobadas las sesiones móviles, la restauración o la observación sólo para cumplir la fecha. Hosting aislado presentaría una interfaz sin flujos clínicos funcionales mientras la Function no exista.

## Revisión que podría quedar pendiente tras completar la ruta

Sólo después de alcanzar `DESPLEGADA_RESTRINGIDA`, la revisión jurídica/de privacidad puede ser el único expediente de **aprobación pendiente**. Incluye contrato y roles de tratamiento, información y consentimiento, localización y conservación de datos y archivos, y autorización institucional para pacientes reales. No se interpreta aquí que esos puntos estén aprobados ni se deriva autorización clínica de un despliegue sintético.

## Registro de cierre de la jornada

| Evidencia | Resultado / enlace / responsable |
| --- | --- |
| SHA congelado y manifiesto | Pendiente |
| Blaze, APIs, Auth y Storage verificados | Blaze verificado; Functions consultable sin función publicada. Auth, Storage y otras APIs pendientes. Dos alertas iguales de CLP 25/mes, sin tope automático. |
| Hosting + Function + reglas publicados | No ejecutado |
| Health, sesión y aislamiento remotos | Pendiente |
| V06/V10/V11 y matriz clínica/TI | Pendiente |
| Restauración, reversión y monitoreo | Pendiente |
| Dictamen técnico | **NO-GO para aplicación completa remota** hasta integrar versión, verificar entorno y completar pruebas; Blaze por sí solo no cambia ese dictamen |
| Revisión jurídica/de privacidad | Pendiente para uso con pacientes reales |
