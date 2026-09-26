# Resultado — nueva atención en un episodio existente

Fecha: 24/09/2026. Candidato local: `codex/r1-candidate-20260924`. Alcance: TENS inicia el registro fotográfico y medicina una atención clínica dentro del mismo episodio ficticio, sin datos clínicos reales ni despliegue.

## Entorno y reproducción

La URL `clinical-preview.html` usa `demoMode`: muestra el botón **Iniciar registro fotográfico**, pero lo deshabilita y no guarda. Se reprodujo en navegador con el perfil TENS y se conservó [captura previa](evidence/new-attention-before.png). El candidato principal y los emuladores `demo-pie-diabetico` estaban aislados del checkout original y de producción.

| Hallazgo | Causa | Corrección | Aceptación y evidencia |
|---|---|---|---|
| N01 · Alta: no se podía probar la creación desde la maqueta | La demostración visual bloquea las escrituras | Acceso local exclusivo para desarrollo y datos sintéticos en Auth, Firestore, Functions y Storage emulados | TENS inició un registro nuevo y abrió Fotos; medicina creó una nueva atención en el mismo episodio. Tras recargar, el registro TENS seguía en la lista. |
| N02 · Media: atenciones del mismo día tenían el mismo rótulo | La lista mostraba sólo la fecha | Mostrar fecha y hora | Dos registros del 24/09 se distinguen en la [captura posterior](evidence/new-attention-after.png). |

## Verificación y límites

- Se navegaron los perfiles TENS y medicina en la aplicación autenticada local; el botón correspondiente estaba habilitado y abrió el registro nuevo. TENS sólo mostró la pestaña Fotos; medicina abrió la atención compartida.
- La recarga conservó el registro nuevo dentro del mismo episodio. La vista a 390 px mantuvo accesible el botón **Nueva atención** sin desbordamiento horizontal; se restituyó el tamaño de navegador.
- En esta revisión se abrió el formulario TENS de fotografías; la carga de un archivo desde ese formulario queda para la prueba manual. La API de carga sí está incluida en la regresión sintética del candidato.
- El selector de foto declara `capture="environment"`, que solicita la cámara trasera del móvil. El navegador decide si abre la cámara directamente o presenta opciones de captura y archivos. Aún no se ha comprobado el comportamiento ni el guardado de una foto en un teléfono físico. `127.0.0.1` sólo apunta al equipo donde se abre, por lo que esta URL local no sirve desde el teléfono.
- La compilación de producción excluyó el acceso y la contraseña sintética de desarrollo. `npm run validate` aprobó tipado, pruebas unitarias, compilación y sintaxis. Los permisos negativos del servidor ya estaban cubiertos por la corrida sintética de emuladores del candidato.
- El contenido persiste sólo mientras funcionan los emuladores locales. Esta revisión no acredita uso clínico, pruebas con personal real, un entorno remoto ni publicación.

Para reproducir el arranque y el recorrido, consultar [README.md](../README.md). No se inició sesión en servicios externos ni se usaron datos de pacientes reales.
