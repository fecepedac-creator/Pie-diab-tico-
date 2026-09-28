# Preguntas para cerrar R0 y la auditoría administrativa

Este cuestionario acompaña el [plan de cierre](PLAN_CIERRE_AUDITORIA_ADMIN_R0_2026-09-27.md). Lo responderemos **por rondas**; no hace falta contestarlo entero hoy. Puedes escribir «no sé», «pendiente de TI», «pendiente de clínica», «no aplica» o adjuntar la política/acta que ya exista. No envíes contraseñas, tokens, fichas, fotos ni datos de pacientes. Yo revisaré por mi cuenta el código, la configuración y los registros técnicos que sean accesibles.

**Ya definido:** el canary `pie-diabetico-canary-2026` usa datos ficticios; no hay autorización para pacientes reales ni producción. Para el piloto se propuso que enfermería y medicina vean todos los pacientes **de su propio centro**, sin acceso entre centros. Esa preferencia necesita aprobación clínica y de TI, pero no volveremos a preguntarte qué prefieres.

Tus respuestas permiten preparar decisiones y pruebas; **no equivalen a las seis aprobaciones institucionales** del [acta R0](closure-alcance-release1.md). Si una respuesta corresponde a otra autoridad, basta con indicar quién debe decidir.

## Ronda 1 — centro, alcance y responsables

Estas respuestas fijan quién tomará las decisiones y para qué piloto. Son las primeras que necesitamos.

1. **Centro piloto.** ¿Qué institución y centro participarán? La propuesta actual es empezar con **un centro**. ¿Se mantiene? Si aún no está elegido, responde «pendiente».
2. **Tamaño y tiempo.** Aproximadamente, ¿cuántos profesionales participarán y cuánto durará el piloto inicial? No necesitamos número ni identidad de pacientes.
3. **Personas que decidirán.** ¿Quién puede representar a cada una de estas seis funciones: responsable clínico, enfermería referente, operación clínica, TI/seguridad, privacidad/jurídico y sponsor o custodio de la ficha institucional? Puedes dar nombre y cargo, sólo el cargo o «por designar». Una persona puede ocupar varias funciones si la institución lo acepta.
4. **Documento de aprobación.** ¿Cómo suele dejar constancia la institución de una decisión: acta, firma electrónica, documento firmado u otro medio? ¿Quién conserva ese documento? No pido que firmes ahora.

## Ronda 2 — forma de trabajo clínico

Sirve para cerrar el alcance y los casos en que la plataforma debe detenerse.

5. **Ficha oficial.** La propuesta dice que la ficha clínica institucional seguirá siendo el registro formal. ¿Es correcto? ¿Qué cargo copiará o verificará lo registrado en Pie Diabético y cómo dejará constancia de que llegó a la ficha oficial?
6. **Fotografías.** ¿Existe un texto de consentimiento aprobado para fotos de pies? ¿Y uno distinto para la foto de identificación? Si alguien retira el permiso, ¿quién debe decidir qué pasa con las fotos ya guardadas?
7. **Funciones del primer piloto.** ¿Hay alguna función incluida en el [alcance propuesto](closure-alcance-release1.md) que prefieras dejar para una etapa posterior? Si no estás seguro, podemos revisar el listado juntos.
8. **Cuándo detener el piloto.** ¿Qué situaciones deberían obligar a pausarlo? Por ejemplo: acceso indebido, pérdida de información o error clínico grave. ¿Quién toma esa decisión y a quién se avisa?

## Ronda 3 — cambios administrativos y auditoría

Sirve para decidir qué cambios con privilegios se permiten y cómo se demuestra quién los hizo.

9. **Responsables de cambios.** ¿Qué cargo puede crear o desactivar cuentas, cambiar roles, modificar centros y operar Firebase/Google Cloud? No compartas usuarios ni credenciales; basta con cargos o equipos.
10. **Cambios directos.** Durante el piloto, ¿la institución permitiría editar Auth, Firestore o Storage directamente desde consola/CLI, o sólo mediante procedimientos controlados? Una opción es reservar el acceso directo para emergencias documentadas. TI debe ratificarla.
11. **Autorización previa.** ¿Usan tickets, actas u otro registro para solicitar y aprobar cambios administrativos? ¿Quién los aprueba y qué se hace ante una urgencia fuera de horario?
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
