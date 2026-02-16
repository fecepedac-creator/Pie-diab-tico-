# Pie Diabético - Gestión Clínica Multidisciplinaria

Aplicación clínica con:
- **Backend persistente multiusuario** (API + almacenamiento de estado en servidor, lista para migración a PostgreSQL/MongoDB).
- **Autenticación real** (registro/login con roles y token).
- **Funciones IA con Gemini** vía `VITE_GEMINI_API_KEY`.
- **Subida de fotos reales** de heridas.
- **Exportación de comité a PDF** con `jsPDF`.

## 1) Configuración de entorno
Crea `.env.local` para frontend y `.env` para backend (puedes usar `.env.example`):

```bash
cp .env.example .env.local
cp .env.example .env
```

Variables relevantes:
- `VITE_API_URL=http://localhost:4000`
- `VITE_GEMINI_API_KEY=...`
- `API_PORT=4000`
- `JWT_SECRET=...`

## 2) Ejecutar backend
```bash
npm run server
```

## 3) Ejecutar frontend
```bash
npm run dev
```

## Nota de persistencia
El backend incluido persiste en `server/data.json` para funcionar sin dependencias externas.
Está preparado para migrar a PostgreSQL/MongoDB reemplazando la capa de almacenamiento en `server/index.js`.

## Multi-tenant (MT-1)

### Modelo nuevo
- `pd_centers/{centerId}`: `name`, `modules[]`, `enabledRoles[]`.
- `pd_centers/{centerId}/users/{uid}`: `roles[]`, `isActive`.
- `pd_centers/{centerId}/settings/clinical_config`.

### Migración incremental
1. Definir centro por defecto:
   - `DEFAULT_CENTER_ID=talca` (o el ID que uses).
2. Ejecutar script de migración:
```bash
npm run migrate:center-ids
```
3. (Opcional transición) para permitir escritura de documentos heredados sin `centerId`:
   - `MT_MIGRATION_MODE=true` en backend.

El script reporta conteos de migración para `patients`, `episodes`, `visits`, `referrals`.
