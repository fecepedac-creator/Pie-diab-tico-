# Go-live checklist único — Release 1 (Piloto operativo)

**Proyecto:** Pie Diabético  
**Alcance objetivo:** MVP de operación diaria controlada (conservador, sin automatización extra)

## Estado objetivo (actualización 13/09/2026, continuidad)

**Última evidencia técnica corrida (canary y readiness):** `2026-09-13T01:02:41-03:00` (check-canary + verify:prod/strict + validate + recovery smoke).

- Validación técnica y hardening base: **OK** (61 checks, sesiones, permisos, logs, recovery y checks de producción principal).
- Bloqueos de negocio restantes:  
  - `R0` sin firmas,  
  - V06/V10/V11 sin ejecución en móvil real,  
  - decisión MFA sin definir,  
  - canary real 24–48h sin ejecutar.
  - `simulador-clinico.web.app` no expone API (`/api/health` 404).
  - `simulador-clinico-2.web.app` expone host pero no contrato esperado de health (`status:ok`).
  - `Cloud Functions API` deshabilitada en proyectos canary (`simulador-clinico` y `simulador-clinico-2`).
- `docs/_canary-health-latest.json` actualizado con timestamp `2026-09-13T03:47:14.142Z` (simulador-c1/2 siguen sin contrato `/api/health`).
- Documento operativo para cierre hoy: `docs/cierre-r1-hoy-checklist-operativo.md`.
- Plan operativo de 24h: `docs/plan-ejecucion-24h-go-live-r1.md`.
- Tablero consolidado: `docs/go-live-dashboard-operativo-r1.md`.
- Evidencia consolidada del ciclo técnico: 
  - [estado-operativo-release1-2026-09-13-ciclo-6](/C:/Users/fecep/Proyectos/01_salud_clinica/pie-diabetico/docs/estado-operativo-release1-2026-09-13-ciclo-6.md)  
  - [estado-operativo-release1-2026-09-12-ciclo-3](/C:/Users/fecep/Proyectos/01_salud_clinica/pie-diabetico/docs/estado-operativo-release1-2026-09-12-ciclo-3.md).
- Guía de desbloqueo canary (paso a paso): `docs/plan-desbloqueo-canary-r1.md`.
- Runbook ejecutivo canary 10 min: `docs/runbook-10min-canary-r1.md`.

## A. Cierre de alcance (R0) – gate de entrada

| Item | Evidencia requerida | Estado | Responsable | Fecha/Firma |
|---|---|---|---|---|
| Alcance IN/OUT definido y firmado | `docs/closure-alcance-release1.md` + `docs/cierre-bloque-A-R0-2026-09-13.md` | ⬜ Pendiente | Clínico / Operación / Sponsor | |
| Matriz de permisos y acciones aprobada | `docs/matriz-permisos-rol-release1.md` | ⬜ Pendiente | TI + Clínico | |
| Estados de flujo documentados (borrador/guardado/conflicto/enviado/validado) | `docs/matriz-permisos-rol-release1.md` | ⬜ Pendiente | Producto | |
| Límites de salida de piloto registrados | `docs/closure-alcance-release1.md` | ⬜ Pendiente | Clínica + Ops | |

**Condición para pasar R0:** firma de todos los campos en estado **APROBADO**.

## B. Validación funcional por casos de uso

Ver matriz: `docs/validacion-release1-matriz-rol-caso.md`

| Caso | Tipo | Rol | Estado objetivo | Resultado actual | Evidencia | Riesgo |
|---|---|---|---|---|---|---|
| V01 | A | TENS | PASS | PASS | `functions/emulator-smoke.js` | Alto |
| V02 | A | TENS/Enf | PASS | PASS | `functions/emulator-smoke.js` | Alto |
| V03 | A | Enfermería | PASS | PASS | `functions/emulator-smoke.js`, `functions/clinical-emulator-checks.js` | Alto |
| V04 | A | Médico | PASS | PASS | `functions/emulator-smoke.js` | Alto |
| V05 | A | CX/CV/Fisio | PASS | PASS | `functions/emulator-smoke.js` | Alto |
| V06 | M | Trabajo social | Pendiente | PENDIENTE | `docs/manual-validacion-movil-release1.md` + `docs/cierre-bloque-B-V06-2026-09-13.md` | Alta |
| V07 | A | Admin/coord | PASS | PASS | `functions/admin-emulator-checks.js` | Media |
| V08 | A | Auditor | PASS | PASS | `functions/emulator-smoke.js` + `functions/admin-emulator-checks.js` | Alta |
| V09 | A | TENS/Enf/Medic | PASS | PASS | `functions/clinical-emulator-checks.js` + `functions/emulator-smoke.js` | Alto |
| V10 | M | Médico | Pendiente | PENDIENTE | `docs/manual-validacion-movil-release1.md` + `docs/cierre-bloque-C-V10-2026-09-13.md` | Alto |
| V11 | M | Todos (móvil) | Pendiente | PENDIENTE | `docs/manual-validacion-movil-release1.md` + `docs/cierre-bloque-D-V11-2026-09-13.md` | Alta |
| V12 | A | Todos | PASS | PASS | `functions/emulator-smoke.js` | Alto |

**Condición para pasar B:** V06, V10, V11 en PASS sin bloqueantes altos.

## C. Hardening técnico

| Control | Evidencia | Estado |
|---|---|---|
| Identidad/sesiones/roles server-side | `functions/index.js`, emulador: 61 checks | ✅ |
| Errores por permiso y sesión | `functions/emulator-smoke.js`, `functions/admin-emulator-checks.js`, respuesta API con `code` y `requestId` | ✅ |
| Auditoría crítica (alta/edición/cierre/derivación/foto) | `functions/index.js` eventos | ✅ / revisar |
| Retención + política de backups | `docs/runbook-operativo-release1.md` | ⬜ Pendiente |
| Simulación restore | `docs/runbook-operativo-release1.md` + `scripts/recovery-smoke.cjs` | ✅ |
| Simulación restore en entorno real (credenciales de servicio) | `scripts/recovery-smoke.cjs` (`probe-1789271388167`) | ✅ |
| MFA (decisión y despliegue) | `docs/closure-alcance-release1.md` | ⬜ Pendiente |

**Condición para pasar C:** restauración probada y decisión de MFA registrada.

## D. UX móvil

| Item | Evidencia | Estado |
|---|---|---|
| Navegación por rol y flujo móvil sin bloqueos | `docs/manual-validacion-movil-release1.md` | ⬜ Pendiente |
| Estados visibles (borrador/guardado/conflicto/enviado/validado) | UI | ⬜ Pendiente |
| 2 sesiones por rol clave | `docs/manual-validacion-movil-release1.md` | ⬜ Pendiente |

## E. Infraestructura y despliegue

| Control | Evidencia | Estado |
|---|---|---|
| Health/session en dominio | `npm run verify:prod` | ✅ |
| Bundle y patrones sensibles | `npm run verify:prod:strict` | ✅ |
| CORS + configuración de entorno por centro | Implementación en `functions/index.js` | ✅ |
| Canary + monitoreo + rollback | `docs/runbook-operativo-release1.md`, `docs/go-live-release1-operativo.md`, `npm run verify:canary` | ⬜ Pendiente |

> Nota: en este ciclo `npm run verify:canary` ejecuta contra `policlinico-de-pie-diabetico` (dominio principal) y **no valida** automáticamente `simulador-clinico`/`simulador-clinico-2`; para canary debe validarse explícitamente el dominio elegido.
> Para canary explícito, usar (PowerShell):
> `$env:PD_PROD_BASE_URL = "<BASE_CANARY>"; npm run verify:prod` y  
> `$env:PD_PROD_BASE_URL = "<BASE_CANARY>"; npm run verify:prod:strict`.
> `$env:PD_CANARY_CHECK_TARGETS = "https://<BASE_CANARY>"; npm run check:canary:health` (valores separados por coma si quieres más de uno) para confirmar `status: ok` en el dominio candidato.

## F. Criterio de salida final (go-live)

Release 1 se aprueba cuando:
1. R0 firmado por los tres responsables,
2. B validada con V06/V10/V11 en PASS sin bloqueantes,
3. C hardening mínimo con restore probado y MFA decisión registrada,
4. D UX móvil con checklist aprobado,
5. E canary + rollback con evidencia y sin incidente severo en la ventana de observación.

Sin estos cinco puntos, **no hay autorización para uso clínico piloto.**

## H. Operativo de ejecución de hoy

- Ejecutar la secuencia oficial de desbloqueo en:
  - `docs/plan-operativo-hoy-go-live-r1.md`
- Este operativo concentra los 3 bloqueos de prioridad alta:
  - R0 firmado y matriz aprobada,
  - canary funcional (health + API activa),
  - validación móvil crítica (V06, V10, V11) con evidencia real.
- Versión compacta para ejecución en terreno (1 página):  
  `docs/go-live-1pagina-hoy-tablero-r1.md`

## G. Evidencia fresca capturada en esta corrida

- `node scripts/verify_staging_readiness.cjs` (base principal): OK (`https://policlinico-de-pie-diabetico.web.app`).
- `npm run verify:prod` y `npm run verify:prod:strict`: OK (comando ejecutado con base principal).
- `node scripts/check-canary-health.cjs` con `PD_CANARY_CHECK_TARGETS`:
  - `https://simulador-clinico.web.app/api/health` → `404` HTML (sitio no encontrado).
  - `https://simulador-clinico-2.web.app/api/health` → `200` HTML sin `status: "ok"`.
- `npm run verify:prod` for `simulador-clinico.web.app` → falla en `/api/health` (status 404).
- `npm run verify:prod` for `simulador-clinico-2.web.app` → falla por contrato de health (sin `{ status: "ok" }`).
- `npx firebase-tools emulators:exec --only auth,functions,firestore,storage --project demo-pie-diabetico "node functions/emulator-smoke.js"`:
  - `Clinical workflow emulator checks: passed`
  - `Administración: ... verificados.`
  - Resultado agregado: `{"ok":true,"checks":61,"auditEvents":12}`
- `npx firebase-tools emulators:exec --only auth,functions,firestore,storage --project demo-pie-diabetico "node functions/emulator-smoke.js"` (repetido):
  - Resultado agregado: `{"ok":true,"checks":61,"auditEvents":12}`
- `firebase functions:list --project simulador-clinico` y `simulador-clinico-2`:
  - Ambos responden `SERVICE_DISABLED` (Cloud Functions API no habilitada), bloqueo operativo para cualquier canal canary real en esos proyectos.
- `node ./scripts/verify_staging_readiness.cjs --base https://policlinico-de-pie-diabetico.web.app` ✅ (`status ok`, sesión/API correctos).
- `node ./scripts/verify_staging_readiness.cjs --base https://policlinico-de-pie-diabetico.web.app --strict` ✅ (`status ok`, contrato completo).
- `node ./scripts/recovery-smoke.cjs` con `GCLOUD_PROJECT=policlinico-de-pie-diabetico` y `FIREBASE_STORAGE_BUCKET=policlinico-de-pie-diabetico.firebasestorage.app`:
  - `{"ok":true,"probeId":"probe-1789272106639","backupSizeBytes":503,"totalMatchingProbes":4,"restored":true}`

## Enlace de control operativo
- `docs/go-live-release1-operativo.md`
- `docs/go-live-checklist-unico-r1.md`
- `docs/go-live-gate-release1.md`
- `docs/auditoria-avance-r1-pendiente.md`
- `docs/canary-rollback-r1.md`

## Última evidencia técnica (13/09/2026)

- `npm run validate` → OK (typecheck/tests/build/lint)
- `npm run verify:prod` → OK
- `npm run verify:prod:strict` → OK
- `functions/emulator-smoke.js` → PASS (`61 checks`)
- `functions/clinical-emulator-checks.js` → PASS
- `functions/admin-emulator-checks.js` → PASS
- `scripts/recovery-smoke.cjs`: PASS en corrida histórica de emulador (`probe-1789265825186`, `backupSizeBytes 489`).
- `scripts/recovery-smoke.cjs` real con credenciales de servicio (`service-account.json`): `probe-1789270050881`  
  - Resultado: `{"ok":true,"probeId":"probe-1789270050881","backupSizeBytes":499,"totalMatchingProbes":2,"restored":true}`  
  - Resultado reciente: `{"ok":true,"probeId":"probe-1789271388167","backupSizeBytes":503,"totalMatchingProbes":3,"restored":true}`
  - Nota: reintentos con credenciales de sesión/CLI para `demo-pie-diabetico` siguieron devolviendo `PERMISSION_DENIED`.

### Nota de estado operativo (13/09/2026, ciclo posterior)

- `node scripts/verify_staging_readiness.cjs` ejecutado nuevamente en este ciclo con resultado OK (dominio principal).
- `node scripts/verify_staging_readiness.cjs` en `https://simulador-clinico.web.app` -> `api/health 404` (no viable como canary hoy).
- `node scripts/verify_staging_readiness.cjs` en `https://simulador-clinico-2.web.app` -> `api/health` con status 200 pero sin payload `{status:"ok"}`.
- `scripts/recovery-smoke.cjs` con credenciales de sesión de CLI no puede correr en `demo-pie-diabetico` por `PERMISSION_DENIED`; la ejecución con service account sí.
- `scripts/recovery-smoke.cjs` en `policlinico-de-pie-diabetico` (con `GCLOUD_PROJECT` + `FIREBASE_STORAGE_BUCKET`) ✅:
  - `probe-1789272106639`, `backupSizeBytes 503`, `restored:true`.
- Nota: sigue pendiente ejecución canary/rollback de 24–48 h en entorno objetivo definido.
- Bloqueo actual de negocio no técnico: firmas R0 y validación manual móvil (V06, V10, V11) aún pendientes.

## I. Plan de desbloqueo en orden (hoy, operativo)

1. **R0 y alcance (alta prioridad):**
   - Completar 6 firmas en `docs/closure-alcance-release1.md` y `docs/matriz-permisos-rol-release1.md`.
   - Reflejar aprobación en: `docs/go-live-checklist-unico-r1.md`, `docs/go-live-gate-release1.md`.

2. **Canary mínimo viable:**
   - Habilitar Cloud Functions API en `simulador-clinico` (proyecto canary definido).
   - Validar:
     - `firebase --debug functions:list --project simulador-clinico`
     - `node scripts/check-canary-health.cjs` (target canary explícito)
     - `npm run verify:prod` + `npm run verify:prod:strict` con `PD_PROD_BASE_URL=https://simulador-clinico.web.app`.

3. **Validación móvil:**
   - Ejecutar V06, V10, V11 en móvil real con evidencia en:
     - `docs/manual-validacion-movil-release1.md`
     - `docs/validacion-release1-matriz-rol-caso.md`
   - Completar bloques B/C/D asociados.

4. **Hardening final de cierre:**
   - Registrar decisión MFA y evidenciar retención/RTO-RPO en:
     - `docs/closure-alcance-release1.md`
     - `docs/runbook-operativo-release1.md`.

5. **Go-live final de la etapa:**
   - Ejecutar y cerrar checklists:
     - `docs/canary-24h-ops-checklist.md`
     - `docs/canary-rollback-r1.md`
     - `docs/go-live-gate-release1.md`
