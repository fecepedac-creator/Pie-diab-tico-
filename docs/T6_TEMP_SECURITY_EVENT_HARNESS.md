# T6 — harness temporal para tres eventos autenticados

**Estado:** preparado y probado localmente; **no publicado ni ejecutado contra el canary remoto**. Rama aislada `codex/t6-security-event-harness`, base `50c00fe` de `codex/r1-production-readiness`. No integrar en la candidata coordinada ni usar con pacientes reales.

## Contrato del harness

El build ordinario no incluye el chunk. La interfaz aparece sólo si se compila con `--mode canary`, `VITE_T6_SECURITY_EVENT_DIAGNOSTIC=enabled` y se abre `?t6_security_event=1`. Se carga la sesión de la aplicación (`GET /api/session`) para verificar una membresía **activa y de rol único TENS** en `canary-centro-01`, con UID coincidente y centro activo. Este GET de preparación ya existe en la aplicación; su cuerpo de sesión se usa **sólo en memoria** para la puerta de rol. En esta ruta se omite la carga automática de `/state` y no se monta el panel clínico.

Con esa puerta aprobada y un clic explícito, el harness obtiene `auth.currentUser.getIdToken()` en memoria y hace, secuencialmente y una sola vez por carga de módulo, estos GET al `location.origin`:

1. `/api/session` → 200.
2. `/api/centers/canary-centro-01/audit` → 403.
3. `/api/centers/t6-no-center/state` → 403.

Si el estado o el `X-Request-Id` UUID esperado falla, se detiene sin pedir el siguiente recurso. Usa `mode: same-origin`, rechaza redirects, no manda cookies, no manda referrer y no lee ni representa ningún cuerpo de **esas tres respuestas**. La pantalla contiene sólo etiqueta fija, HTTP y `X-Request-Id`; los errores son genéricos. No registra ni almacena token, UID, correo, payload o dato clínico. El servidor sigue siendo la autoridad de permisos; esta puerta de cliente sólo limita la operación accidental del harness.

## Evidencia local

- `node --test scripts/t6-security-event-probe.test.mjs`: 4/4 pruebas; puerta TENS de rol único, whitelist exacta, mismo origen, GET, token sólo en Authorization, cuerpos sin analizar, y aborto ante estado o UUID inesperados.
- `npm run typecheck`: PASS.
- `npm run build` + `node scripts/check-t6-build.mjs normal`: PASS, un JS y sin marcadores diagnósticos. Artefacto `index-CH-Y5faK.js`, SHA-256 `75646DFC5128A4CA91DFE7C51119F3D553A45EBE8966D9594E20BFDE5AE65D3C`.
- Build canary sintético **sin** flag + `node scripts/check-t6-build.mjs normal`: PASS, un JS y sin interfaz diagnóstica.
- Build canary **sintético** con flag + `node scripts/check-t6-build.mjs diagnostic`: PASS, dos JS; chunk `T6SecurityEventDiagnostic-Bjgm3JJX.js`, SHA-256 `30F71A261F570F4E8BFDA622D9F45E85EDC74A0D4C92DBA3229D51FCD8F5C346`; entrada `index-CXz2QFD4.js`, SHA-256 `2A33FE75C87A8806C7B8F2F55AD3CEFDD2CCC6B2B7C1CF5C70D71A0B58FF7C99`. La configuración Firebase y OAuth de esa compilación fue deliberadamente ficticia y **no es publicable**.
- Ningún bundle contiene token de prueba, centinela inválido ni correo TENS de prueba. La prueba local no acredita el resultado de Cloud Logging ni el estado remoto.

## Procedimiento propuesto: Hosting canary temporal y restauración

**No ejecutar desde esta rama sin coordinación.** El operador debe fijar SHA y CI, ventana exclusiva, versión actual de Hosting, revisión/digest de Function `api`, rulesets, Auth/configuración y huellas de membresías, `auditLogs`, datos clínicos y Storage conforme a [protocolo remoto](T6_SECURITY_EVENT_REMOTE_PROTOCOL.md). Reconfirmar que el proyecto es exactamente `pie-diabetico-canary-2026`, que la Function sigue en la revisión aprobada (`api-00008-dam` al último corte) y que Hosting `live` está en **`91701f803b64c5c7`**; si hay deriva, detenerse y replantear. Comprobar que `t6-no-center` no existe. No tocar Auth, Function, reglas ni datos.

1. Desde el SHA revisado, usar únicamente la **configuración web pública real del canary** ya aprobada. Compilar con `VITE_T6_SECURITY_EVENT_DIAGNOSTIC=enabled npm run build:canary` (en PowerShell, establecer esa variable de entorno en el proceso antes de invocar npm). Ejecutar `node scripts/check-t6-build.mjs diagnostic`. Registrar hashes SHA-256 de `dist/index.html` y `dist/assets/*.js` y cotejar el proyecto Firebase en el bundle. **No publicar el artefacto sintético usado para las pruebas locales.**
2. Publicar exclusivamente Hosting: `firebase deploy --only hosting --project pie-diabetico-canary-2026`. Registrar ID de release y versión servida; comprobar que Function/revisión/digest y rulesets no cambiaron. Si Hosting incorpora otro cambio simultáneo o la versión servida no corresponde al artefacto, detenerse y restaurar.
3. En Edge Perfil 1, con la sesión TENS ficticia ya activa, abrir `https://pie-diabetico-canary-2026.web.app/?t6_security_event=1`. Confirmar que aparece el perfil TENS requerido y que no se carga el panel clínico. Tras el clic único, copiar **sólo** hora, estado HTTP y tres UUID `X-Request-Id`; nunca token, UID, cuerpos o captura del panel clínico. La carga inicial hace un `/api/session` adicional de preparación, que debe contabilizarse como `session.validated` propio, independiente de los tres GET del botón. No repetir solicitudes para compensar retrasos de logs.
4. Por cada UUID del botón, cotejar exactamente un `security_event` en la revisión congelada y los estados/razones `session.validated/session_validated` 200, `access.denied/insufficient_role` 403 y `access.denied/center_inactive` 403, siguiendo el protocolo remoto. Consultar hasta dos minutos sin repetir GET. Confirmar ausencia de datos sensibles en `jsonPayload`, ausencia de `auditLogs` de rechazo/centro ajeno y comparar huellas. El control de `lastAccessAt`/`updatedAt` permite sólo la deriva prevista.
5. **Restaurar Hosting inmediatamente**, incluso si la prueba falla: crear una nueva release `live` cuyo `versionName` sea exactamente `sites/pie-diabetico-canary-2026/versions/91701f803b64c5c7` mediante Hosting `sites.releases.create`, como ya se ejercitó en el [preflight de reversión](T6_CANARY_PREFLIGHT_2026-09-27.md). No usar un rollback relativo si otra release apareció. Confirmar que `live` apunta a ese ID exacto, comprobar `/`, `/api/health` y `/api/session` anónima según el protocolo, y comparar Function, reglas, Auth, membresías, `auditLogs`, datos y Storage con el baseline. Recargar Edge en línea y confirmar que la interfaz diagnóstica ya no aparece; limpiar el caché del sitio si el service worker sirve una copia antigua. Registrar release de restauración y cierre de ventana.

**Límite:** restaurar Hosting no revierte lecturas ni eventos de seguridad ya emitidos. La interfaz temporal no valida retención R0, auditoría Admin SDK, pacientes reales ni T6 completo; tampoco sustituye la prueba de otro centro activo. Ante respuesta/log inesperado, proyecto o versión erróneos, datos sensibles, o deriva no explicada, detener la matriz y restaurar Hosting.
