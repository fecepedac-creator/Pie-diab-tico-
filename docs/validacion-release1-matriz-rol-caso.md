# Matriz de validación real — Release 1 (piloto)

Objetivo: validar con escenarios de uso realista por rol y cerrar R2.

## Criterio general
- Cada caso debe finalizar en PASS para habilitar “go-live piloto” si no hay bloqueantes.
- Cada FAIL debe tener evidencia, causa y dueño de corrección.

## Convención
- **Resultado**: `PASS`, `FAIL`, `N/A`, `PENDIENTE`.
- **Severidad**: `BLOQUEANTE`, `ALTA`, `MEDIA`, `BAJA`.
- **Riesgo**: `ALTO`, `MEDIO`, `BAJO`.
- **Tipo de validación**:
  - `A`: automatizada (emulador/CI)
  - `M`: manual (dispositivo real y usuario clínico)

## Evidencia automatizada base (prelanzamiento)

- `functions/emulator-smoke.js`: **61 checks PASS** (incluye validación de ausencia e invalidez de token de sesión, permisos por rol/centro, derivaciones, conflictos y cierre).
- `functions/clinical-emulator-checks.js` y `functions/admin-emulator-checks.js`: **ejecución completa sin fallos**.
- Última corrida automatizada registrada: `2026-09-12`.
- Comando de referencia:

```powershell
$env:PD_TEST_API_PORT='5001'
$env:PD_TEST_AUTH_PORT='9099'
npx firebase-tools emulators:exec --only auth,functions,firestore,storage --project demo-pie-diabetico "node functions/emulator-smoke.js"
```

## Escenarios obligatorios

| ID | Rol | Tipo | Caso | Datos de prueba | Resultado esperado | Severidad | Estado | Evidencia |
|---|---|---|---|---|---|---|---|---|
| V01 | TENS | A | Ingreso preingreso + foto de paciente | Alta paciente con RUT y nombre + anexar foto de perfil | Paciente en estado esperado y foto con URL temporal | BLOQUEANTE | PASS | `functions/emulator-smoke.js` |
| V02 | TENS / Enfermería | A | Derivar a especialista | Crear episodio y tarea con rol destinatario correcto | Tarea visible para receptor correcto + snapshot clínico | ALTA | PASS | `functions/emulator-smoke.js` |
| V03 | Enfermería | A | Registro de atención enfermera sin exceder alcance médico | Completar limpieza, vendajes, descarga + estado correcto | Guardado por sección con confirmación y sin edición fuera de alcance | BLOQUEANTE | PASS | `functions/emulator-smoke.js` + `functions/clinical-emulator-checks.js` |
| V04 | Médico | A | Evaluación médica + WIfI + cierre inicial | Completar wound/WIfI/verificación; requerimientos de cierre respetados | Cierre permitido solo si sección médica/enfermería están completas según reglas | BLOQUEANTE | PASS | `functions/emulator-smoke.js` |
| V05 | Especialista CV / CX / CXV / Fisiatra | A | Acceso a caso derivado | Solo visualizar casos asignados y actualizar respuesta de tarea si corresponde | Rechazo de casos no asignados; bloqueo por alcance | BLOQUEANTE | PASS | `functions/emulator-smoke.js` |
| V06 | Trabajo social | M | Registro social del caso y retorno de canal | Completar antecedente social y observaciones | Persistencia y visibilidad clínica en el marco permitido | ALTA | PENDIENTE | Requiere corrida manual en entorno real/simulador con actor social |
| V07 | Coordinación / admin centro | A | Actualización de tareas y estado de pendientes | Reasignar/confirmar estado de tareas | No edición de campos clínicos reservados | MEDIA | PASS | `functions/admin-emulator-checks.js` |
| V08 | Auditor / Control | A | Revisión de bitácora | Registrar alta/edición/cierre/derivación/foto | Eventos con actor, centro, recurso y hora; orden cronológico | ALTA | PASS | `functions/emulator-smoke.js` + `functions/admin-emulator-checks.js` |
| V09 | TENS + Enfermería + Médico | A | Control concurrente | Dos usuarios editando misma atención | Guardado con versionado y conflicto esperado | BLOQUEANTE | PASS | `functions/clinical-emulator-checks.js` + `functions/emulator-smoke.js` |
| V10 | Médico | M | Cierre y resumen clínico | Cerrar atención y generar vista resumen | Resumen refleje fotos, estado, derivaciones y responsables | BLOQUEANTE | PENDIENTE | Requiere sesión de comité con cierre real |
| V11 | Móvil (todos) | M | Flujo sin teclado y captura de foto en campo | Tareas principales desde pantalla angosta | Sin pantallas “bloqueadas”, botones y estado visibles | ALTA | PENDIENTE | Requiere corrida en 2 sesiones por rol en móvil |
| V12 | Resiliencia de errores | A | Error de permisos y token vencido | Intento de acceso no autorizado / token inválido | Mensaje claro, no datos filtrados, no estado ambiguo | BLOQUEANTE | PASS | `functions/emulator-smoke.js` |

## Estado de bloqueos críticos hoy

- Bloqueos críticos pendientes: **V06 (social), V10 (cierre/resumen), V11 (UX móvil)**.
- Bloqueo de API backend técnica: **Ninguno en el estado actual de emuladores**.

### Referencia de protocolo operativo

- Plan recomendado para sesiones móviles y aprobación por rol: [docs/manual-validacion-movil-release1.md](/C:/Users/fecep/Proyectos/01_salud_clinica/pie-diabetico/docs/manual-validacion-movil-release1.md).

## Evidencia de ejecución manual y checklist operativo

- Responsable de la ejecución (fecha): _______________________
- Entorno: [ ] emulador [ ] staging [ ] local [ ] móvil real
- Rol(es) ejecutados: ___________________________________
- Tokens clínicos/versionado conflictivo revisado: [ ] sí [ ] no
- Observaciones de seguridad en errores: [ ] sí [ ] no
- Hallazgos críticos: [ ] sí [ ] no (detalle: _____________________)

## Checklist de aprobación por sesión

- Fecha: __ / __ / ____
- Rol bajo prueba: _____________________
- Dispositivo: [ ] desktop [ ] móvil
- Sesión completa: [ ] Sí [ ] No
- Hallazgos: ____________________________________________________________________
- Bloqueantes: __________________________________________________________________
- Firma responsable de QA: ______________________
