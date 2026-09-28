# Resultado: asignación social operativa

**Alcance:** flujo local de coordinación y trabajo social con datos ficticios en `demo-pie-diabetico`. Rama integrada `codex/r1-production-readiness`; interfaz del hilo `765ecb6` integrada en `23e4e24`, soporte servidor y prueba en `be5a6de`. El checkout principal no se modificó.

| Puerta | Resultado y evidencia |
| --- | --- |
| Entorno | Emuladores de Auth, Functions, Firestore y Storage; centro, paciente y episodio ficticios de `npm run seed:review`; interfaz local en `127.0.0.1:5173`. |
| Reproducción | Antes de `be5a6de`, faltaban `/social-members` y `version` en la proyección operativa; la interfaz no podía asignar ni responder. |
| Corrección | Listado de integrantes sociales activos limitado al centro y a coordinación/enfermería/medicina; versión en tarea operativa; nombre genérico claro para coordinación, sin abrir texto clínico. |
| Verificación técnica | `npm run validate`: 15/15 pruebas, tipado, compilación y sintaxis. `npm run test:emulators`: 61 controles base, siete escenarios de candidata y 26 eventos de auditoría. Se probaron listado permitido, denegación a social/TENS/otro centro y versión recibida por persona asignada. |
| Segunda navegación | Coordinación creó y asignó una gestión; otra persona social no vio el caso; la asignada aceptó, guardó respuesta, recargó y observó persistencia, cerró y el caso desapareció de sus derivados. Coordinación vio después «Gestión social · Cerrada» y el responsable. |

**Límite:** esta revisión cubre escritorio local y datos sintéticos. No acredita V06/V10/V11 con usuarios autorizados ni dispositivos reales, ni aptitud clínica o despliegue. R0, canary y recuperación continúan pendientes; estado **NO-GO**.
