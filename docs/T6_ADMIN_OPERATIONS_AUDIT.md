# T6 — registro prospectivo de operaciones Admin SDK

**Alcance local, 27/09/2026.** Esta unidad añade instrumentación para ejecuciones futuras de `scripts/recovery-smoke.cjs` y limita `scripts/bootstrap_platform_admin.cjs` al emulador local. No reconstruye las altas, limpiezas o recuperaciones ya realizadas en el canary; los 107 eventos clínicos de [T6_AUDIT_2026-09-27.md](T6_AUDIT_2026-09-27.md) no cambian. No hubo escritura ni despliegue remoto.

## Contrato

- El operador indica `--project`, `--operator`, `--ticket` y `--purpose`; un `--request-id` UUID se genera si no se proporciona. Sólo se aceptan `demo-pie-diabetico` con emuladores Firestore **y Storage** locales o `pie-diabetico-canary-2026` sin emuladores. Se bloquean `simulador-clinico`, `policlinico-de-pie-diabetico`, cualquier otro proyecto y las variables de proyecto incompatibles. Storage requiere `--bucket` explícito del mismo proyecto. El bootstrap local sólo requiere emulador Firestore.
- El modo predeterminado es **dry-run**: lee metadatos y muestra el plan, sin escribir datos ni auditoría. `--execute` inicia cada paso creando un documento en `adminOperationLogs/{requestId}-{secuencia}`; si esa escritura falla, la mutación no comienza. Luego registra resultado y metadatos posteriores. Un registro `started` sin cierre exige conciliación manual antes de reintentar.
- Cada evento conserva proyecto/entorno, correo **declarado** por el operador, ticket, propósito, `requestId`, acción, recurso, hora de inicio y fin, resultado y evidencia antes/después. La evidencia se restringe a existencia, `updateTime` de Firestore o generación/metageneración/tamaño de Storage. No se registran documentos, imágenes, payloads clínicos, tokens ni secretos. La identidad declarada no prueba por sí misma qué principal ADC ejecutó el cambio; IAM/Cloud Audit y el registro de aprobación deben corroborarla.
- El ensayo de recuperación sólo usa `recovery_probes/probe-{requestId}` y `recovery_probe/probe-{requestId}/payload.txt`, con contenido generado sintéticamente. Registra creación, borrado, restauración y marca `cleanup-ready`. La limpieza exige `--cleanup --probe-id`, comprueba marca y contenido sintético, y registra cada borrado. Las precondiciones de Firestore y Storage impiden borrar una versión que cambió entre la lectura y la acción.
- `bootstrap_platform_admin.cjs` exige centro explícito y sólo opera con `demo-pie-diabetico` y emulador Firestore. Su batch de administrador, centro y membresía queda bajo un evento con metadatos de los tres recursos. No habilita bootstrap remoto.

## Uso acotado

Dentro de `firebase emulators:exec --project demo-pie-diabetico --only firestore,storage`, por ejemplo:

```powershell
node scripts/recovery-smoke.cjs --project demo-pie-diabetico --bucket demo-pie-diabetico.appspot.com --operator operador@ejemplo.test --ticket T6-LOCAL --purpose "Prueba sintetica local"
node scripts/recovery-smoke.cjs --project demo-pie-diabetico --bucket demo-pie-diabetico.appspot.com --operator operador@ejemplo.test --ticket T6-LOCAL --purpose "Prueba sintetica local" --execute
```

El segundo comando imprime `probeId` y `requestId`; para limpiar, usar otro `requestId` y primero ejecutar sin `--execute`, después con `--execute`:

```powershell
node scripts/recovery-smoke.cjs --project demo-pie-diabetico --bucket demo-pie-diabetico.appspot.com --operator operador@ejemplo.test --ticket T6-LOCAL --purpose "Limpieza sintetica local" --cleanup --probe-id probe-UUID
```

En el canary dedicado se usa exactamente el mismo procedimiento con `--project pie-diabetico-canary-2026` y bucket `pie-diabetico-canary-2026.firebasestorage.app` o `.appspot.com` tras verificar cuál existe. Esa operación remota requiere aprobación operativa, ventana, principal ADC y ticket reales; este cambio **no** la ejecutó ni la autoriza. No usar pacientes ni rutas clínicas.

## Verificación y límites

`node --test scripts/admin-operation-audit.test.cjs` aprobó cinco pruebas, incluidos el rechazo de Storage sin emulador o con host no local y el rechazo de un `requestId` personalizado que no sea UUID. `npx firebase emulators:exec --project demo-pie-diabetico --only firestore,storage "node scripts/admin-recovery-emulator.test.cjs"` aprobó: dry-run sin escrituras, recuperación con UUID explícito y siete eventos, limpieza con otro UUID y dos eventos más, ausencia final del centinela, más bootstrap local con un evento; **10 eventos** en total. Los registros de emulador son evidencia local, no prueba de IAM, Cloud Audit ni persistencia remota.

**Controles externos pendientes:** altas/limpiezas de cuentas Auth y fixtures ad hoc no canalizadas por estos scripts, cambios por consola o CLI, despliegues y reversión de Hosting/Cloud Run, aprobación e identidad del operador, conciliación de eventos `started`, exportación inmutable, permisos de acceso y política de retención R0. `adminOperationLogs` es persistente en Firestore pero modificable por cualquier principal con Admin SDK e IAM suficientes; no equivale a un log inmutable. No se fija TTL ni plazo de conservación antes de R0. T6 sigue **NO-GO** para datos reales y producción; no se inicia la observación prospectiva de 24–48 horas.
