# Manifiesto de candidata R1 — 26/09/2026

**Corte vigente del 27/09/2026, 22:18 UTC:** la candidata coordinada mantiene el código `805f104` de eventos estructurados de sesión validada y rechazos 401/403; los scripts prospectivos de Admin SDK sintético con guardas de emulador se integraron en `d590e25` y siguen sólo locales. El operador publicó **sólo Function `api`** desde el SHA limpio `73ff4e9` (CI Node 22 aprobada) en `pie-diabetico-canary-2026`: revisión `api-00008-dam` al 100 % `LATEST`, hash Firebase `9991eb1d51cfbd237c995984b487f2c3d0866db4`, digest `sha256:06eb898cda7e6ac99cf467c19e8ec577f3da787355a3f75a385ee3c2ac87f627`. Hosting sigue en versión `91701f803b64c5c7`, release `1790543937715000`. T6 acreditó reversión y reposición live con datos ficticios y ahora correlacionó [dos rechazos anónimos 401](T6_SECURITY_EVENT_REMOTE_PROTOCOL.md) con eventos seguros en Cloud Logging; observó un `session.validated` TENS sin capturar la cabecera de respuesta. Faltan dos casos 403 autenticados, correlación completa del 200, decisión R0 de retención y aprobaciones, auditoría Admin SDK integral y observación prospectiva 24–48 h. **T6 y producción permanecen NO-GO.** Véanse [estado vigente](CURRENT_STATE.md), [auditoría de 107 eventos](T6_AUDIT_2026-09-27.md) e [informe T6](T6_CANARY_PREFLIGHT_2026-09-27.md).

**Corte anterior, histórico (20:37 UTC):** el código funcional `261058d` incluyó la entrega de fotos TENS a revisión sin cerrar la atención clínica y pasó CI antes de publicarse exclusivamente en canary. T6 verificó una entrega ficticia de dos fotos existentes con atención `in_progress`, negativos de API por rol/centro y una restitución manual de centinelas. La reversión live, pendiente en ese corte, se acreditó después y consta en el informe T6.

**Corte anterior, histórico (19:55 UTC):** el código funcional coordinado era `e92dc75`, publicado sólo en canary con Function hash `54a889a86169fed7a23737346fe047a1fb4129f7` y Hosting release `1790538691844000`, versión `12d98887807c2376`. T6 verificó la miniatura privada de la foto ficticia existente. Esta pareja es la inmediatamente anterior para el ensayo de reversión descrito en el informe T6.

**Corte anterior, histórico:** el siguiente cuadro conserva hashes de una candidata anterior y no describe el bundle actual. La candidata técnica de ese corte era `f0664e1`, que integró la medición fotográfica calibrada de `6cda1ad`. En ese momento la Function remota tenía hash `6b6c86d3c63882ec1de9eb15ecbcfa77feb46114` y Hosting live release `1790519221760000`, versión `2246285f81e8bf10`. El cálculo y la persistencia de la medición pasaron en emulador; la carga remota aún no estaba acreditada.

Rama aislada: `codex/r1-production-readiness`. La combinación funcional verificada quedó en `51c94d0c508855c71a07ca55f6610c7fff1b232f` (árbol Git `cbe42d0bf45b2915c970fb62df5292883c5f8a6c`); este manifiesto sólo agrega estado documental. Checkout principal intacto.

| Artefacto local de `npm run validate` | SHA-256 |
| --- | --- |
| `dist/index.html` | `C4CBFCE542E487B0AF2AAEF66ED785A2EBF37B5267A7462F2F3CC64087BDB8CA` |
| `dist/assets/index-6CgCC7YV.css` | `77F0CD633F2809E780863AD46021C47A016B3B9B21506EE589A0EEBD697D2B46` |
| `dist/assets/index-B0R9E9xF.js` | `A7BA705775D798C8CF6B6036359DF17ED58BFBE455360C068B1425ED555333B9` |

Controles locales sobre la combinación integrada: `npm run validate` pasó (15 pruebas unitarias, tipado, build y sintaxis); `npm run test:emulators` pasó (`baselineChecks: 61`, siete escenarios de candidata, 26 eventos de auditoría); `npm audit --omit=dev --audit-level=low` en raíz y Functions informó cero vulnerabilidades. Navegación local de asignación social en `RESULTADO_ASIGNACION_SOCIAL.md`.

**CI remota:** PR borrador [#14](https://github.com/fecepedac-creator/Pie-diab-tico-/pull/14), trabajo `validate` aprobado para `233d160` en Node 22 con `npm run validate`, emuladores y auditorías de producción. Este manifiesto no autoriza fusionar ni publicar.

**Límites:** validación local con Node 24; ningún artefacto se publicó. Hosting, Functions, canary, V06/V10/V11, aprobaciones R0 y recuperación siguen sin prueba final. Estado **NO-GO**.
