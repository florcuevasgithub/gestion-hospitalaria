import csv
import logging
from functools import lru_cache
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from api.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/metadata", tags=["Metadata"])

# Ruta construida desde la ubicación física de este archivo, no desde el CWD.
# __file__ → .../backend/api/routes/metadata.py  (siempre fijo)
# parents[0] → .../backend/api/routes/
# parents[1] → .../backend/api/
# parents[2] → .../backend/
# Esto funciona sin importar desde qué directorio se ejecute uvicorn.
BASE_DIR  = Path(__file__).resolve().parents[2]
_CSV_PATH = BASE_DIR / "data" / "cie10_uti.csv"

# Verificación temprana al importar el módulo (aparece en la consola de uvicorn)
print(f"[CIE-10] BASE_DIR  : {BASE_DIR}")
print(f"[CIE-10] CSV_PATH  : {_CSV_PATH}")
print(f"[CIE-10] Existe    : {_CSV_PATH.exists()}")


# ── Carga del catálogo CIE-10 (una sola vez en memoria) ──────────────────────

@lru_cache(maxsize=1)
def _cargar_cie10() -> list[dict]:
    """
    Lee el CSV de códigos CIE-10 y lo almacena en memoria.
    El decorador lru_cache garantiza que el archivo se lea
    una única vez durante el ciclo de vida del proceso.
    """
    logger.info("[CIE-10] Buscando catálogo en: %s", _CSV_PATH)
    print(f"[CIE-10] Ruta absoluta del CSV: {_CSV_PATH}")

    if not _CSV_PATH.exists():
        raise FileNotFoundError(f"Catálogo CIE-10 no encontrado en: {_CSV_PATH}")

    with open(_CSV_PATH, encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        return [{"codigo": row["codigo"], "descripcion": row["descripcion"]} for row in reader]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/cie10")
def buscar_cie10(
    search: Annotated[str, Query(min_length=1, description="Texto o código a buscar (ej: 'J18' o 'Neum')")],
    _: Annotated[str, Depends(get_current_user)],
):
    """
    Busca códigos CIE-10 por código alfanumérico o descripción.
    La búsqueda es insensible a mayúsculas/minúsculas.
    Devuelve hasta 20 resultados para no saturar el desplegable.
    """
    try:
        catalogo = _cargar_cie10()
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))

    termino = search.strip().lower()
    resultados = [
        entrada for entrada in catalogo
        if termino in entrada["codigo"].lower() or termino in entrada["descripcion"].lower()
    ]

    return {
        "total": len(resultados),
        "resultados": resultados[:20],
    }


@router.get("/cie10/catalogo")
def get_cie10_catalogo(
    _: Annotated[str, Depends(get_current_user)],
):
    """
    Devuelve el catálogo CIE-10 completo como diccionario {codigo: descripcion}.
    Usado por el frontend para resolver descripciones sin llamadas extra.
    """
    try:
        catalogo = _cargar_cie10()
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {entrada["codigo"]: entrada["descripcion"] for entrada in catalogo}


@router.get("/opciones")
def get_opciones(
    _: Annotated[str, Depends(get_current_user)],
):
    """
    Devuelve los diccionarios estáticos usados en los desplegables del frontend.
    Centralizar estos valores en el backend evita inconsistencias con la BD.
    """
    return {
        "sexo_biologico": [
            "Masculino",
            "Femenino",
        ],
        "procedencia": [
            "Guardia",
            "Quirófano",
            "Piso",
            "Ambulancia",
            "Otro Hospital",
        ],
        "tipo_egreso": [
            "Alta Médica",
            "Defunción",
            "Derivación",
            "Cambio de Cama (Falla Técnica)",
        ],
        "estado_cama": [
            "Disponible",
            "Ocupada",
            "Limpieza",
            "Mantenimiento",
        ],
    }
