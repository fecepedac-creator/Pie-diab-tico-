# PRD - Policlínico Pie Diabético

## Descripción General
Aplicación clínica para el seguimiento multidisciplinario de pacientes con úlceras de pie diabético, involucrando diferentes roles profesionales (Médico Diabetología, Enfermería, Cirugía Vascular, Cirugía General, Fisiatría, Auditor, Paramédico).

## Funcionalidades Implementadas

### Autenticación y Roles
- Sistema de login con JWT
- 8 roles de usuario configurados con credenciales demo
- Formularios diferenciados por rol

### Dashboards
- Dashboard general con estadísticas
- Vista por paciente y episodios
- Sistema de alertas clínicas

### Formularios de Visita
- **Enfermería**: Formulario de curación avanzada con técnicas de limpieza, debridamiento, apósitos y terapias
- **Médico**: Formulario de evaluación clínica completa con:
  - Descripción de herida
  - Evaluación de infección (IDSA/IWGDF)
  - Indicación de antibióticos
  - **Exámenes de laboratorio con fecha y tooltips de historial** (NUEVO - Feb 2026)
  - Derivación a cirugía
  - Plan de tratamiento

### Sistema de Laboratorio (Última actualización: Feb 15, 2026)
- Campo de fecha para exámenes de laboratorio
- Campos: HbA1c, Albúmina, PCR, VHS, Leucocitos, Creatinina
- Tooltips con historial de valores al pasar el cursor
- Los valores se guardan en el historial del paciente
- Ordenados por fecha (más reciente primero)
- Muestra hasta 5 valores históricos

## Arquitectura Técnica

### Frontend
- React 19 con TypeScript
- Vite como bundler
- Tailwind CSS para estilos
- Ubicación: `/app/frontend/src/`

### Backend
- Python FastAPI
- Autenticación JWT
- Persistencia en archivo JSON
- Ubicación: `/app/backend/`

### Archivos Clave
- `/app/frontend/src/components/WeeklyVisitForm.tsx` - Formularios de visita
- `/app/frontend/src/App.tsx` - Componente principal
- `/app/frontend/src/types.ts` - Tipos TypeScript
- `/app/backend/server.py` - API Backend
- `/app/backend/data.json` - Datos persistidos

## Credenciales Demo
Todas las cuentas usan la contraseña: `demo123`

| Rol | Email |
|-----|-------|
| Médico Diabetología | medico@demo.cl |
| Enfermería | enfermeria@demo.cl |
| Cirugía Vascular | vascular@demo.cl |
| Cirugía General | cirugia@demo.cl |
| Fisiatría | fisiatra@demo.cl |
| Auditor | auditor@demo.cl |
| Paramédico | paramedico@demo.cl |
| Admin | admin@demo.cl |

## Paciente Demo
- **Nombre**: Juan Pérez González
- **RUT**: 12.345.678-9
- **Episodio activo**: Talón Derecho
- **Historial de laboratorio**: 4 registros previos con PCR, Albúmina, VHS, Leucocitos, HbA1c, VFG

## Tareas Pendientes (Backlog)

### P1 - Alta Prioridad
- Agregar más datos demo para diferenciación de dashboards
- Persistir usuarios demo faltantes en server.py (actualmente solo en data.json)

### P2 - Media Prioridad
- Personalizar dashboards para Fisiatría, Auditor y Paramédico
- Implementar bandeja de derivaciones quirúrgicas funcional
- Implementar carga y comparación de fotos de heridas

### P3 - Mejoras Futuras
- Migrar persistencia a base de datos real (MongoDB/PostgreSQL)
- Implementar API granular en lugar de guardado completo de estado
- Agregar validación de campos de laboratorio (rangos normales/críticos)
- Exportación a PDF de evaluaciones médicas

## Notas Técnicas
- El sistema usa localStorage como respaldo del servidor
- La persistencia actual es un archivo JSON simple (no escalable)
- Los tooltips de laboratorio usan animación CSS pura
