# Manifiesto de candidata R1 — 26/09/2026

**Actualización del 27/09/2026:** este cuadro conserva los hashes de la candidata anterior y no describe el bundle del canary nuevo. La candidata técnica actual es `5190b71`, que agrega registro posterior y retiro de consentimiento fotográfico; el PR borrador #14 pasó CI para ese código en Node 22 antes de su publicación restringida. El destino único es `pie-diabetico-canary-2026`; Hosting live release `1790518069149000`, versión `e7a589711957e012`, y Function `api` hash `caee176d7272c7ef843c1b40105b6c707d9f4079` corresponden a la publicación informada de esta corrección. Las limitaciones de la release anterior y el resto del estado constan en el [informe T6](T6_CANARY_PREFLIGHT_2026-09-27.md). T6 debe completar la trazabilidad y las pruebas remotas pendientes.

Rama aislada: `codex/r1-production-readiness`. La combinación funcional verificada quedó en `51c94d0c508855c71a07ca55f6610c7fff1b232f` (árbol Git `cbe42d0bf45b2915c970fb62df5292883c5f8a6c`); este manifiesto sólo agrega estado documental. Checkout principal intacto.

| Artefacto local de `npm run validate` | SHA-256 |
| --- | --- |
| `dist/index.html` | `C4CBFCE542E487B0AF2AAEF66ED785A2EBF37B5267A7462F2F3CC64087BDB8CA` |
| `dist/assets/index-6CgCC7YV.css` | `77F0CD633F2809E780863AD46021C47A016B3B9B21506EE589A0EEBD697D2B46` |
| `dist/assets/index-B0R9E9xF.js` | `A7BA705775D798C8CF6B6036359DF17ED58BFBE455360C068B1425ED555333B9` |

Controles locales sobre la combinación integrada: `npm run validate` pasó (15 pruebas unitarias, tipado, build y sintaxis); `npm run test:emulators` pasó (`baselineChecks: 61`, siete escenarios de candidata, 26 eventos de auditoría); `npm audit --omit=dev --audit-level=low` en raíz y Functions informó cero vulnerabilidades. Navegación local de asignación social en `RESULTADO_ASIGNACION_SOCIAL.md`.

**CI remota:** PR borrador [#14](https://github.com/fecepedac-creator/Pie-diab-tico-/pull/14), trabajo `validate` aprobado para `233d160` en Node 22 con `npm run validate`, emuladores y auditorías de producción. Este manifiesto no autoriza fusionar ni publicar.

**Límites:** validación local con Node 24; ningún artefacto se publicó. Hosting, Functions, canary, V06/V10/V11, aprobaciones R0 y recuperación siguen sin prueba final. Estado **NO-GO**.
