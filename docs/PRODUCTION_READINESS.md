# Pie Diabético — preparación para producción

Estado: **EN CURSO / NO-GO para pacientes reales**. Actualizado: 26/09/2026. El protocolo vigente para publicar con acceso restringido y datos sintéticos está en [PLAN_PUBLICACION_RESTRINGIDA_2026-09-26.md](PLAN_PUBLICACION_RESTRINGIDA_2026-09-26.md).

## Versión y alcance

- Base técnica integrada: `codex/r1-production-readiness` en `21560b4`. El checkout `main` tiene cambios posteriores sin confirmar que aún deben compararse e integrarse antes de afirmar que la publicación contiene «todos los cambios locales».
- Meta inmediata: publicar la versión exacta en `simulador-clinico` para validación por invitación con datos sintéticos. La publicación y la autorización de pacientes reales tienen estados y pruebas distintos.
- Decisión del usuario para el piloto: enfermería y medicina pueden consultar todos los pacientes **de su centro**. La matriz y el tratamiento de datos aún requieren aprobación clínica/TI.

## Unidades y dependencias

| ID | Resultado verificable | Entrada | Salida exigida | Estado |
| --- | --- | --- | --- | --- |
| T1 | Candidata sin bloqueantes de autorización e integridad | `011db37` | `eaac9c7`: acceso social asignado, pruebas negativas entre centros y cierre de caso; selector operativo integrado en `23e4e24` + `be5a6de` | Integrada y verificada localmente |
| T2 | Paquete R0 aprobable | `011db37` y decisión de alcance del usuario | `b5c5532`: matriz y decisiones preparadas; seis aprobaciones institucionales, MFA, retención y RTO/RPO siguen pendientes | Documentación completada; aprobación pendiente |
| T3 | Canary diagnosticado y procedimiento revisable | `011db37` | `cad20e1`: `simulador-clinico` elegido, guardas locales y reversión documentados; Cloud Functions API aún deshabilitada | Preparación completada; entorno bloqueado |
| T4 | Dependencias y CI verificadas | `011db37` | `458b163`: auditorías de producción sin alertas, CI ampliada y PR #13 con validación aprobada | Completada para integración |
| T5 | Candidata integrada y congelada | T1, T2 técnico, T3, T4 | Un solo commit candidato, validación completa y manifiesto de artefactos; sin conflictos ni cambios ajenos | Congelada; PR borrador #14 y CI de `233d160` aprobada en Node 22; sin autorización de fusión ni despliegue |
| T6 | Canary funcional y recuperable | T5 y entorno T3 | API, reglas, Hosting y configuración coherentes; pruebas sintéticas, salud, rollback y observación documentados | Pendiente |
| T7 | Validación clínica y móvil | T2 aprobado y T6 | V06, V10 y V11 con usuarios autorizados, dispositivos reales y evidencia; ningún bloqueo alto | Pendiente |
| T8 | Auditoría final independiente | T5–T7 | Repetir arquitectura, permisos, privacidad, integridad, UX, pruebas, operación y versión desplegada; dictamen GO/NO-GO con evidencia y límites | Pendiente |

## Puertas de salida

La publicación restringida de canary puede hacerse **antes de la revisión jurídica**, sólo con el proyecto aislado, datos sintéticos, versión exacta, servicios habilitados, acceso por invitación, pruebas locales y plan de reversión del [protocolo vigente](PLAN_PUBLICACION_RESTRINGIDA_2026-09-26.md). V06/V10/V11, respaldo y restauración remotos, MFA y aprobación clínica/TI cierran el estado `DESPLEGADA_RESTRINGIDA`; no se declaran completos por el solo hecho de publicar Hosting. La observación de 24–48 h se inicia tras el despliegue y continúa como control operativo.

Sólo se recomienda el **piloto con pacientes reales** si T8 confirma simultáneamente: alcance y matriz R0 aprobados por responsables, cero P0 y ningún P1 incompatible con el piloto, aislamiento multicentro y controles de acceso probados, V06/V10/V11 aprobados, MFA decidido, recuperación y reversión demostradas, canary observado sin incidentes graves y aprobación clínica/TI/operativa **y jurídica/de privacidad** para el commit exacto. Toda evidencia anterior a ese commit se trata como histórica.

## Informe de cada hilo

Cada tarea entrega: resultado, commit o versión exacta, pruebas y evidencia, pendientes/bloqueos, estado actualizado y condición para iniciar la siguiente unidad. El coordinador revisa ese informe y el cambio real antes de integrar; si falla un criterio, devuelve una corrección acotada al mismo hilo. Se permite el canary restringido descrito arriba; no se publica el candidato en el dominio principal ni se ingresan datos reales durante esta preparación.
