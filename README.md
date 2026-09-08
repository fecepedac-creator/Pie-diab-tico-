# Plataforma de gestión del equipo de Pie Diabético

Aplicación móvil y multicentro para coordinar el trabajo previo y posterior a la ficha clínica electrónica institucional. No reemplaza la ficha clínica ni toma decisiones clínicas automáticas.

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

## Desarrollo y validación

```bash
npm ci
npm ci --prefix functions
npm run validate
firebase emulators:exec --project demo-pie-diabetico --only "auth,firestore,functions,hosting" "node functions/emulator-smoke.js"
```

El test de emuladores usa exclusivamente identidades y pacientes sintéticos.

## Despliegue

```bash
firebase deploy --only functions:api,firestore:rules,firestore:indexes,storage,hosting
```

El alta inicial se ejecuta localmente con credenciales administrativas ignoradas por Git:

```bash
node scripts/bootstrap_platform_admin.cjs --email persona@institucion.cl --center "Equipo de Pie Diabético"
```

Nunca confirmar en Git archivos `service-account.json`, `.env` ni datos exportados.
