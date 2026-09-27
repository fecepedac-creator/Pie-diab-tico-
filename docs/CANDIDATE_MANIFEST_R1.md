# Manifiesto de candidata R1 — 26/09/2026

**Corte vigente del 27/09/2026, 19:55 UTC:** el código funcional coordinado es `e92dc75`; la rama `codex/r1-production-readiness` agrega después sólo documentación T6. El SHA funcional pasó CI en Node 22 en los PR borradores #16 y #14 antes de publicarse exclusivamente en `pie-diabetico-canary-2026`. La Function `api` remota tiene hash `54a889a86169fed7a23737346fe047a1fb4129f7` y Hosting live release `1790538691844000`, versión `12d98887807c2376`. El usuario confirmó que el caso y la foto son ficticios; T6 comprobó que la foto previamente guardada muestra tarjeta y miniatura por la ruta privada, sin subir otra imagen. Siguen pendientes negativas completas por rol y centro, auditoría, recuperación, reversión y observación. **T6 y producción permanecen NO-GO.** Véanse [estado vigente](CURRENT_STATE.md) e [informe T6](T6_CANARY_PREFLIGHT_2026-09-27.md).

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
