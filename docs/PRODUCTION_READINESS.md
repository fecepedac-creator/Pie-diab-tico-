# Pie Diabético — preparación para producción

Estado: **EN CURSO / NO-GO**. Actualizado: 25/09/2026, después de revisar T1–T4.

## Versión y alcance

- Base técnica: candidata local `codex/r1-candidate-20260924` en `011db37`. El checkout `main` tiene cambios sin confirmar y no se usa como candidata de despliegue.
- Meta: una versión identificable que supere revisión técnica, canary con datos sintéticos, validación clínica y móvil, recuperación y decisión de salida. Estar listo para producción no equivale a desplegar ni a autorizar pacientes reales.
- Decisión del usuario para el piloto: enfermería y medicina pueden consultar todos los pacientes **de su centro**. La matriz y el tratamiento de datos aún requieren aprobación clínica/TI.

## Unidades y dependencias

| ID | Resultado verificable | Entrada | Salida exigida | Estado |
| --- | --- | --- | --- | --- |
| T1 | Candidata sin bloqueantes de autorización e integridad | `011db37` | `eaac9c7`: acceso social asignado, pruebas negativas entre centros y cierre de caso; pendiente selector de responsable en interfaz | Completada para integración |
| T2 | Paquete R0 aprobable | `011db37` y decisión de alcance del usuario | `b5c5532`: matriz y decisiones preparadas; seis aprobaciones institucionales, MFA, retención y RTO/RPO siguen pendientes | Documentación completada; aprobación pendiente |
| T3 | Canary diagnosticado y procedimiento revisable | `011db37` | `cad20e1`: `simulador-clinico` elegido, guardas locales y reversión documentados; Cloud Functions API aún deshabilitada | Preparación completada; entorno bloqueado |
| T4 | Dependencias y CI verificadas | `011db37` | `458b163`: auditorías de producción sin alertas, CI ampliada y PR #13 con validación aprobada | Completada para integración |
| T5 | Candidata integrada y congelada | T1, T2 técnico, T3, T4 | Un solo commit candidato, validación completa y manifiesto de artefactos; sin conflictos ni cambios ajenos | En integración |
| T6 | Canary funcional y recuperable | T5 y entorno T3 | API, reglas, Hosting y configuración coherentes; pruebas sintéticas, salud, rollback y observación documentados | Pendiente |
| T7 | Validación clínica y móvil | T2 aprobado y T6 | V06, V10 y V11 con usuarios autorizados, dispositivos reales y evidencia; ningún bloqueo alto | Pendiente |
| T8 | Auditoría final independiente | T5–T7 | Repetir arquitectura, permisos, privacidad, integridad, UX, pruebas, operación y versión desplegada; dictamen GO/NO-GO con evidencia y límites | Pendiente |

## Puerta de salida

Sólo se recomienda producción si T8 confirma simultáneamente: alcance y matriz R0 aprobados por responsables, cero P0 y ningún P1 incompatible con el piloto, aislamiento multicentro y controles de acceso probados, V06/V10/V11 aprobados, MFA decidido, recuperación y reversión demostradas, canary observado sin incidentes graves y aprobación clínica/TI/operativa para el commit exacto. Toda evidencia anterior a ese commit se trata como histórica.

## Informe de cada hilo

Cada tarea entrega: resultado, commit o versión exacta, pruebas y evidencia, pendientes/bloqueos, estado actualizado y condición para iniciar la siguiente unidad. El coordinador revisa ese informe y el cambio real antes de integrar; si falla un criterio, devuelve una corrección acotada al mismo hilo. No se despliega producción ni se ingresan datos reales durante esta preparación.
