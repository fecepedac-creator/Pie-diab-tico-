# Plataforma de gestión del equipo de Pie Diabético

Aplicación móvil y multicentro para coordinar el trabajo previo y posterior a la ficha clínica electrónica institucional. No reemplaza la ficha clínica ni toma decisiones clínicas automáticas.

Estado vigente de la versión candidata local y condiciones pendientes: [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md). Esta versión no está publicada ni habilitada para uso clínico piloto.

## Flujo implementado

- Inicio de sesión con Google y acceso únicamente por invitación.
- Superadministrador de plataforma para crear centros; no recibe acceso clínico implícito.
- Administrador de centro para invitar personas y combinar perfiles.
- Perfiles de coordinación, TENS, enfermería, medicina, cirugía general, cirugía vascular, enfermería vascular, traumatología, fisiatría, trabajo social y auditoría.
- Ingreso mínimo desde móvil, preingreso clínico/social, episodio de herida y consentimiento fotográfico.
- Atención compartida: caracterización única de la herida visible para medicina y enfermería, curación avanzada, WIfI sin clasificación automática y plan médico.
- Fotografías privadas pre y post curación, exámenes PDF/imagen, tareas internas con prioridad/plazo y aviso de WhatsApp sin datos personales.
- Evoluciones determinísticas listas para revisar y copiar a la ficha institucional.
- Vista imprimible para reunión multidisciplinaria.
- Control de concurrencia, permisos en servidor y bitácora de acciones.

## Arquitectura y seguridad

React/Vite sirve la interfaz. Una Cloud Function verifica el token Firebase, el correo confirmado, la membresía del centro y el perfil para cada operación. Firestore y Storage deniegan todo acceso directo desde el navegador. Las fotos y documentos se entregan mediante enlaces privados de corta duración.

No se envían datos clínicos a servicios de IA. WhatsApp sólo prepara un aviso genérico para abrir la plataforma y requiere configurar el número institucional del centro.

El [plan de mejora del resguardo de pacientes](docs/plan-mejora-resguardo-pacientes-r1.md) define los controles y evidencias pendientes antes de usar datos reales.

## Desarrollo y validación

```bash
npm ci
npm ci --prefix functions
npm run validate
npm run test:emulators
```

El test de emuladores usa exclusivamente identidades y pacientes sintéticos.

### Prueba local interactiva

Desde esta versión candidata, iniciar los emuladores y mantenerlos abiertos:

```powershell
.\node_modules\.bin\firebase.cmd emulators:start --project demo-pie-diabetico --only "auth,functions,firestore,storage"
```

En otra terminal, cargar el centro, un paciente, un episodio y una atención previa ficticios; después iniciar la interfaz:

```powershell
npm run seed:review
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Abrir `http://127.0.0.1:5173/` y elegir TENS, enfermería, medicina, Cirugía General, Cirugía Vascular o fisiatra en el acceso local. Seleccionar **Paciente ficticio de prueba** → **Plantar antepié**. TENS puede iniciar el registro fotográfico; enfermería y medicina, una nueva atención. En **Casos derivados**, cada especialidad ve **Tu aporte al caso derivado** al inicio del caso: aceptar gestión, registrar evaluación, guardar borrador o confirmar respuesta. Tras confirmar, el caso sale de sus derivados y la respuesta queda visible para medicina y enfermería en **Evolución y respuestas de especialidades**, con autor y hora. Los borradores aparecen identificados como sin confirmar. `npm run seed:review` agrega las cuentas y derivaciones ficticias que falten sin borrar respuestas previas. Para reiniciar deliberadamente sólo las tres derivaciones de muestra, ejecutar `npm run seed:review -- --reset-referrals`. Los demás datos de prueba se conservan hasta apagar los emuladores. La ruta `clinical-preview.html` es una maqueta de sólo lectura.

Fisiatría ofrece cuatro botones para preparar apartados de la respuesta: **descarga**, **prevención secundaria tras cierre**, **evaluación protésica** y **evaluación y manejo del dolor**. Los botones sólo añaden encabezados editables; el profesional debe escribir los hallazgos y la conducta. El caso sintético actual representa la indicación de descarga con herida activa. El recorrido posterior al cierre y la evaluación protésica aún requieren un caso de prueba específico.

Verificación rápida de salud/productivo sin credenciales:


```bash
node scripts/verify_staging_readiness.cjs
```

Para despliegues de canary/staging puede redefinir el endpoint de API con:

```bash
set VITE_API_URL=/api
set PD_PROD_BASE_URL=https://<tu-dominio-canary>.web.app
node scripts/verify_staging_readiness.cjs --base %PD_PROD_BASE_URL%
node scripts/verify_staging_readiness.cjs --strict --base %PD_PROD_BASE_URL%
```

## Despliegue

El despliegue requiere completar las condiciones de [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md) y verificar el proyecto de destino. Esta versión candidata permanece sólo en local.

El alta inicial se ejecuta localmente con credenciales administrativas ignoradas por Git:

```bash
node scripts/bootstrap_platform_admin.cjs --email persona@institucion.cl --center "Equipo de Pie Diabético"
```

Nunca confirmar en Git archivos `service-account.json`, `.env` ni datos exportados.
