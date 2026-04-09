from fastapi import APIRouter, HTTPException
from api.schemas import EstadoCamaPayload
from db.supabase_client import supabase

router = APIRouter(prefix="/api/camas", tags=["Camas"])


@router.get("/disponibles", status_code=200)
def get_camas_disponibles():
    """Devuelve todas las camas con estado 'Disponible' para poblar el selector del formulario."""
    try:
        resultado = (
            supabase.table("cama")
            .select("id, codigo_cama, tipo, sector(nombre)")
            .eq("estado", "Disponible")
            .order("codigo_cama")
            .execute()
        )
        return {"camas": resultado.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al comunicarse con Supabase: {str(e)}")


@router.patch("/{cama_id}/estado", status_code=200)
def actualizar_estado_cama(cama_id: int, payload: EstadoCamaPayload):
    """
    Actualiza el estado operativo de una cama.

    Flujo:
    1. Valida que la cama exista.
    2. Actualiza el estado al valor recibido.
    """
    try:
        # ── 1. Validar que la cama existe ────────────────────────────────────
        resultado = (
            supabase.table("cama")
            .select("id, codigo_cama, estado")
            .eq("id", cama_id)
            .single()
            .execute()
        )

        if not resultado.data:
            raise HTTPException(status_code=404, detail="Cama no encontrada.")

        estado_anterior = resultado.data["estado"]
        codigo_cama = resultado.data["codigo_cama"]

        # ── 2. Actualizar estado ─────────────────────────────────────────────
        actualizacion = (
            supabase.table("cama")
            .update({"estado": payload.estado})
            .eq("id", cama_id)
            .execute()
        )

        if not actualizacion.data:
            raise HTTPException(
                status_code=500,
                detail="No se pudo actualizar el estado de la cama en Supabase.",
            )

        # ── 3. Respuesta exitosa ─────────────────────────────────────────────
        return {
            "status": "ok",
            "message": f"Estado de la cama '{codigo_cama}' actualizado correctamente.",
            "cama_id": cama_id,
            "estado_anterior": estado_anterior,
            "estado_nuevo": payload.estado,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al comunicarse con Supabase: {str(e)}")
