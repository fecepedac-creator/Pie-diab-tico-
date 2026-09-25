# Estado vigente — Pie Diabético

Actualizado: 24 de septiembre de 2026. Fuente de verdad para esta versión candidata local; los documentos de go-live fechados el 13 de septiembre son evidencia histórica y no acreditan el estado actual de producción.

## Resultado de paso 1

- Candidato local en la rama `codex/r1-candidate-20260924`, separado del checkout principal con cambios previos. No se publicó ni se transfirió al remoto.
- Preingreso: TENS puede crear un paciente y preparar antecedentes clínicos y sociales como **borrador** sólo para pacientes asignados a su cuenta. Coordinación, enfermería o medicina pueden asignar TENS; enfermería o medicina validan. El guardado parcial conserva datos no modificados y rechaza versiones antiguas.
- Integridad: el RUT se reserva por centro en transacción; se impiden altas concurrentes duplicadas. Las tareas exigen destinatario válido, bloquean duplicados activos para la misma combinación de paciente, episodio, atención, tipo y destinatario, y siguen transiciones de estado con control de versión. Al cerrarse una tarea termina el acceso derivado del especialista o trabajo social.
- Auditoría: las mutaciones principales registran el evento en la misma operación de Firestore. Las cargas eliminan el archivo nuevo si la escritura asociada falla.
- Entorno local: configuración de proyecto demo y emuladores; el desarrollo rechaza una configuración Firebase que no sea demo. CI valida código y ejecuta los emuladores con datos sintéticos.
- Revisión navegable local: `http://127.0.0.1:5173/` ofrece acceso de prueba TENS, enfermería y medicina al centro ficticio cuando los emuladores están activos. TENS puede iniciar el registro fotográfico en un episodio existente; enfermería o medicina inician una atención clínica. Se comprobó la persistencia del registro tras recargar. `clinical-preview.html` continúa como maqueta de sólo lectura.

## Verificación de este candidato

- `npm run validate`: tipado, 14 pruebas unitarias, compilación y revisión sintáctica aprobados el 24/09/2026.
- `npm run test:emulators`: aprobado el 24/09/2026 con 61 comprobaciones base, escenarios nuevos de concurrencia, permisos, preingreso, derivaciones y auditoría; sólo proyecto `demo-pie-diabetico`.
- No se ha ejecutado una validación clínica con personas usuarias, una prueba móvil real ni una comprobación operativa de este candidato en un entorno remoto.
- El 24/09/2026 se reprodujo en navegador el botón deshabilitado de la maqueta y se verificó el flujo local real de nuevo registro fotográfico TENS y nueva atención de medicina con persistencia en emulador. Evidencia y límites: [RESULTADO_NUEVA_ATENCION.md](RESULTADO_NUEVA_ATENCION.md).

## Estado de salida

**Apto para continuar revisión local con datos sintéticos. No habilitado para uso clínico piloto ni despliegue.** El estado de producción y canary de este candidato es «no desplegado»; las versiones remotas preexistentes requieren una verificación separada para conocer su estado actual.

Antes de liberar: cerrar responsables y firmas de alcance R0, validar contenido clínico y matriz de permisos, ejecutar V06/V10/V11 por rol en móvil, registrar decisión MFA, verificar restauración y operación del entorno de destino, y probar canary y rollback. La Cloud Functions API del canary figuraba bloqueada en la evidencia del 13/09; debe comprobarse de nuevo antes de usarlo.
