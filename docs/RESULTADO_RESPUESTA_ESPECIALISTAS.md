# Respuesta de especialidades derivadas

Fecha: 24/09/2026. Revisión local con paciente y gestiones ficticias; sin despliegue.

## Recorrido

La derivación aparece en **Casos derivados** del perfil destinatario. Al seleccionar paciente y episodio, **Tu aporte al caso derivado** muestra el motivo y el formulario propio del especialista antes del resumen de antecedentes. El profesional acepta la gestión, registra hallazgos y conducta, guarda un borrador o confirma la respuesta. Esa respuesta se asocia a la gestión y no sobrescribe la evolución del equipo tratante.

`clinical-preview.html` muestra el formulario deshabilitado porque es una maqueta de sólo lectura. La prueba interactiva está en `http://127.0.0.1:5173/` con los botones de Cirugía General, Cirugía Vascular y fisiatra y emuladores activos. `npm run seed:review` conserva los avances existentes y agrega los datos ficticios que falten; `npm run seed:review -- --reset-referrals` reinicia deliberadamente sólo las tres gestiones sintéticas.

## Verificación y límite

- Cirugía General aceptó una gestión, guardó una evaluación ficticia como borrador y la recuperó tras recargar. Después la confirmó; apareció un aviso visible de cierre.
- Cirugía Vascular aceptó y confirmó otra gestión ficticia. El caso salió de su bandeja conforme a la regla de acceso. Medicina vio ambas respuestas, con autor y hora, en la sección ahora llamada **Evolución y respuestas de especialidades**. La pantalla etiqueta los borradores como **sin confirmar** y las respuestas resueltas como **confirmadas**.
- Fisiatría ingresó en la prueba local, vio únicamente el caso derivado a su perfil y abrió **Evaluación de Fisiatría** con una gestión pendiente. La aceptación y el guardado de este tercer perfil todavía no se recorrieron en navegador; usan el formulario compartido de especialidades.
- `npm run validate` aprobó tipado, 14 pruebas unitarias, compilación y revisión sintáctica. El acceso sintético queda restringido al desarrollo con proyecto demo.
- La respuesta actual es texto libre. No hay formulario estructurado distinto para cada especialidad ni firma en la ficha clínica institucional; esos requisitos requieren definición y validación clínica antes de un piloto.
