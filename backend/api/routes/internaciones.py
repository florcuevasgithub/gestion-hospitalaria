from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from api.schemas import PacienteIngresoPayload, EgresoPayload
from api.security import get_current_user
from db.supabase_client import supabase

router = APIRouter(prefix="/api/internaciones", tags=["Internaciones"])


@router.post("/ingreso", status_code=201)
def ingresar_paciente(
    payload: PacienteIngresoPayload,
    user_id: str = Depends(get_current_user),
):
    """
    Registra el ingreso de un paciente a la UTI.

    Flujo:
    1. Busca o crea el paciente en paciente_boveda.
    2. Valida que la cama esté disponible.
    3. Crea el registro de internación.
    4. Marca la cama como Ocupada.
    """
    try:
        # ── 1. Buscar paciente por DNI ──────────────────────────────────────
        resultado_paciente = (
            supabase.table("paciente_boveda")
            .select("uuid_paciente")
            .eq("dni", payload.dni)
            .execute()
        )

        # ── 2. Crear paciente si no existe ──────────────────────────────────
        if resultado_paciente.data:
            uuid_paciente = resultado_paciente.data[0]["uuid_paciente"]
        else:
            nuevo_paciente = (
                supabase.table("paciente_boveda")
                .insert({
                    "dni": payload.dni,
                    "nombre": payload.nombre,
                    "apellido": payload.apellido,
                    "fecha_nacimiento": payload.fecha_nacimiento.isoformat(),
                    "sexo_biologico": payload.sexo_biologico,
                })
                .execute()
            )
            uuid_paciente = nuevo_paciente.data[0]["uuid_paciente"]

        # ── 3. Validar disponibilidad de la cama ────────────────────────────
        resultado_cama = (
            supabase.table("cama")
            .select("id, estado")
            .eq("id", payload.cama_id)
            .single()
            .execute()
        )

        if not resultado_cama.data:
            raise HTTPException(status_code=404, detail="Cama no encontrada.")

        if resultado_cama.data["estado"] != "Disponible":
            raise HTTPException(status_code=400, detail="La cama no está disponible.")

        # ── 4. Registrar internación ────────────────────────────────────────
        nueva_internacion = (
            supabase.table("internacion")
            .insert({
                "uuid_paciente": uuid_paciente,
                "cama_id": payload.cama_id,
                "codigo_cie10": payload.codigo_cie10,
                "procedencia": payload.procedencia,
                "personal_ingreso_id": user_id,
            })
            .execute()
        )

        internacion_id = nueva_internacion.data[0]["id"]

        # ── 5. Marcar la cama como Ocupada ──────────────────────────────────
        supabase.table("cama").update({"estado": "Ocupada"}).eq("id", payload.cama_id).execute()

        # ── 6. Respuesta exitosa ────────────────────────────────────────────
        return {
            "status": "ok",
            "message": "Paciente ingresado correctamente.",
            "internacion_id": internacion_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al comunicarse con Supabase: {str(e)}")


@router.post("/{internacion_id}/egreso", status_code=200)
def egresar_paciente(
    internacion_id: str,
    payload: EgresoPayload,
    user_id: str = Depends(get_current_user),
):
    """
    Cierra el ciclo clínico de un paciente internado.

    Flujo:
    1. Valida que la internación exista y no esté ya cerrada.
    2. Obtiene el cama_id asociado.
    3. Registra fecha/hora de egreso y tipo de egreso en internacion.
    4. Libera la cama pasándola a estado Limpieza.
    """
    try:
        # ── 1. Validar internación ───────────────────────────────────────────
        resultado = (
            supabase.table("internacion")
            .select("id, cama_id, fecha_hora_egreso")
            .eq("id", internacion_id)
            .single()
            .execute()
        )

        if not resultado.data:
            raise HTTPException(status_code=404, detail="Internación no encontrada.")

        if resultado.data["fecha_hora_egreso"] is not None:
            raise HTTPException(status_code=400, detail="La internación ya fue cerrada.")

        # ── 2. Obtener cama_id ───────────────────────────────────────────────
        cama_id = resultado.data["cama_id"]

        # ── 3. Cerrar internación ────────────────────────────────────────────
        fecha_egreso = datetime.now(timezone.utc).isoformat()

        actualizacion = (
            supabase.table("internacion")
            .update({
                "tipo_egreso": payload.tipo_egreso,
                "fecha_hora_egreso": fecha_egreso,
            })
            .eq("id", internacion_id)
            .execute()
        )

        if not actualizacion.data:
            raise HTTPException(
                status_code=500,
                detail="No se pudo actualizar la internación en Supabase.",
            )

        # ── 4. Liberar cama → Limpieza ───────────────────────────────────────
        liberacion = (
            supabase.table("cama")
            .update({"estado": "Limpieza"})
            .eq("id", cama_id)
            .execute()
        )

        if not liberacion.data:
            raise HTTPException(
                status_code=500,
                detail="Internación cerrada, pero no se pudo actualizar el estado de la cama.",
            )

        # ── 5. Respuesta exitosa ─────────────────────────────────────────────
        return {
            "status": "ok",
            "message": f"Egreso registrado correctamente. La cama {cama_id} pasó a estado Limpieza.",
            "internacion_id": internacion_id,
            "tipo_egreso": payload.tipo_egreso,
            "fecha_hora_egreso": fecha_egreso,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al comunicarse con Supabase: {str(e)}")
