# T6 — preflight del canary dedicado, detenido

**Corte:** 27/09/2026, 11:15 UTC. **Estado:** NO-GO para continuar T6. No se ejecutó ningún despliegue, cambio de reglas, alta de usuario, escritura de datos ni reversión.

## Candidata y entorno

- Checkout aislado `codex/t6-canary-preflight-20260927`, limpio al iniciar en `aa81478c9b35f95a5b1f9b8bb644ed52c4ff0d6b`. El PR borrador #14 sigue abierto y apunta a ese SHA; su trabajo `validate` concluyó `SUCCESS` en Node 22: [CI](https://github.com/fecepedac-creator/Pie-diab-tico-/actions/runs/36315002183/job/108607934877).
- `.firebaserc` no tiene alias predeterminado. El alias `canary` apunta a `pie-diabetico-canary-2026`; `prod` apunta a otro proyecto y no se usó. `firestore.rules` y `storage.rules` contienen denegación total; `firebase.json` define la reescritura `/api/**` hacia `api` en `southamerica-west1`.
- `firebase projects:list` confirmó el proyecto `pie-diabetico-canary-2026` número `388252582351`. `firebase apps:list WEB --project pie-diabetico-canary-2026` y `apps:sdkconfig` confirmaron la app `1:388252582351:web:96bf5a027f7b78a93452ba`, el mismo `projectId`, Auth domain y bucket propios. No se imprimió la clave web en este informe.
- `main` conserva cambios sin confirmar. No se modificó su worktree ni se incorporaron sus diferencias restantes.

## Bloqueo

`firebase functions:list --project pie-diabetico-canary-2026` devolvió **`api` v2, HTTPS, Node 22, `southamerica-west1`**. El procedimiento T6 exigía repetir la inspección antes de publicar y detenerse ante servicios inesperados. El corte anterior documentaba cero Functions. Además, `firebase hosting:channel:list --site pie-diabetico-canary-2026 --project pie-diabetico-canary-2026` mostró `live` con última release `2026-09-27 08:11:40` (hora mostrada por la CLI). Un GET de sólo lectura a `https://pie-diabetico-canary-2026.web.app/api/health` devolvió HTTP 200 JSON `{"status":"ok","service":"pie-diabetico-api","version":"4.0.0"}`. Ese payload coincide con el código fuente local, pero no demuestra el SHA, operador, contenido completo ni procedencia de la publicación. La Function y la release se tratan como **preexistentes y no atribuidas**.

No se obtuvo el ID de la release ni la revisión de la Function; ningún release de este hilo puede atribuirse a `aa81478`.

El checkout no contiene `.env.canary`; por ello no se generó ni inspeccionó un bundle canary de este SHA. La configuración web remota permite prepararlo después de aclarar el servicio preexistente. No se instalaron dependencias ni se repitieron pruebas locales: la CI exacta está aprobada y la puerta remota ya bloqueó la publicación.

## Alcance no verificado tras el corte

No se reconfirmaron Auth Google y dominio autorizado, cantidad de usuarios, colecciones raíz, contenido y reglas actuales del bucket, APIs/facturación, reglas remotas ni permisos de despliegue. Tampoco se probó sesión 401, invitaciones, cuentas ajenas, roles/centros, datos o foto sintéticos, auditoría, aislamiento, restauración, reversión ni observación de 24–48 horas. El health JSON aislado no convierte el canary en `PUBLICADA_PARA_VALIDAR`.

## Condición de reentrada y T7

El responsable del proyecto debe identificar el operador, SHA, revisión y propósito de `api` y de la release Hosting `live`, y confirmar si deben conservarse o revertirse. Después corresponde repetir el preflight completo del procedimiento vigente, compilar el bundle con configuración del proyecto dedicado y publicar sólo desde un SHA verificado si todas las puertas pasan. **T7 no inicia** hasta completar T6 con pruebas y recuperación remotas sintéticas documentadas, además del paquete R0 aprobado que exige `PRODUCTION_READINESS.md`. No se fija inicio de observación mientras T6 esté detenido.
