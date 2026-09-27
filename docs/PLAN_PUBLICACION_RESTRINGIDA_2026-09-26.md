# Pie Diabético — decisión Spark y ruta de publicación restringida

> **Decisión posterior del usuario (26/09/2026): mantener `simulador-clinico` en Spark.** La ruta de despliegue completo descrita abajo queda como plan **condicional futuro**, no como autorización vigente para activar Blaze o publicar la aplicación clínica. El resultado posible hoy es validación local y, si se prepara y revisa por separado, una demostración estática sin datos clínicos reales. La revisión jurídica **no puede ser el único pendiente** mientras falte la API remota.

## Objetivo original, suspendido por la decisión Spark

Publicar **la aplicación completa** en `simulador-clinico.web.app` (Hosting, `api`, reglas Firestore y Storage) para un grupo invitado que pruebe **únicamente casos sintéticos**. El dominio principal `policlinico-de-pie-diabetico.web.app` y sus datos no forman parte de esta publicación. La revisión jurídica y de privacidad puede seguir pendiente para este estado; **ningún paciente real se incorpora** mientras falte.

El objetivo de `DESPLEGADA RESTRINGIDA` queda pospuesto por la decisión de mantener Spark. Para retomarlo se requiere una nueva decisión sobre Blaze u otra arquitectura que ofrezca la API con aislamiento y controles equivalentes. No se cambia de proyecto ni se conecta el frontend canary al backend principal como atajo.

## Estado comprobado al iniciar (26/09/2026, Chile)

- La candidata integrada `codex/r1-production-readiness` está en `21560b4`; CI del PR borrador #14, emuladores y auditorías de dependencias constan en `CANDIDATE_MANIFEST_R1.md`. No se ha desplegado.
- El checkout `main` contiene cambios posteriores sin confirmar, entre ellos curaciones y catálogo de enfermería. `npm run validate` pasó hoy allí con 16 pruebas, pero **esos cambios no forman parte del commit candidato**. Antes de publicar «todos los cambios locales» hay que compararlos e integrarlos en un nuevo commit, o excluirlos por decisión explícita.
- `simulador-clinico` tiene web app, pero `GET /api/health` devuelve 404. Al inicio `functions:list` devolvió `SERVICE_DISABLED`; una preparación posterior habilitó la consulta de Functions, que no lista ninguna función. `firebase deploy --dry-run --only functions:api` sigue exigiendo Blaze para Cloud Build y Artifact Registry. El proyecto permanece en Spark y no se publicó código. No hay evidencia actual de Auth Google, Storage, respaldo ni ausencia de datos reales en ese proyecto.

## Protocolo vigente: estados separados

| Estado | Evidencia mínima | Uso permitido |
| --- | --- | --- |
| `CANDIDATA_CONGELADA` | Un commit exacto, checkout limpio, manifiesto, validación completa y emuladores en verde | Revisión local con datos sintéticos |
| `PUBLICADA_PARA_VALIDAR` | Blaze/APIs, Auth Google, Hosting + Function + reglas del mismo commit y proyecto; `/api/health` JSON 200, `/api/session` anónimo 401; cuentas invitadas, proyecto sin datos reales comprobado | Validación remota sintética por invitación; observación iniciada |
| `DESPLEGADA_RESTRINGIDA` | Además: V06/V10/V11 en móviles reales con casos sintéticos, aislamiento entre perfiles/centros, restauración de dato y archivo en el destino, reversión ensayada, monitoreo y responsables activos, decisión MFA y cierre clínico/TI de la matriz; cero fallos altos | Validación controlada sostenida; revisión jurídica/privacidad puede quedar pendiente |
| `PILOTO_CON_PACIENTES_REALES` | Todo lo anterior, observación aprobada y autorización clínica, operativa y jurídica/de privacidad para la versión y centro exactos | Uso clínico limitado según acta |

La publicación técnica **no equivale** a aprobación para datos reales. Un resultado de Hosting no acredita el backend; cada capa se comprueba por separado. La observación de 24–48 h comienza al publicar y sigue como control operativo; no se declara terminada antes de transcurrir ese tiempo.

**Ruta vigente en Spark:** `DEMOSTRACION_ESTATICA` sólo mostraría contenido ficticio y público, sin Auth, API, guardado, fotografías clínicas ni permisos operativos. `clinical-preview.html` es deliberadamente exclusivo de desarrollo y no se publicará como si fuese una aplicación funcional. Antes de publicar una página estática se revisará que no incluya configuración del proyecto principal ni datos reales. Las pruebas funcionales seguirán en emuladores locales. Este estado no reemplaza `PUBLICADA_PARA_VALIDAR` ni `DESPLEGADA_RESTRINGIDA`.

## Plan ejecutable hoy mientras se mantiene Spark

1. **Candidata y alcance:** conservar el commit integrado y el resultado del PR #14; inventariar los cambios sin confirmar de `main` sin sobrescribirlos. La comprobación de integración detectó conflictos en 12 archivos, por lo que no existe todavía un commit que reúna de forma verificada todos los cambios locales.
2. **Validación local:** mantener las pruebas de tipos, lógica, build y emuladores con proyecto `demo-pie-diabetico`; registrar por separado los resultados de `main` y de la candidata. No usar el éxito de una versión como evidencia de la otra.
3. **Vista estática, si se decide publicarla:** preparar una página independiente con capturas y contenido sintéticos, sin importar la aplicación clínica ni su configuración Firebase. Revisar el paquete y dejar explícito que el enlace será público. Publicar sólo esa página por Hosting; no desplegar el `dist` de la aplicación, Functions, reglas ni datos.
4. **Cierre:** documentar URL y hash si se publicó esa página; de otro modo, cerrar con vista local. Estado obligatorio de la aplicación completa: `NO-GO REMOTO EN SPARK`. Los pendientes incluyen backend, integración de código, pruebas humanas y operación, además de revisión jurídica.

## Secuencia condicional si se retoma un backend canary

| Orden | Responsable | Acción y evidencia de salida | Corte si falla |
| --- | --- | --- | --- |
| 1. Entorno | Titular de facturación + operación | Activar Blaze y presupuesto/alerta en `simulador-clinico`; habilitar APIs requeridas; confirmar Auth Google, dominio autorizado, Storage y que no haya datos reales. Repetir `functions:list` sin `SERVICE_DISABLED`. | Sin Blaze/API/identidad aislada: no desplegar. |
| 2. Versión | Desarrollo + revisor | Comparar `main` sucio con `21560b4`; decidir inclusión de cada cambio, integrar en checkout aislado, congelar SHA y manifiesto. No incluir credenciales ni datos. | Sin commit exacto revisado: no desplegar. |
| 3. Puerta local | Desarrollo | `npm ci`, `npm ci --prefix functions`, `npm run validate`, `npm run test:emulators`, auditorías de dependencias y revisión de reglas; compilar con `build:canary` usando exclusivamente la configuración web de `simulador-clinico`. | Fallo de compilación, aislamiento o seguridad: corregir y repetir sobre nuevo SHA. |
| 4. Publicación | Operación técnica | Registrar estado anterior; desplegar por proyecto explícito `functions:api`, reglas revisadas y Hosting desde el mismo SHA. Guardar revisiones, hora y operador. | Si alguna capa falla: detener y comprobar que no se habilita la URL como completa. |
| 5. Prueba remota | QA + clínica | Health JSON, sesión anónima 401, login invitado, denegación de usuario no invitado, dos perfiles y dos centros, alta/lectura/foto sintéticas, auditoría y ausencia de referencia al proyecto principal. | Exposición, cruce de centro, escritura en proyecto principal o fallo clínico alto: retirar acceso y revertir. |
| 6. Cierre técnico | Clínica + TI + operación | V06/V10/V11 en móvil real, aprobación de matriz y alcance de **validación sintética**, MFA decidido, respaldo y restauración del canario, reversión ensayada, responsables y monitoreo de 24–48 h asignados. | Si falta una evidencia: queda `PUBLICADA_PARA_VALIDAR`, no `DESPLEGADA_RESTRINGIDA`. |

**Corte de las 23:59, hora de Chile:** anotar SHA, pruebas locales, estado de la posible demostración estática y bloqueos. No comprimir ni dar por aprobadas las sesiones móviles, la restauración o la observación sólo para cumplir la fecha. Con Spark, Hosting de la aplicación completa queda bloqueado por falta de backend; desplegarlo aisladamente presentaría una interfaz sin flujos clínicos funcionales.

## Revisión que podría quedar pendiente tras completar la ruta condicional

Sólo después de alcanzar `DESPLEGADA_RESTRINGIDA`, la revisión jurídica/de privacidad puede ser el único expediente de **aprobación pendiente**. Incluye contrato y roles de tratamiento, información y consentimiento, localización y conservación de datos y archivos, y autorización institucional para pacientes reales. No se interpreta aquí que esos puntos estén aprobados ni se deriva autorización clínica de un despliegue sintético.

## Registro de cierre de la jornada

| Evidencia | Resultado / enlace / responsable |
| --- | --- |
| SHA congelado y manifiesto | Pendiente |
| Blaze, APIs, Auth y Storage verificados | Blaze descartado por decisión del usuario; Function sin publicar |
| Hosting + Function + reglas publicados | No ejecutado |
| Health, sesión y aislamiento remotos | Pendiente |
| V06/V10/V11 y matriz clínica/TI | Pendiente |
| Restauración, reversión y monitoreo | Pendiente |
| Dictamen técnico | **NO-GO para aplicación completa remota bajo Spark**; validación local y eventual demostración estática son resultados distintos |
| Revisión jurídica/de privacidad | Pendiente para uso con pacientes reales |
