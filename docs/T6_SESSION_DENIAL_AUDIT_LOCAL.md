# T6 — señal de sesión y rechazos de la API (candidata local)

**Base:** `4d95589` de `codex/r1-production-readiness`. **Rama de trabajo:** `codex/t6-session-denial-audit`. Esta unidad no se ha desplegado ni cotejado contra el canary remoto.

## Contrato implementado

La API emite un evento estructurado `security_event` al preparar una respuesta satisfactoria de `GET /session` (`session.validated`, HTTP 200) y al responder 401 o 403 (`access.denied`). `session.validated` acredita que la API verificó el token y preparó la respuesta de sesión; **no acredita el momento ni el método de inicio de sesión en Firebase**. La respuesta incluye `X-Request-Id`; en errores, el mismo identificador aparece también en el cuerpo. El servidor genera siempre un UUID propio y descarta cualquier `X-Request-Id` enviado por el cliente.

Campos de cada evento: `event`, `requestId`, `status`, `actorUid` (UID sólo después de `verifyIdToken`; en 401 es `null`), `centerId` (sólo tras verificar membresía en esa ruta; `null` en sesión, plataforma y rechazos de membresía), `method`, `route` (familia fija, sin IDs) y `reason` (código de lista cerrada). Los códigos incluyen `missing_token`, `invalid_token`, `unverified_email`, `center_inactive`, `membership_inactive`, `membership_identity_mismatch`, `insufficient_role` y `authorization_denied` para otros 403. El evento no copia token, correo, URL cruda, cuerpo, mensaje de excepción ni identificadores clínicos. Se eliminó también la URL cruda y el mensaje del registro genérico de errores.

Los eventos de seguridad se envían mediante el logger estructurado de Functions/Cloud Logging. **No se escriben rechazos ni sesiones en `centers/{centerId}/auditLogs`**: un 401 no tiene centro comprobado y un 403 de membresía tampoco. Un 403 posterior a la verificación de membresía sí puede llevar `centerId` en Cloud Logging, incluso si falla un permiso de rol o un acceso clínico concreto. Los eventos no son transaccionales con Firestore; la emisión local no garantiza por sí sola entrega, retención ni lectura independiente en el entorno remoto.

## Persistencia y decisión pendiente

La auditoría T6 observó 30 días en el bucket `_Default` de Cloud Logging al 27/09/2026. La instrumentación enviaría estos eventos a la canalización de Cloud Logging al desplegarse; **no configura retención, sink, TTL ni una colección adicional**. Antes de aprobar producción, R0 debe fijar plazo, responsable, acceso restringido, exportación/preservación, borrado y recuperación de estas señales, y decidir si se requiere un almacén con mayor duración o garantías de entrega. Después habrá que configurar y verificar el destino elegido con una revisión desplegada identificada por SHA, cotejando `requestId` de respuestas y logs. La retención observada no se presenta como decisión institucional.

La auditoría de operaciones directas de Admin SDK y recuperación queda fuera de esta unidad. Tampoco se inicia observación prospectiva de 24–48 horas ni se levanta el NO-GO para datos reales o producción.

## Verificación local

El 27/09/2026, `npm run validate` pasó tipado, **25 pruebas unitarias**, compilación y comprobación sintáctica. Tras un ajuste del esquema, `npm --prefix functions test` volvió a pasar las **25 pruebas**. `npm run test:emulators` pasó con proyecto `demo-pie-diabetico`, **61 comprobaciones base** y escenarios sintéticos; no se usó el canary remoto. Las pruebas cubren el esquema sin datos sensibles y rutas con token ausente, inválido y correo no verificado; 403 por membresía ajena, rol y documento de membresía con centro incoherente; `requestId` en cabecera/cuerpo; y ausencia de escritura de un rechazo en la bitácora del centro ajeno.

Se revisó la salida estructurada del emulador: **50 eventos** (`1` sesión validada, `5` respuestas 401 y `44` respuestas 403), cada uno con `requestId` distinto. Todos los 401 tenían actor nulo; los 403 por falta de membresía y la sesión tenían centro nulo; ninguno de los eventos tenía campos de correo, token, cuerpo, URL cruda ni IDs clínicos. La ejecución usó Node 24 local; la función declara Node 22, por lo que esta evidencia no reemplaza CI en Node 22 si se publica un PR. La entrega y retención reales de Cloud Logging siguen sin comprobarse.
