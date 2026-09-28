# Preingreso: especificación de UX, permisos y guardado

Fecha: 12 de septiembre de 2026. Estado: propuesta implementable; no aplicada a la aplicación. Base revisada: código local en `f9fa2ed`. Alcance: recepción/coordinación, TENS, enfermería y trabajo social. Se interpreta «socia» como trabajo social (`social_worker`) y recepción como coordinación (`coordinator`), sin crear roles nuevos. Medicina conserva sus capacidades actuales.

Objetivo: completar el preingreso mediante selecciones rápidas, registrar excepciones sin ambigüedad y evitar pérdida, duplicación o validación accidental de información. Esta especificación define comportamiento de producto, no criterios diagnósticos ni protocolos clínicos.

## 1. Base existente y brechas verificadas

| Base observada | Decisión |
| --- | --- |
| `components/PreAdmissionCard.tsx`: botones, foto privada, antecedentes con detalles por ítem y múltiples cirugías, hábitos condicionales, alergias y sección social. | Reutilizar componentes y contenidos; mejorar comportamiento. |
| `components/RolePatientViews.tsx`: vistas propias para coordinación y trabajo social. | Mantener separación; compartir componentes y validaciones para evitar diferencias. |
| Trabajo social sólo tiene «Guardar y validar» y sus opciones permiten combinar «Sin barreras» con barreras. | Agregar borrador y exclusiones comunes en interfaz y servidor. |
| El formulario clínico envía validación social junto a clínica, incluso si no se revisó esa sección. | Acciones y sellos independientes. |
| El `PUT` de pacientes reconstruye los bloques editables desde el cuerpo recibido, sin versión ni transacción. | Guardar sólo cambios explícitos con concurrencia controlada. Un perfil combinado que guarda desde la vista social puede borrar bloques clínicos/administrativos omitidos. |
| El servidor acepta estado global validado sin exigir que el sello clínico quede confirmado. | Derivar estado de una acción válida y una revisión de la versión guardada. |
| El listado limita casos de trabajo social por derivación; el `PUT` revisado comprueba rol y centro, pero no asignación del caso. | Aplicar el mismo alcance al consultar y modificar cada paciente. |
| Opciones sociales se serializan como texto separado por comas; textos se recortan silenciosamente en `functions/domain.js`. | Códigos y listas estructuradas; límites visibles y rechazo de exceso, sin truncar contenido. |

No se inspeccionaron pacientes ni producción. Los hallazgos son de lectura de código; no son resultados de pruebas de ejecución.

## 2. Dashboard y recorrido

Pantalla inicial «Preingreso»: buscador por nombre o RUT, botón «Nuevo ingreso» para perfiles autorizados y filtros «Ingreso mínimo», «En preparación», «Por validar» y «Clínico validado». Estado social en columna o etiqueta independiente. Los contadores y resultados respetan el alcance del rol.

Cada fila muestra nombre, RUT formateado, estado clínico, estado social y fecha de última actualización. Recepción ve estados y pendientes administrativos, sin detalles clínicos/sociales. Trabajo social ve sus casos asignados y filtro por estado social. Buscar un RUT con o sin puntos/guion produce el mismo resultado.

Al abrir un paciente:

1. Cabecera persistente con nombre, RUT, centro y foto cuando el rol puede verla; iniciales como alternativa.
2. Navegación por secciones: Identificación, Antecedentes, Alergias y medicamentos, Hábitos y antecedentes del pie, Social, Revisión. Mostrar únicamente secciones autorizadas.
3. Cada sección indica «No iniciado», «En preparación», «Revisado» o «Requiere nueva revisión», con resumen al plegarse.
4. Barra inferior con «Guardar borrador» y la acción del rol. «Guardar» nunca implica validar.
5. Revisión presenta respuestas, omisiones y contradicciones con enlaces al campo. No calcular un porcentaje que confunda completitud con validez clínica.

En móvil: una columna, controles táctiles de al menos 44 × 44 px, texto base legible, sin desplazamiento horizontal a 360 px. La barra inferior no tapa campos ni el teclado. Selección visible con texto/marca y `aria-pressed`, foco de teclado y errores asociados al campo. Al guardar se anuncia el resultado sin desplazar innecesariamente al usuario.

## 3. Campos y condiciones

Regla transversal: un campo vacío significa «sin registrar», nunca «no presenta». Cuando corresponde ofrecer «Sí», «No conocido» y «No evaluado». «No evaluado» cuenta como respuesta explícita, pero no como evaluación concluida. No preseleccionar respuestas negativas.

| Sección | Entrada principal | Detalle condicional y validación |
| --- | --- | --- |
| Identificación | RUT y nombre; nacimiento, teléfono y comuna. | RUT normalizado y dígito verificador; nombre no vacío. Fecha real y no futura. Teléfono opcional con país visible, validado si se ingresa; permitir declarar «Sin contacto disponible». Comuna desde catálogo y alternativa explícita fuera del catálogo. |
| Antecedentes mórbidos | Botones existentes y «Otro antecedente»; estado explícito si no hay datos. | Cada selección abre «Agregar detalle», inicialmente plegado. Año aproximado o desconocido y observación opcional. DM-1/DM-2 excluyentes como catálogo actual; inconsistencias importadas se muestran para revisión, sin escoger una automáticamente. |
| Cirugías | Botones existentes y «Otra cirugía». | Registros repetibles con procedimiento, lado —derecho, izquierdo, bilateral o desconocido—, localización, año aproximado/desconocido y observación. Ejemplo sintético: amputación menor, 1.er ortejo derecho, 2001; segundo registro, 2.º ortejo derecho, 2003. |
| Alergias | «Sí presenta», «Sin alergias conocidas», «No evaluado». | Con «Sí», exigir al menos un agente o declarar «Agente no identificado» antes de enviar/validar. Reacción opcional, con posibilidad de desconocida. Cambiar a «Sin alergias» con entradas existentes solicita retirar esas entradas de la versión activa. |
| Medicamentos | Catálogo existente y «Otro medicamento». | Detalles opcionales por medicamento: presentación, dosis, unidad, frecuencia y fuente, sin sugerir dosis. No convertir automáticamente una selección en tratamiento confirmado. Permitir «No evaluado» y «Sin medicamentos referidos». |
| Hábitos | Opciones existentes más estado no evaluado donde falta. | Alcohol/sustancias: detalle sólo en consumo o exconsumo. Al ocultar un detalle existente avisar y ofrecer deshacer; no enviar texto oculto como información vigente. |
| Función renal y antecedentes del pie | Opciones existentes con «No evaluado». | Mostrar alertas de coherencia entre ERC y función renal, cirugía y amputaciones, revascularización y antecedente vascular. No diagnosticar ni completar otros campos automáticamente. Permitir resolver o registrar explicación antes de validar. |
| Situación social | Convivencia, red de apoyo, movilidad, transporte y vivienda. | Separar «Vive solo/a» de red de apoyo: puede vivir solo y tener apoyo familiar. Separar ayuda técnica de necesidad de asistencia. «Sin barreras» excluye barreras del mismo grupo. |
| Detalle social | «Agregar detalle» por opción seleccionada. | Cuidador/apoyo: vínculo y disponibilidad; transporte/vivienda: descripción de la barrera; asistencia: necesidad referida. Nota excepcional opcional, sin exigir texto que ya expresan las opciones. |

«Otro» muestra el campo sólo al activarse. Enter agrega la opción, no envía el formulario. Normalizar espacios y duplicados sin distinguir mayúsculas; preservar la escritura del usuario. Si hay texto aún no agregado, bloquear envío/validación indicando «Agrega o descarta el texto pendiente»; en borrador ofrecer incorporarlo explícitamente.

Desmarcar un antecedente con detalles permite deshacer antes de guardar. Una vez guardado, sus detalles dejan de estar activos y permanecen en el historial; no reaparecen como vigentes al volver a seleccionar el ítem. Las importaciones históricas con texto libre se conservan como «Registro previo» hasta revisión, sin dividir indiscriminadamente por comas.

## 4. Foto del paciente

Mantener separada la foto de identificación de las imágenes de heridas. Es opcional y nunca bloquea ingreso, envío ni validación.

Flujo: «Tomar foto» o «Elegir archivo» → vista previa con nombre/RUT visibles → «Usar esta foto» / «Repetir» / «Cancelar». Guardar foto es una operación independiente que no guarda ni descarta el formulario pendiente. Mostrar progreso, resultado y reintento. Conservar la foto anterior si falla la carga.

Conservar JPEG, PNG y WebP, máximo 5 MB; verificar contenido decodificable y tipo real en servidor. Corregir orientación y eliminar metadatos de ubicación antes de persistir. Enlace privado temporal; renovar si expira sin pedir otra foto. Si no puede mostrarse, usar iniciales y mensaje accesible.

Mantener permisos actuales: TENS, enfermería y medicina pueden cargar/ver; recepción y trabajo social usan iniciales. Ampliar acceso a otros roles queda fuera de esta propuesta. La autorización institucional para retratos es una definición pendiente del centro y no se deduce del consentimiento de fotografía de heridas; el módulo funciona sin retrato mientras se define.

## 5. Acciones y validaciones por rol

| Capacidad | Recepción/coordinación | TENS | Enfermería | Trabajo social |
| --- | --- | --- | --- | --- |
| Crear ingreso con nombre y RUT | Sí | Sí | Sí | No |
| Editar identificación/contacto | Sí | Sí | Sí | No |
| Registrar antecedentes clínicos | No | Borrador | Sí | No |
| Enviar clínica a revisión | No | Sí | Sí | No |
| Validar clínica | No | No | Sí, acción explícita | No |
| Registrar sección social | No | Borrador | Sí | Sí, casos asignados |
| Validar social | No | No | Sí, acción independiente | Sí, casos asignados |
| Foto identificatoria | No | Sí | Sí | No |

Medicina mantiene registro y validación clínica/social, sin ampliar atribuciones de especialistas. Administrador de centro y superadministrador no reciben acceso a pacientes por administrar cuentas.

Permisos combinados: sumar capacidades concedidas por membresías, pero comprobar cada sección y el alcance del caso. Una vista social sólo envía cambios sociales aunque la cuenta también tenga permisos clínicos. Comprobar autorización en servidor en cada lectura, escritura y entrega de imagen; ocultar controles no es autorización. Intentos de escribir secciones no autorizadas devuelven error y no producen cambios parciales.

## 6. Estados y transiciones

Mantener los cuatro valores existentes para clínica; presentar el último como «Clínico validado». La validación social conserva estado independiente.

| Acción | Condición | Resultado |
| --- | --- | --- |
| Crear | Identidad mínima válida y RUT único en centro | `minimal` |
| Guardar cambios clínicos | Rol editor y estructura válida | `in_progress`; si había revisión, queda «Requiere nueva revisión» |
| Enviar para validación | Sin errores bloqueantes y rol editor | `pending_validation` |
| Validar clínica | Enfermería/medicina, revisión explícita de versión actual, sin errores bloqueantes | `validated` y sello confirmado de esa versión en una misma transacción |
| Devolver para completar | Validador, motivo visible | `in_progress` con motivo; conservar historial |
| Guardar sólo administración/foto/social | Permiso de sección | Estado clínico sin cambios |
| Guardar social modificada | Rol autorizado | Social en borrador; revisión previa deja de ser vigente |
| Validar social | Rol validador social y revisión explícita | Social confirmada para su versión |

Una edición sin cambios reales no invalida revisiones. Modificar una sección validada invalida sólo su revisión vigente; se conserva quién validó la versión anterior. El estado clínico no afirma que social esté validada. No bloquear atención por evaluación social pendiente.

Estados de interfaz separados: sin cambios, cambios sin guardar, guardando, guardado, error, conflicto y sesión expirada. Ejemplos: «Borrador guardado a las 10:42», «No se guardó. Tus cambios siguen en pantalla», «Otra persona actualizó esta sección. Revisa las diferencias». Si la escritura tuvo éxito pero falló refrescar el listado: «Guardado; no se pudo actualizar el panel», sin invitar a duplicar la escritura.

## 7. Reglas de guardado y prevención de errores

1. Guardado explícito de borrador. No validar automáticamente ni al presionar Enter. Deshabilitar doble envío mientras hay una operación activa. Mostrar éxito sólo después de respuesta confirmada del servidor.
2. Enviar centro, paciente, sección, cambios explícitos, versión base, intención e identificador de operación. El servidor define autor, hora y permisos. Omitir un campo preserva su valor; borrar requiere una operación explícita permitida. Nunca construir bloques vacíos desde propiedades ausentes.
3. Usar versión por sección —identificación, clínica, social y foto— con comparación transaccional. Cambios en secciones diferentes pueden convivir; versión antigua de la misma sección devuelve 409 sin escribir. Comparar versión original, versión actual y edición local; ofrecer conservar servidor o reaplicar cambios tras revisión, sin sobrescritura automática.
4. Reintentos con el mismo identificador de operación devuelven el resultado ya aplicado. Crear paciente exige unicidad transaccional de RUT normalizado dentro del centro; dos ingresos simultáneos no crean duplicados. Ante duplicado, ofrecer abrir el registro existente dentro de los permisos del usuario.
5. Distinguir errores bloqueantes de datos desconocidos: RUT/nombre inválidos, formato o longitud inválida, combinaciones excluyentes y alergias presentes sin identificación explícita bloquean envío/validación. Datos no evaluados se muestran en revisión y se conservan como tales; no exigir respuestas inventadas. Un borrador admite incompletitud, pero no payloads mal formados ni contradicciones estructurales.
6. Repetir validaciones en servidor. Mantener límites existentes donde corresponden: nombre 150, contacto 40, comuna 80, opciones 30 de hasta 120 caracteres, detalles 12 por ítem de hasta 300, nota social 1.000. Mostrar contador y error antes del límite; rechazar exceso sin truncar. Para nuevas estructuras, documentar límites equivalentes en el contrato.
7. Antes de salir/cambiar paciente con cambios pendientes: «Guardar borrador», «Descartar cambios» o «Seguir editando». Un fallo de guardado mantiene al usuario en el paciente actual. No persistir borradores clínicos en almacenamiento web duradero por defecto; ante pérdida de conexión conservarlos en memoria y advertir que cerrar/recargar puede perder lo no guardado.
8. Al expirar sesión o perder permisos, no seguir enviando ni reutilizar la operación bajo otra cuenta/centro. Reautenticar y volver a verificar acceso; no dejar información de la sesión anterior accesible a otra persona.
9. Registrar historial por sección: autor, momento, versión, campos cambiados y validación/revocación. Mantener eventos de auditoría sin volcar datos sensibles a registros generales. Publicar cambio y evento de auditoría de forma atómica o mediante evento durable recuperable.
10. Recargar desde respuesta canónica del servidor, preservando ediciones pendientes de otras secciones. Adjuntar una foto no reinicia formularios. Fallos de carga y errores de formulario tienen mensajes independientes.

## 8. Unidades de implementación propuestas

Estas unidades son trabajo pendiente; el entregable actual termina en esta especificación.

| Unidad | Alcance y entregable | Dependencia | Criterio de cierre |
| --- | --- | --- | --- |
| A. Contrato de datos y permisos | Esquema por sección, transiciones, listas estructuradas, compatibilidad histórica y alcance de trabajo social. | Ninguna. | Contrato documentado con ejemplos sintéticos y matriz de permisos consistente. |
| B. Persistencia | Actualizaciones parciales, versiones, idempotencia, unicidad y sellos independientes. | A. | Pruebas de emulador de concurrencia, preservación y denegación por rol/centro/caso. |
| C. Componentes de ingreso | Reutilizar botones/detalles, campos condicionales, errores y dashboard por rol. | A; integración final con B. | Recorridos sintéticos móvil/escritorio y teclado sin pérdida ni respuestas implícitas. |
| D. Foto | Vista previa, guardado separado, validación de archivo y fallos recuperables. | A; versión de foto de B. | Archivo inválido rechazado y formulario pendiente preservado al cargar/cancelar/fallar. |
| E. Verificación integral | Casos de aceptación siguientes y registro de resultados. | B, C y D. | Todos los casos pasan; fallos y límites documentados antes de considerar implementación terminada. |

## 9. Casos de aceptación para la implementación

| Caso sintético | Resultado exigido |
| --- | --- |
| Recepción ingresa nombre y RUT válido, deja lo demás vacío. | Se crea un ingreso mínimo; ningún vacío se convierte en negación clínica. |
| RUT con/sin formato y dos altas simultáneas. | Búsqueda equivalente; una sola identidad por centro. |
| TENS registra dos amputaciones menores con lado/año distintos. | Ambos registros persisten asociados al mismo antecedente tras recargar. |
| TENS intenta validar por solicitud directa. | No se confirma clínica ni social; error de autorización explícito. |
| Enfermería valida clínica sin revisar social. | Sólo clínica queda confirmada. |
| Trabajo social guarda borrador o valida. | Acciones distintas; clínica e identificación se conservan intactas. |
| Cuenta TENS + trabajo social guarda únicamente social. | No borra antecedentes/contacto, ni altera validación clínica. |
| Trabajo social accede por identificador a caso no asignado o de otro centro. | Lectura y escritura denegadas sin revelar datos. |
| Se elige «Sin barreras» tras seleccionar costo/distancia. | No persisten opciones incompatibles, tanto en vista clínica como social y API. |
| Se oculta detalle de consumo o se retira antecedente con detalle. | Aviso y deshacer; lo retirado no se publica como vigente. |
| Alergia «Sí» sin agente, texto en «Otro» sin agregar o fecha futura. | Mensaje específico y foco al campo; no hay validación accidental. |
| Dos usuarios modifican la misma sección desde la misma versión. | Primer guardado exitoso; segundo en conflicto, sin pérdida ni sobrescritura. |
| Dos usuarios modifican clínica y social respectivamente. | Ambos cambios sobreviven y conservan sus sellos independientes. |
| Se edita clínica después de validarla. | Requiere nueva revisión; la validación antigua permanece sólo como historial. |
| Se cambia teléfono o foto de paciente clínicamente validado. | Se conserva validación clínica y edición pendiente del formulario. |
| Se pierde respuesta tras guardar y se reintenta. | Un solo cambio lógico; se recupera resultado de la misma operación. |
| Foto inválida, mayor a 5 MB, error de red o cancelación. | Foto previa conservada y campos pendientes intactos; reintento disponible. |
| Se navega con cambios pendientes o expira la sesión. | Protección de salida y mensaje honesto; no se informa un guardado inexistente. |
| Uso a 360 px, escritorio y sólo teclado. | Controles legibles/accesibles, foco visible y ningún campo tapado por acciones. |

## 10. Verificación del entregable

Se contrastó la propuesta con `PreAdmissionCard.tsx`, `RolePatientViews.tsx`, `ClinicalDashboard.tsx`, `pre-admission.css`, `types.ts`, `services/api.ts`, `functions/index.js`, `functions/domain.js` y la documentación local. Se revisó cobertura de los cinco objetivos: botones/condicionales, foto, social, antecedentes detallables y prevención de errores manuales; todos cuentan con comportamiento y aceptación explícitos.

No se modificó código, no se desplegó ni se ejecutaron pruebas clínicas o de producción. La comprobación de esta entrega es documental; los casos de la sección 9 deberán ejecutarse al implementar.
