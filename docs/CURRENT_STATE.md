# Estado vigente — Pie Diabético

Actualizado: 25 de septiembre de 2026. Fuente de verdad para esta versión candidata local; los documentos de go-live fechados el 13 de septiembre son evidencia histórica y no acreditan el estado actual de producción.

## Integración de preparación para producción — 25/09/2026

- Rama aislada de coordinación: `codex/r1-production-readiness`; base `011db37`. Se incorporaron los cambios de autorización `eaac9c7`, paquete documental R0 `b5c5532`, preparación canary `cad20e1` y dependencias/CI `458b163`. El checkout principal conserva sus cambios sin confirmar.
- El alcance aprobado por el usuario para el piloto permite a enfermería y medicina consultar pacientes de **su propio centro**; la ratificación clínica y TI/seguridad permanece pendiente. El acceso de trabajo social requiere una asignación individual en servidor. La API ya acepta esa asignación, pero la interfaz aún no ofrece el selector para coordinación, enfermería o medicina; V06 no puede considerarse cerrado.
- `simulador-clinico` no está listo: la Cloud Functions API sigue deshabilitada y aún faltan comprobaciones de Storage, contenido, facturación y recuperación. Ninguna parte de esta candidata se publicó allí ni en producción.
- La auditoría de dependencias de producción en el hilo T4 quedó sin alertas en raíz y Functions; PR #13 registró validación de CI aprobada para esa rama. La combinación integrada pasó `npm run validate` (15 pruebas unitarias), las dos auditorías de producción (0 alertas) y `npm run test:emulators` (`baselineChecks: 61`, siete escenarios de candidata y 26 eventos de auditoría), todo con datos sintéticos. La validación se realizó con Node 24 local; CI de la rama T4 pasó con Node 22, pero aún no ha ejecutado esta combinación exacta.
- R0 sigue sin aprobaciones institucionales, decisión MFA, retención y RTO/RPO. V06/V10/V11 móvil, canary, restauración y rollback operativos siguen pendientes. **NO-GO para datos reales y despliegue productivo.**

## Resultado de paso 1

- Candidato local en la rama `codex/r1-candidate-20260924`, separado del checkout principal con cambios previos. No se publicó ni se transfirió al remoto.
- Preingreso: TENS puede crear un paciente y preparar antecedentes clínicos y sociales como **borrador** sólo para pacientes asignados a su cuenta. Coordinación, enfermería o medicina pueden asignar TENS; enfermería o medicina validan. El guardado parcial conserva datos no modificados y rechaza versiones antiguas.
- Integridad: el RUT se reserva por centro en transacción; se impiden altas concurrentes duplicadas. Las tareas exigen destinatario válido, bloquean duplicados activos para la misma combinación de paciente, episodio, atención, tipo y destinatario, y siguen transiciones de estado con control de versión. Al cerrarse una tarea termina el acceso derivado del especialista o trabajo social.
- Auditoría: las mutaciones principales registran el evento en la misma operación de Firestore. Las cargas eliminan el archivo nuevo si la escritura asociada falla.
- Entorno local: configuración de proyecto demo y emuladores; el desarrollo rechaza una configuración Firebase que no sea demo. CI valida código y ejecuta los emuladores con datos sintéticos.
- Revisión navegable local: `http://127.0.0.1:5173/` ofrece acceso de prueba TENS, enfermería, medicina, Cirugía General, Cirugía Vascular y fisiatra al centro ficticio cuando los emuladores están activos. TENS inicia el registro fotográfico; enfermería o medicina inician una atención clínica; las especialidades responden sus derivaciones en **Casos derivados**. El caso de Fisiatría se navegó hasta su formulario con una gestión propia pendiente. `clinical-preview.html` continúa como maqueta de sólo lectura.
- Fisiatría: según el alcance indicado por el usuario, participa para optimizar descarga y abordar dolor y función cuando se solicite; tras el cierre, para prevención secundaria o evaluación protésica cuando corresponda. Su formulario local ofrece botones para descarga, prevención, prótesis y dolor sin generar conclusiones clínicas; requiere texto profesional para confirmar. El caso ficticio disponible es de descarga activa; falta recorrer un caso cicatrizado y uno protésico.

## Verificación de este candidato

- `npm run validate`: tipado, 14 pruebas unitarias, compilación y revisión sintáctica aprobados el 24/09/2026.
- `npm run test:emulators`: aprobado el 24/09/2026 con 61 comprobaciones base, escenarios nuevos de concurrencia, permisos, preingreso, derivaciones y auditoría; sólo proyecto `demo-pie-diabetico`.
- No se ha ejecutado una validación clínica con personas usuarias, una prueba móvil real ni una comprobación operativa de este candidato en un entorno remoto.
- El 24/09/2026 se reprodujo en navegador el botón deshabilitado de la maqueta y se verificó el flujo local real de nuevo registro fotográfico TENS y nueva atención de medicina con persistencia en emulador. Evidencia y límites: [RESULTADO_NUEVA_ATENCION.md](RESULTADO_NUEVA_ATENCION.md).
- El 24/09/2026 se verificó en navegador el borrador y cierre de respuesta de Cirugía General, el cierre de Cirugía Vascular y la lectura de ambas respuestas por medicina. El formulario se hizo visible al inicio del caso y el cierre muestra confirmación. Medicina y enfermería consultan el aporte en **Evolución y respuestas de especialidades**, con estado de borrador o confirmado; [resultado y límites](RESULTADO_RESPUESTA_ESPECIALISTAS.md).

## Estado de salida

**Apto para continuar revisión local con datos sintéticos. No habilitado para uso clínico piloto ni despliegue.** El estado de producción y canary de este candidato es «no desplegado»; las versiones remotas preexistentes requieren una verificación separada para conocer su estado actual.

Antes de liberar: cerrar responsables y firmas de alcance R0, validar contenido clínico y matriz de permisos, ejecutar V06/V10/V11 por rol en móvil, registrar decisión MFA, verificar restauración y operación del entorno de destino, y probar canary y rollback. La Cloud Functions API del canary figuraba bloqueada en la evidencia del 13/09; debe comprobarse de nuevo antes de usarlo.
