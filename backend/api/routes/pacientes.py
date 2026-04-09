from fastapi import APIRouter, HTTPException
from db.supabase_client import supabase

router = APIRouter(prefix="/api/pacientes", tags=["Pacientes"])


@router.get("/test")
def test_conexion():
    """
    Endpoint de prueba para verificar la conexión con Supabase.
    Consulta la tabla `sector` y devuelve sus registros.
    """
    try:
        response = supabase.table("sector").select("*").execute()
        return {"status": "ok", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
