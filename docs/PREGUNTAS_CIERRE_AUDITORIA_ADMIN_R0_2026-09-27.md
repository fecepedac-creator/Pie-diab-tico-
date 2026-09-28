# Preguntas para cerrar R0 y la auditoría administrativa

Este cuestionario acompaña el [plan de cierre](PLAN_CIERRE_AUDITORIA_ADMIN_R0_2026-09-27.md). Lo responderemos **por rondas**; no hace falta contestarlo entero hoy. Puedes escribir «no sé», «pendiente de TI», «pendiente de clínica», «no aplica» o adjuntar la política/acta que ya exista. No envíes contraseñas, tokens, fichas, fotos ni datos de pacientes. Yo revisaré por mi cuenta el código, la configuración y los registros técnicos que sean accesibles.

**Ya definido:** el canary `pie-diabetico-canary-2026` usa datos ficticios; no hay autorización para pacientes reales ni producción. Para el piloto se propuso que enfermería y medicina vean todos los pacientes **de su propio centro**, sin acceso entre centros. Esa preferencia necesita aprobación clínica y de TI, pero no volveremos a preguntarte qué prefieres.

**Respuestas recibidas hasta ahora, sin identificar al centro:** se propone un piloto inicial de tres meses con dos TENS, tres enfermeras de diabetes, un médico internista y un fisiatra; cirugía general y vascular quedan como posible ampliación posterior. El médico internista también administraría la plataforma. La atención ocurriría en una institución donde trabaja, pero todavía debe solicitar autorización institucional a Dirección Médica, que aún no conoce el proyecto. La ficha electrónica institucional seguirá siendo el registro oficial: cada profesional copiará allí el texto final de su atención; el coordinador médico supervisará el uso de Pie Diabético. No se requiere marcador de «copiado» dentro de esta aplicación. En los hilos «Crear consentimiento informado» y «Revisa consentimiento informado» existe un borrador con cuatro decisiones separadas: fotos de pies/heridas, foto de la persona, intercambio clínico para la atención y uso de datos sin identificadores para posibles publicaciones. Es un texto de conversación para revisión, no un consentimiento institucional aprobado ni un formulario completo implementado en la candidata; la aplicación actual registra sólo la verificación de consentimiento para fotografiar heridas a nivel de episodio. Ninguna de estas respuestas constituye aprobación R0.

**Consentimiento, decisión de alcance del 27/09:** el borrador que se presentará a revisión mantendrá la opción separada de usar datos sin identificadores para posibles publicaciones. Esa elección no incluye publicar imágenes y todavía requiere revisión y aprobación institucional.
**Fotografía de identificación, decisión de alcance del 27/09:** se propone incluirla en el primer piloto, condicionada a una autorización independiente de la fotografía de pies/heridas y a la aprobación institucional.
**Firma del consentimiento, propuesta del 27/09:** durante el piloto se recogería en papel y se conservaría en la ficha clínica oficial; la institución debe aprobar el texto, la custodia y cómo se reflejan las decisiones separadas en Pie Diabético.
**Retiro del permiso fotográfico, respuesta del 27/09:** queda pendiente de revisión institucional quién decide el tratamiento de imágenes ya guardadas; no se presume autorización para borrarlas ni una política de conservación.
**Alcance clínico del piloto, propuesta del 27/09:** desde el inicio se usarían atención y fotografías, derivaciones y comité clínico durante los tres meses propuestos; su habilitación con pacientes reales sigue condicionada a autorización y validación institucional.
**Pausa del piloto, propuesta del 27/09:** ante un problema grave, el coordinador médico o Dirección Médica podrían pausar el uso de inmediato y avisar al otro. La institución debe ratificar esta facultad, los criterios de pausa y el canal de aviso antes de comenzar.
**Cambios habituales de acceso, preferencia del 27/09:** las altas, bajas y cambios de permisos se harían mediante la administración de Pie Diabético; el acceso directo al sistema de cuentas/datos se reservaría para emergencias documentadas. TI/seguridad debe ratificar el procedimiento y comprobar que la interfaz cubre los cambios necesarios.
**Gestión local de accesos, decisión operativa del 27/09:** el médico del policlínico tendrá funciones de administrador y de atención clínica. Como administrador decidirá localmente el alta de profesionales y los cambios de función/rol, sin solicitar aprobación institucional para cada cambio. Queda por definir cómo se documenta cada operación. Esta decisión sobre cambios cotidianos no sustituye la autorización institucional inicial del piloto ni las revisiones R0 pendientes.
**Motivo de cambios de acceso, decisión del 27/09:** la plataforma deberá pedir y registrar una razón breve en toda alta o baja de cuenta y en todo cambio de permisos, junto con actor, momento, cambio y resultado. El motivo no debe incluir datos de pacientes.
**Revisión de cambios de acceso, propuesta del 27/09:** el propio coordinador médico y administrador revisaría el historial sólo cuando surja un problema, sin revisión periódica. TI/seguridad y la institución deben evaluar la falta de control preventivo, cómo se detectarán incidentes y si esta revisión por el mismo actor que ejecuta cambios requiere un segundo revisor.
**Detección y aviso, preferencia del 27/09:** combinar avisos automáticos con reportes del equipo ante accesos o cambios sospechosos. El administrador médico ya conoce los cambios de permisos que él mismo ejecuta; los avisos deben centrarse en actividad inesperada, acciones de otros actores o fallos de seguridad, sin generar una alerta redundante por cada cambio propio. Definir eventos y canal con TI/seguridad.
**Conservación, aclaración del 27/09:** el usuario señala el mínimo chileno de 15 años para la ficha clínica. Verificado en el [artículo 13 de la Ley 20.584](https://www.bcn.cl/leychile/Navegar?idNorma=1039348) y el [artículo 11 del Decreto 41](https://www.bcn.cl/leychile/Navegar?idNorma=1046753), que cuenta desde el último ingreso de información. No se ha presentado aún una política institucional específica para copias clínicas de Pie Diabético, fotografías, registros de acceso y cambios, ni respaldos; sus plazos y tratamiento requieren revisión por categoría.
**Política institucional, respuesta del 27/09:** el usuario no sabe todavía si existe un documento que regule la conservación de copias y fotografías fuera de la ficha oficial. Solicitar esta información a TI, al custodio de la ficha y a privacidad durante R0; no atribuirles una decisión ni fijar plazos por inferencia.

Tus respuestas permiten preparar decisiones y pruebas; **no equivalen a las seis aprobaciones institucionales** del [acta R0](closure-alcance-release1.md). Si una respuesta corresponde a otra autoridad, basta con indicar quién debe decidir.

## Ronda 1 — centro, alcance y responsables

Estas respuestas fijan quién tomará las decisiones y para qué piloto. Son las primeras que necesitamos.

1. **Centro piloto.** ¿Qué institución y centro participarán? La propuesta actual es empezar con **un centro**. ¿Se mantiene? Si aún no está elegido, responde «pendiente».
2. **Tamaño y tiempo.** Aproximadamente, ¿cuántos profesionales participarán y cuánto durará el piloto inicial? No necesitamos número ni identidad de pacientes.
3. **Personas que decidirán.** ¿Quién puede representar a cada una de estas seis funciones: responsable clínico, enfermería referente, operación clínica, TI/seguridad, privacidad/jurídico y sponsor o custodio de la ficha institucional? Puedes dar nombre y cargo, sólo el cargo o «por designar». Una persona puede ocupar varias funciones si la institución lo acepta.
4. **Documento de aprobación.** ¿Cómo suele dejar constancia la institución de una decisión: acta, firma electrónica, documento firmado u otro medio? ¿Quién conserva ese documento? No pido que firmes ahora.

## Ronda 2 — forma de trabajo clínico

Sirve para cerrar el alcance y los casos en que la plataforma debe detenerse.

5. **Ficha oficial.** Respondida: seguirá siendo el registro formal. Cada profesional copiará el texto final de su atención. No se añadirá una constancia dentro de Pie Diabético; falta aprobación del procedimiento por la institución.
6. **Fotografías.** ¿Existe un texto de consentimiento aprobado para fotos de pies? ¿Y uno distinto para la foto de identificación? Si alguien retira el permiso, ¿quién debe decidir qué pasa con las fotos ya guardadas?
7. **Funciones del primer piloto.** ¿Hay alguna función incluida en el [alcance propuesto](closure-alcance-release1.md) que prefieras dejar para una etapa posterior? Si no estás seguro, podemos revisar el listado juntos.
8. **Cuándo detener el piloto.** ¿Qué situaciones deberían obligar a pausarlo? Por ejemplo: acceso indebido, pérdida de información o error clínico grave. ¿Quién toma esa decisión y a quién se avisa?

## Ronda 3 — cambios administrativos y auditoría

Sirve para decidir qué cambios con privilegios se permiten y cómo se demuestra quién los hizo.

9. **Responsables de cambios.** ¿Qué cargo puede crear o desactivar cuentas, cambiar roles, modificar centros y operar Firebase/Google Cloud? No compartas usuarios ni credenciales; basta con cargos o equipos.
10. **Cambios directos.** Durante el piloto, ¿la institución permitiría editar Auth, Firestore o Storage directamente desde consola/CLI, o sólo mediante procedimientos controlados? Una opción es reservar el acceso directo para emergencias documentadas. TI debe ratificarla.
11. **Constancia de cambios.** Dado que el administrador local decide altas y roles sin aprobación institucional por cada operación, ¿qué registro mostrará quién hizo el cambio, cuándo, por qué y cuál fue el resultado? ¿Qué se hace ante una urgencia fuera de horario?
12. **Revisión de registros.** ¿Quién puede consultar los registros de auditoría y quién investiga un acceso o cambio sospechoso? ¿Debe recibir avisos automáticos alguien más?

## Ronda 4 — conservación, seguridad y recuperación

Las cifras finales y su fundamento los deben decidir TI, operación y privacidad/jurídico. No hace falta inventarlas en tu respuesta.

13. **Política existente.** ¿La institución ya tiene reglas escritas sobre cuánto conservar la ficha, fotos, registros de acceso, operaciones administrativas y respaldos? Si existen, indica dónde están o adjunta una copia autorizada; si no, ¿quién las definirá?
14. **Copia protegida de la auditoría.** ¿TI tiene un lugar aprobado para conservar registros fuera de la aplicación y controlar quién puede leerlos o borrarlos? Si no lo sabes, responde «pendiente de TI».
15. **Segundo factor.** ¿Existe una política de segunda verificación para iniciar sesión (MFA)? ¿Quién decidirá qué perfiles deben usarla y cómo se manejarán las excepciones?
16. **Caída y pérdida de datos.** En palabras simples: si el sistema falla, ¿cuánto tiempo podría estar detenido como máximo y cuánta información reciente sería tolerable perder? TI convertirá esas respuestas en objetivos de recuperación (RTO/RPO). «Pendiente de TI y clínica» es una respuesta válida.
17. **Soporte.** ¿Quién recibe avisos de fallos o accesos indebidos, en qué horario y quién reemplaza a esa persona si no está disponible?

## Ronda 5 — cierre formal

Esta ronda se responde cuando el expediente y las pruebas estén listos.

18. Para cada una de las **seis funciones** de la ronda 1: ¿aprueba, aprueba con condiciones o rechaza el alcance y la versión presentada? Registrar condición, fecha y referencia de acta/firma. Una respuesta de esta conversación no sustituye ese registro institucional.
19. Si alguien pone una condición, ¿quién comprueba que se resolvió y cómo se registra su aceptación antes de considerar cerrado R0?

## Cómo responder ahora

Empecemos por **1–4**. Responde con los números; una frase por punto basta. Después prepararé la siguiente ronda sólo con las preguntas que sigan abiertas, sin repetirte decisiones conocidas. Si el piloto puede comenzar después del 1 de diciembre de 2026, privacidad/jurídico deberá revisar también la vigencia y transición de la [Ley 21.719](https://www.bcn.cl/leychile/Navegar?idNorma=1209272) junto con las demás normas y políticas aplicables.
