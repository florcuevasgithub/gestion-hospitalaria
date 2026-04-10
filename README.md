# Sistema de Gestión de Unidad de Terapia Intensiva (UTI)

Desarrollé esta plataforma full-stack orientada a optimizar el flujo de internaciones en áreas críticas, garantizando la trazabilidad de los pacientes y la integridad de los datos médicos mediante estándares internacionales.

Como Ingeniera Biomédica y Data Scientist, mi objetivo con este proyecto fue tender un puente entre la gestión clínica operativa y la estructuración de datos para futuros análisis epidemiológicos o modelos de machine learning.

## 🚀 Arquitectura y Tecnologías

El sistema está construido sobre una arquitectura desacoplada:

* **Frontend (React + Vite + Tailwind CSS):** Interfaz de usuario reactiva, diseño de máquina de estados visual para las camas y manejo de formularios asíncronos.
* **Backend (Python + FastAPI):** API RESTful de alto rendimiento. Implementa caché en memoria (`@lru_cache`) para búsquedas en tiempo real sobre el catálogo médico.
* **Base de Datos & Auth (Supabase / PostgreSQL):** Almacenamiento relacional y sistema de autenticación seguro.
* **Seguridad:** Validación criptográfica de tokens JWT en el backend para proteger endpoints clínicos.
* **Deploy:** Frontend en Vercel · Backend en Render.

## ⚙️ Funcionalidades Principales

1. **Admisión de Pacientes:** Registro validado con interlock preventivo (no permite ingresos sin cama disponible ni diagnóstico estandarizado).
2. **Integración CIE-10:** Motor de búsqueda predictivo conectado al catálogo oficial de la OMS para clasificar diagnósticos de UTI (ej. J18 Neumonía).
3. **Gestión de Camas (Máquina de Estados):** Tablero visual con filtro por estado que monitorea y actualiza las unidades (Disponible 🟢, Ocupada 🔴, Limpieza 🟡, Mantenimiento ⚫).
4. **Egresos Clínicos Completos:**
   * Alta Médica, Defunción, Derivación (con hospital de destino obligatorio).
   * Cambio de Cama por Falla Técnica: traslado sin cerrar la internación — la cama original pasa a Mantenimiento y se abre la nueva como Ocupada.
5. **Trazabilidad Continua:** Cada ingreso y egreso queda sellado con el UUID del personal médico autenticado.
6. **Dashboard Analítico en Tiempo Real:**
   * Contadores de estado de camas (Disponible / Ocupada / Limpieza / Mantenimiento).
   * Tabla de pacientes internados con diagnóstico CIE-10, fecha de ingreso y estancia en formato `Xd Xh Xm`.
   * Tabla de egresos recientes con motivo coloreado (Alta 🟢 / Defunción 🔴 / Derivación 🔵) y hospital de destino.
   * Filtros en ambas tablas por sexo biológico, rango de edad, diagnóstico y motivo de egreso.
   * KPIs clínicos con filtro temporal (Hoy / Semana / Mes): ocupación, mortalidad y estancia media discriminados por tipo de cama (Común vs. KPC).
7. **Panel Epidemiológico:** Ranking de diagnósticos CIE-10 prevalentes con barras proporcionales. Las descripciones se resuelven dinámicamente desde el catálogo oficial.

## 🛠️ Ejecución Local

Para levantar el proyecto en un entorno de desarrollo:

### Backend
```bash
cd backend
python -m venv venv
source venv/Scripts/activate  # En Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Variables de entorno

**`backend/.env`**
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=eyJ...
SUPABASE_JWT_SECRET=...
```

**`frontend/.env.local`**
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=http://127.0.0.1:8000/api
```

## 🌐 Deploy

| Servicio | Plataforma | Configuración |
|---|---|---|
| Frontend | Vercel | Root Directory: `frontend` |
| Backend | Render | Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT` · Root Directory: `backend` |

En Vercel, las variables de entorno deben incluir `VITE_API_URL` apuntando a la URL del servicio en Render.

---
*Desarrollado en Córdoba, Argentina.*
