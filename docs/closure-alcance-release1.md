# Cierre de alcance release 1 — “Pie Diabético” (Piloto operativo)

Documento base para firmar alcance, responsables y límites de esta fase.

## Objetivo operativo
Lanzar un piloto controlado de uso diario con:
- Preingreso completo por perfiles aprobados.
- Atención compartida con derivaciones y continuidad por episodio.
- Comité y resumen clínico.
- Dashboards de administración de plataforma y centro.
- Auditoría clínica mínima y trazabilidad.

## Alcance (IN)

### Módulos y procesos **sí**
1. Gestión de pacientes y preingreso (incluye antecedente médico, quirúrgico, alergias, medicación, hábitos, contexto social).
2. Registro de episodio y atenciones:
   - Apertura de episodios.
   - Captura de fotografías (pre/post) con consentimiento y control básico de calidad.
   - Registro clínico compartido por sección: herida, WIfI, enfermería y médico.
3. Derivaciones y seguimiento:
   - Tareas por perfil y estado (creada, asignada, en curso, resuelta).
4. Comité y resumen:
   - Vista cronológica de evolución y presentación de comité basada en datos reales de un episodio.
5. Administración:
   - Plataforma: altas, edición y archivo de centros.
   - Centro: miembros por perfiles y configuración operativa base.
6. Auditoría:
   - Eventos de alta/edición/cierre/derivación/foto.

### Módulos y mejoras **NO** (postergadas a siguientes entregas)
1. IA/automatizaciones avanzadas de sugerencia diagnóstica o cierre automático.
2. “Look and feel” premium o personalización visual extensa.
3. Integración automática con ficha clínica institucional.
4. Flujos externos no aprobados (alertas fuera de WhatsApp predefinido, mensajería no clínica directa).

## Perfiles habilitados en release 1 (tentativo)

- Superadmin de plataforma.
- Admin de centro.
- TENS (captura inicial + foto y preingreso).
- Enfermería.
- Médico de pie.
- CX / Coordinación.
- CV / Enfermería vascular.
- CX vascular.
- Traumatólogo.
- Fisiatra.
- Trabajo social / asistente social.
- Auditor (solo lectura operativa sobre audit logs según política definida).

Convergencia operativa:
- Matriz de permisos por perfil: [docs/matriz-permisos-rol-release1.md](/C:/Users/fecep/Proyectos/01_salud_clinica/pie-diabetico/docs/matriz-permisos-rol-release1.md)

## Criterios de salida de R0 (in/scope)

1. Documento firmado por responsable clínico y de operación (quién valida alcance).
2. Matriz de permisos por acción por perfil aprobada.
3. Decisiones explícitas de estados de flujo:
   - Guardado como borrador.
   - Confirmación/validación de sección.
   - Cierre de atención.
4. Decisiones explícitas de salida del piloto:
   - Qué eventos abortan (bloqueantes).
   - Qué errores bloquean continuidad operativa y cómo se recuperan.
5. Criterios técnicos mínimos de Release 1 (registro):
   - Decisión MFA: `sí/no` + fecha + responsable.
   - Retención mínima operacional:
     - Firestore/backup.
     - Storage/fotos.
   - Política de recuperación: RTO y RPO objetivo para piloto.

## Firmas de alcance (pendiente)

- Responsable clínico: ______________________  Fecha: __ / __ / ____  
- Responsable operación/TI: __________________  Fecha: __ / __ / ____  
- Sponsor del piloto: _______________________  Fecha: __ / __ / ____ 

### Estado

- **Estado actual de R0**: Pendiente de firma.
- **Próximo paso**: completar firmas y pasar a R1 (autorización + validaciones técnicas).
