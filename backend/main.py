from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import pacientes, internaciones, camas, dashboard, metadata

app = FastAPI(
    title="API Gestión Hospitalaria",
    description="Backend para el sistema de gestión de UTI",
    version="0.1.0",
)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://appgestionhospitalaria.vercel.app",
    "https://appgestionhospitalaria-git-main-florcuevasgithubs-projects.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pacientes.router)
app.include_router(internaciones.router)
app.include_router(camas.router)
app.include_router(dashboard.router)
app.include_router(metadata.router)


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "message": "API Gestión Hospitalaria en línea"}
