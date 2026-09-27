# Canary R1 sintético — estado y procedimiento

**Destino único:** `pie-diabetico-canary-2026`. `simulador-clinico` pertenece a otra aplicación; queda excluido de todo comando, regla, dato y despliegue de Pie Diabético. Tampoco se usa el proyecto principal `policlinico-de-pie-diabetico` para este canary.

## Estado verificado el 27/09/2026

- Candidata integrada: `b43517e` en `codex/r1-production-readiness`, PR borrador #14 con CI `validate` aprobada en Node 22. La integración funcional `28defba` pasó `npm run validate` (19 pruebas unitarias, tipado, build y lint), `npm run test:emulators` (61 controles base y siete escenarios), y `npm run build:canary` con identidad del proyecto nuevo. Cambios posteriores requieren nueva validación del SHA exacto.
- Firebase: proyecto dedicado en Blaze, app web `1:388252582351:web:96bf5a027f7b78a93452ba`. La configuración web devuelve `projectId` y bucket del proyecto nuevo. Auth respondió con cero usuarios; Firestore `(default)` en `nam5` respondió con cero colecciones raíz y protección contra eliminación; el bucket de Storage respondió con metadatos en `US-EAST1`; `functions:list` respondió sin funciones. El canal Hosting `live` existe, sin prueba de aplicación funcional. Se consultaron sólo metadatos y conteos, sin leer documentos ni escribir.
- La consola registra Google Auth habilitado, dominio canary autorizado, Storage inicialmente con reglas de denegación y alerta de CLP 100/mes. La alerta no es tope de gasto. Reconfirmar estos puntos antes de publicar; el monto deseado de alerta sigue pendiente.
- **No se han desplegado** Functions, reglas ni Hosting de esta candidata. `/api/health`, invitaciones, recuperación y reversión remotas carecen de prueba. Estado **NO-GO** para aplicación remota completa y pacientes reales.

## Entrada de T6

1. Trabajar en un checkout aislado y limpio del SHA candidato. Registrar `git rev-parse HEAD`, estado del PR y CI del mismo SHA. Revisar diferencias funcionales pendientes de `main` sin alterarlo. Usar siempre `--project pie-diabetico-canary-2026`; comprobar `.firebaserc` sin alias predeterminado.
2. Repetir la inspección de sólo lectura: proyecto y app web, Auth Google y dominio autorizado, usuarios y colecciones raíz vacíos, bucket propio y reglas actuales, Functions, Hosting, APIs y facturación. Si hay datos, usuarios o servicios inesperados, detener T6 y aclarar titularidad antes de escribir o reemplazar reglas.
3. Revisar `firebase.json`, reglas Firestore y Storage, permisos de despliegue, costos y plan de reversión. Preparar sólo identidades invitadas y centros **ficticios**, con fotografías sintéticas. No importar, enlazar ni consultar pacientes reales. Registrar responsable técnico y ventana de observación. Las regiones `nam5`/`US-EAST1` de datos y `southamerica-west1` de Function son distintas; medir latencia y fallos, sin asumir aptitud clínica.
4. Obtener la configuración de la app web del proyecto dedicado y compilar con `npm run build:canary`. Confirmar que bundle, API, Storage y Auth apuntan al mismo proyecto, sin referencias al principal ni al destino descartado. Repetir `npm run validate`, `npm run test:emulators` y auditorías de dependencias sólo si el código o el SHA cambió desde CI o falta evidencia del SHA.

## Publicación y prueba sintética

5. Registrar estado previo de Hosting, Functions y reglas. Desde el SHA verificado y con proyecto explícito, publicar por capas: `firebase deploy --only functions:api --project pie-diabetico-canary-2026`; después reglas Firestore y Storage revisadas; finalmente Hosting. Detenerse si una capa falla. Guardar revisiones, hora, operador y SHA. No fusionar el PR ni publicar en producción.
6. Exigir `/api/health` HTTP 200 JSON con `status: "ok"`, `/api/session` anónimo HTTP 401, Hosting con bundle del proyecto dedicado y acceso por invitación. Probar sesión de cuenta invitada y rechazo de cuenta ajena; permisos por rol y centro, alta/lectura, fotografía, auditoría y persistencia, todo con datos ficticios. Comprobar aislamiento del proyecto y ausencia de escrituras en el principal.
7. Ensayar reversión del despliegue y restauración de un dato y un archivo **sintéticos** en el proyecto canary. Registrar tiempo, versión, resultado y procedimiento de recuperación. Si hay exposición, cruce de centros o datos reales, retirar acceso y detener pruebas.
8. Observar 24–48 horas con responsable y horario registrados: salud y latencia de API, errores de Functions, denegaciones esperadas e inesperadas, auditoría, Storage, Firestore, cuotas y costo. El resultado sólo puede pasar a `PUBLICADA_PARA_VALIDAR` al completar la prueba remota mínima; `DESPLEGADA_RESTRINGIDA` requiere además V06/V10/V11, aprobación clínica/TI, MFA y recuperación/reversión acreditadas. Ningún estado permite pacientes reales sin T8 y aprobación expresa.

**Informe de T6:** SHA y entorno exactos, releases y reglas, comandos y resultados, casos sintéticos y evidencia de aislamiento, recuperación y reversión, observación, incidentes, costo y bloqueos. Si falta una puerta, registrar NO-GO y no inferir que Hosting publicado equivale a aplicación funcional.
