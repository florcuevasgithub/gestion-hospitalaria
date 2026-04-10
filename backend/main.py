import re
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from api.routes import pacientes, internaciones, camas, dashboard, metadata

app = FastAPI(
    title="API Gestión Hospitalaria",
    description="Backend para el sistema de gestión de UTI",
    version="0.1.0",
)

ALLOWED_ORIGIN_PATTERNS = [
    r"^http://localhost:\d+$",
    r"^http://127\.0\.0\.1:\d+$",
    r"^https://appgestionhospitalaria.*\.vercel\.app$",
]

def _origin_permitido(origin: str) -> bool:
    return any(re.match(p, origin) for p in ALLOWED_ORIGIN_PATTERNS)

@app.middleware("http")
async def cors_middleware(request: Request, call_next):
    origin = request.headers.get("origin", "")
    permitido = _origin_permitido(origin)

    if request.method == "OPTIONS":
        response = Response(status_code=204)
        if permitido:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "*"
        return response

    response = await call_next(request)
    if permitido:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
    return response

app.include_router(pacientes.router)
app.include_router(internaciones.router)
app.include_router(camas.router)
app.include_router(dashboard.router)
app.include_router(metadata.router)


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "message": "API Gestión Hospitalaria en línea"}
