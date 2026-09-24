# Gate de go-live Release 1 — Pie Diabético

## Estado objetivo (verificación 2026-09-13)

### 1) Cierre de alcance
- **Estado:** PENDIENTE
- **Evidencia:** alcance definido en [closure-alcance-release1.md](C:/Users/fecep/Proyectos/01_salud_clinica/pie-diabetico/docs/closure-alcance-release1.md) y permisos en [matriz-permisos-rol-release1.md](C:/Users/fecep/Proyectos/01_salud_clinica/pie-diabetico/docs/matriz-permisos-rol-release1.md).
- **Falta:** firmas clínicas/operativas y sponsor.

### 2) Validación de casos de uso
- **Estado backend/API:** PASS (automático)
- **Evidencia:** `functions/emulator-smoke.js` con **61 checks**, `functions/clinical-emulator-checks.js` y `functions/admin-emulator-checks.js` completos (ejecución en emuladores validada en esta fecha).
- **Pendiente:** V06, V10, V11 en ejecución manual por rol y dispositivo (matriz).
- Nota de ejecución local: en PowerShell, la bandera `--only` en `firebase emulators:exec` requiere comillas sobre la lista (`--only "auth,functions,firestore,storage"`).

### 3) Hardening técnico
- **Sesiones y autorización:** PASS (pruebas de sesión, roles, acceso por rol/centro en emulador).
- **Errores/auditoría:** PARCIAL (flujo de errores base validado; revisión clínica fina pendiente de cierre de mensajes en UX móvil).
  - API registra eventos y bloqueos base; retención/recuperación mínima ya simulada.
- **MFA:** PENDIENTE (decisión del comité).
- **Simulación de recuperación:** **APROBADA** en corrida histórica (respaldo/restore emulador), con re-chequeo de producción pendiente por acceso de credenciales.
- **Actualización (13/09/2026):** ejecutada y aprobada la simulación de backup/restore con `scripts/recovery-smoke.cjs`
  - Resultado (histórico): `{"ok":true,"probeId":"probe-1789263656486","backupSizeBytes":489,"totalMatchingProbes":1,"restored":true}`
  - Resultado (sesión actual con service-account): `{"ok":true,"probeId":"probe-1789270050881","backupSizeBytes":499,"totalMatchingProbes":2,"restored":true}`
  - Re-ejecución de hoy (con `GCLOUD_PROJECT=policlinico-de-pie-diabetico` y `GOOGLE_APPLICATION_CREDENTIALS`): `{"ok":true,"probeId":"probe-1789271388167","backupSizeBytes":503,"totalMatchingProbes":3,"restored":true}`
  - Reintento con credenciales de sesión de CLI para `demo-pie-diabetico` aún `PERMISSION_DENIED`.
  - Registro consolidado: [estado-operativo-release1-2026-09-12-ciclo-3](/C:/Users/fecep/Proyectos/01_salud_clinica/pie-diabetico/docs/estado-operativo-release1-2026-09-12-ciclo-3.md)

### 4) UX final (móvil primero)
- **Estado:** PENDIENTE
- **Evidencia:** propuesta y criterios en [preingreso-ux.md](C:/Users/fecep/Proyectos/01_salud_clinica/pie-diabetico/docs/preingreso-ux.md).
- **Pendiente:** dos sesiones por rol en móvil (V06, V10, V11), con protocolo en [manual-validacion-movil-release1.md](C:/Users/fecep/Proyectos/01_salud_clinica/pie-diabetico/docs/manual-validacion-movil-release1.md).

### 5) Infraestructura y despliegue
- **Estado:** PENDIENTE
- **Evidencia parcial:** CORS por centro y fallback revisados y validados en emulador; `npm run validate` y emuladores verdes.
- **Evidencia hoy:** 
  - `npm run verify:prod` y `npm run verify:prod:strict` sobre `https://policlinico-de-pie-diabetico.web.app` en OK.
  - `npm run check:canary:health`:
  - `https://simulador-clinico.web.app` → `404` (site not found).
    - `https://simulador-clinico-2.web.app` → `200` HTML sin JSON de health.
  - `npm run verify:canary` con `PD_PROD_BASE_URL` canary explícito:
    - `PD_PROD_BASE_URL=https://simulador-clinico.web.app` → `/api/health` 404 (falló en `verify:prod`).
    - `PD_PROD_BASE_URL=https://simulador-clinico-2.web.app` → `/api/health` 200 sin payload `{ status:"ok" }` (falló en `verify:prod`).
    - `npm run verify:prod` / `npm run verify:prod:strict` reiterados con ambos targets en este ciclo.
- **Pendiente:** staging real, canario, monitoreo/alertas y rollback de prueba con protocolo y evidencia.
- **Observación de infraestructura:** reglas de Firestore/Storage actuales en este workspace están en modo `allow ... if false` (uso de acceso por funciones server-side); no se considera bloqueante para este paso, pero debe quedar explícitamente aprobado en la estrategia de despliegue.
- **Estado actualizado canary (13/09/2026):** los proyectos `simulador-clinico` y `simulador-clinico-2` no exponen API de Functions en staging (Cloud Functions API deshabilitada), validado con:
  - `firebase functions:list --project simulador-clinico --debug`
  - `firebase functions:list --project simulador-clinico-2 --debug`
  - Comprobación detallada adicional hoy (logs con `SERVICE_DISABLED` y URL de activación).
  Ambos retornan `SERVICE_DISABLED` con mensaje de activación de Cloud Functions API para su proyecto.

  - `simulador-clinico`: https://console.developers.google.com/apis/api/cloudfunctions.googleapis.com/overview?project=simulador-clinico
  - `simulador-clinico-2`: https://console.developers.google.com/apis/api/cloudfunctions.googleapis.com/overview?project=simulador-clinico-2

Guía operativa para desbloqueo canary:
- [docs/plan-desbloqueo-canary-r1.md](/C:/Users/fecep/Proyectos/01_salud_clinica/pie-diabetico/docs/plan-desbloqueo-canary-r1.md)
- Runbook 10-min operativo: [docs/runbook-10min-canary-r1.md](/C:/Users/fecep/Proyectos/01_salud_clinica/pie-diabetico/docs/runbook-10min-canary-r1.md)

### Actualización de verificación (13/09/2026)

- Verificación funcional extendida:
  - `functions/emulator-smoke.js` → PASS (`61 checks`, `12 auditEvents`)
  - `functions/clinical-emulator-checks.js` → PASS
  - `functions/admin-emulator-checks.js` → PASS
- `scripts/recovery-smoke.cjs` → PASS.
  - Corrida de verificación (histórica): `{"ok":true,"probeId":"probe-1789263656486","backupSizeBytes":489,"totalMatchingProbes":1,"restored":true}`
  - Ajuste de script para resolver bucket en orden de prioridad (`.firebasestorage.app`, `.appspot.com`) y corrida real con credenciales de servicio:
    `{"ok":true,"probeId":"probe-1789270050881","backupSizeBytes":499,"totalMatchingProbes":2,"restored":true}`
  - Reintento con `demo-pie-diabetico` usando credenciales de sesión CLI siguió sin permisos (`PERMISSION_DENIED`).

### Evidencia técnica de producción observada (hoy, sin credenciales admin)
- `GET /api/health` en dominio principal → **200**
- `GET /api/session` sin token → **401**
- `GET /` → **200**
- Bundle público sin las cadenas revisadas en esa fecha (`localhost:4000`, `generativelanguage.googleapis.com` y una cadena sensible redactada).
- Canary/staging:
  - `https://simulador-clinico.web.app` → `GET /api/health` responde **404**.
  - `https://simulador-clinico-2.web.app` → `GET /api/health` responde **200** pero con HTML estático (`frontend_vite`/dist), sin payload `{ "status": "ok" }`.

### Verificación reproducible pre-canary

```bash
node scripts/verify_staging_readiness.cjs
```

Plantilla operativa extendida:

- [docs/canary-rollback-r1.md](C:/Users/fecep/Proyectos/01_salud_clinica/pie-diabetico/docs/canary-rollback-r1.md)

## Criterio de no-avance
- No se autoriza implementación funcional adicional o despliegue a entorno real hasta cerrar:
  - alcance firmado,
  - V06/V10/V11 con PASS,
  - pruebas de recuperación completadas,
  - canary + rollback con evidencia.
- Adicionalmente, hoy la condición de no-avance incluye **habilitar Cloud Functions API** en el proyecto canary operativo (`simulador-clinico`) antes de avanzar.

## Próxima acción única recomendada (hoy)
1) completar firmas de alcance,
2) ejecutar sesiones manuales de V06, V10, V11 (ver [manual-validacion-movil-release1.md](C:/Users/fecep/Proyectos/01_salud_clinica/pie-diabetico/docs/manual-validacion-movil-release1.md)),
3) formalizar en un registro interno el resultado del `backup/restore` ya ejecutado,
4) definir si MFA ingresa en Release 1,
5) publicar a canario + ejecutar checklist de rollback (ver [runbook-operativo-release1.md](C:/Users/fecep/Proyectos/01_salud_clinica/pie-diabetico/docs/runbook-operativo-release1.md)).

Con esta secuencia, al cerrar los 5 puntos se libera el paso a canary/staging.

## Resolución de ambigüedad de canary (activo)

- Mantener **canary único operativo** mientras exista bloqueo técnico en alterno:
  - `simulador-clinico` (`https://simulador-clinico.web.app`) (vigente).
- El proyecto alterno (`simulador-clinico-2`) se habilita solo después de estabilizar `simulador-clinico`.
- Con canary único definido, se puede iniciar validación manual de V06/V10/V11 una vez cerrada API y health.
