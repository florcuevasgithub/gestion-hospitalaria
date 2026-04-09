# Sistema de Gestión de Unidad de Terapia Intensiva (UTI)

Desarrollé esta plataforma full-stack orientada a optimizar el flujo de internaciones en áreas críticas, garantizando la trazabilidad de los pacientes y la integridad de los datos médicos mediante estándares internacionales.

Como Ingeniera Biomédica y Data Scientist, mi objetivo con este proyecto fue tender un puente entre la gestión clínica operativa y la estructuración de datos para futuros análisis epidemiológicos o modelos de machine learning.

## 🚀 Arquitectura y Tecnologías

El sistema está construido sobre una arquitectura desacoplada:

* **Frontend (React + Vite + Tailwind CSS):** Interfaz de usuario reactiva, diseño de máquina de estados con interfaz visual para las camas y manejo de formularios asíncronos.
* **Backend (Python + FastAPI):** API RESTful de alto rendimiento. Implementa caché en memoria (`@lru_cache`) para búsquedas en tiempo real sobre el catálogo médico.
* **Base de Datos & Auth (Supabase / PostgreSQL):** Almacenamiento relacional y sistema de autenticación seguro.
* **Seguridad:** Validación criptográfica de tokens JWT en el backend para proteger endpoints clínicos.

## ⚙️ Funcionalidades Principales (MVP)

1.  **Admisión de Pacientes:** Registro validado con interlock preventivo (no permite ingresos sin cama disponible ni diagnóstico estandarizado).
2.  **Integración CIE-10:** Motor de búsqueda predictivo conectado al catálogo oficial de la Organización Mundial de la Salud para clasificar diagnósticos de UTI (ej. J18 Neumonía).
3.  **Gestión de Camas (Máquina de Estados):** Tablero de control visual que monitorea y actualiza el estado de las unidades (Disponible 🟢, Ocupada 🔴, Limpieza 🟡, Mantenimiento ⚫).
4.  **Egresos Clínicos Completos:** Alta Médica, Defunción, Derivación (con hospital de destino) y Cambio de Cama por Falla Técnica (traslado sin cerrar la internación).
5.  **Trazabilidad Continua:** Cada ingreso y egreso queda sellado criptográficamente con el UUID del personal médico en turno.
6.  **Panel Epidemiológico:** Ranking de diagnósticos CIE-10 prevalentes con barras proporcionales, calculado en tiempo real desde las internaciones registradas.

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

*Nota: Se requiere configuración previa de variables de entorno (Supabase URL, Anon Key y JWT Secret).*

---
*Desarrollado en Córdoba, Argentina.*
