# Policlínico Pie Diabético - Gestión Clínica Multidisciplinaria

Sistema integral para el seguimiento de pacientes con pie diabético, facilitando la coordinación entre Diabetología, Cirugía Vascular, Cirugía General, Enfermería y Fisiatría.

## Estructura del Proyecto

```
/
├── frontend/          # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── App.tsx
│   │   ├── types.ts
│   │   └── utils.ts
│   ├── package.json
│   └── vite.config.ts
├── backend/           # Node.js + Express
│   ├── index.js
│   ├── package.json
│   └── data.json      # Almacenamiento (dev)
└── firebase.json      # Configuración Firebase
```

## Desarrollo Local

### 1. Instalar dependencias

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

### 2. Configurar variables de entorno

**Frontend** (`frontend/.env`):
```
VITE_API_URL=http://localhost:8080
VITE_GEMINI_API_KEY=tu_api_key_de_gemini
```

**Backend** (`backend/.env`):
```
PORT=8080
JWT_SECRET=tu_secreto_jwt_seguro
PUBLIC_API_URL=http://localhost:8080
```

### 3. Ejecutar

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Acceder a: http://localhost:3000

## Deploy en Firebase App Hosting

### Prerrequisitos
- Cuenta de Firebase con plan Blaze
- Firebase CLI instalado: `npm install -g firebase-tools`

### Pasos

1. **Login en Firebase**
```bash
firebase login
```

2. **Inicializar proyecto**
```bash
firebase init apphosting
```

3. **Configurar variables de entorno en Firebase Console**
- `VITE_API_URL` → URL de tu backend en Cloud Run
- `VITE_GEMINI_API_KEY` → Tu API key de Google AI

4. **Deploy**
```bash
git push origin main
```
Firebase App Hosting desplegará automáticamente desde GitHub.

### Backend en Cloud Run

El backend puede desplegarse en Google Cloud Run:

```bash
cd backend
gcloud run deploy pie-diabetico-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

## Funcionalidades

- ✅ Dashboard con KPIs y priorización operativa
- ✅ Registro de pacientes con validación RUT chileno
- ✅ Gestión de episodios de heridas
- ✅ Score WIfI automatizado
- ✅ Registro de curaciones con tácticas INH
- ✅ Sistema de alertas clínicas
- ✅ Interconsultas quirúrgicas con IA (Gemini)
- ✅ Modo presentación para comités
- ✅ Autenticación con roles

## Tecnologías

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS
- **Backend**: Node.js, Express
- **IA**: Google Gemini API
- **Auth**: JWT
