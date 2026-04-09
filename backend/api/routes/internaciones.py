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
    Gestiona el egreso o traslado de un paciente internado.

    Flujo A — Cambio de Cama (Falla Técnica):
      1. Valida que nueva_cama_id esté presente y disponible.
      2. Reasigna cama_id en la internación actual (sin cerrarla).
      3. Pone la cama original en Mantenimiento.
      4. Pone la cama nueva en Ocupada.

    Flujo B — Alta / Defunción / Derivación:
      1. Registra fecha_hora_egreso y tipo_egreso en la internación.
      2. Pone la cama en Limpieza.
    """
    try:
        # ── 1. Validar que la internación exista y esté abierta ─────────────
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

        cama_id_original = resultado.data["cama_id"]

        # ════════════════════════════════════════════════════════════════════
        # FLUJO A: Cambio de Cama por Falla Técnica
        # ════════════════════════════════════════════════════════════════════
        if payload.tipo_egreso == "Cambio de Cama (Falla Técnica)":

            # ── 2. Validar cama destino ──────────────────────────────────────
            res_nueva_cama = (
                supabase.table("cama")
                .select("id, estado")
                .eq("id", payload.nueva_cama_id)
                .single()
                .execute()
            )

            if not res_nueva_cama.data:
                raise HTTPException(status_code=404, detail="La cama destino no fue encontrada.")

            if res_nueva_cama.data["estado"] != "Disponible":
                raise HTTPException(status_code=400, detail="La cama destino no está disponible.")

            # ── 3. Reasignar cama en la internación (sin cerrarla) ───────────
            actualizacion = (
                supabase.table("internacion")
                .update({"cama_id": payload.nueva_cama_id})
                .eq("id", internacion_id)
                .execute()
            )

            if not actualizacion.data:
                raise HTTPException(
                    status_code=500,
                    detail="No se pudo reasignar la cama en la internación.",
                )

            # ── 4. Cama original → Mantenimiento ────────────────────────────
            supabase.table("cama").update({"estado": "Mantenimiento"}).eq("id", cama_id_original).execute()

            # ── 5. Cama nueva → Ocupada ──────────────────────────────────────
            supabase.table("cama").update({"estado": "Ocupada"}).eq("id", payload.nueva_cama_id).execute()

            return {
                "status": "ok",
                "message": "Paciente transferido correctamente. Cama anterior en Mantenimiento.",
                "internacion_id": internacion_id,
                "cama_anterior_id": cama_id_original,
                "cama_nueva_id": payload.nueva_cama_id,
            }

        # ════════════════════════════════════════════════════════════════════
        # FLUJO B: Egreso real (Alta / Defunción / Derivación)
        # ════════════════════════════════════════════════════════════════════

        # ── 2. Registrar fecha y tipo de egreso ──────────────────────────────
        fecha_egreso = datetime.now(timezone.utc).isoformat()

        datos_egreso = {
            "tipo_egreso": payload.tipo_egreso,
            "fecha_hora_egreso": fecha_egreso,
        }
        if payload.tipo_egreso == "Derivación" and payload.destino_derivacion:
            datos_egreso["destino_derivacion"] = payload.destino_derivacion

        actualizacion = (
            supabase.table("internacion")
            .update(datos_egreso)
            .eq("id", internacion_id)
            .execute()
        )

        if not actualizacion.data:
            raise HTTPException(
                status_code=500,
                detail="No se pudo actualizar la internación en Supabase.",
            )

        # ── 3. Cama original → Limpieza ──────────────────────────────────────
        liberacion = (
            supabase.table("cama")
            .update({"estado": "Limpieza"})
            .eq("id", cama_id_original)
            .execute()
        )

        if not liberacion.data:
            raise HTTPException(
                status_code=500,
                detail="Internación cerrada, pero no se pudo actualizar el estado de la cama.",
            )

        respuesta_egreso = {
            "status": "ok",
            "message": f"Egreso registrado correctamente. La cama {cama_id_original} pasó a estado Limpieza.",
            "internacion_id": internacion_id,
            "tipo_egreso": payload.tipo_egreso,
            "fecha_hora_egreso": fecha_egreso,
        }
        if payload.destino_derivacion:
            respuesta_egreso["destino_derivacion"] = payload.destino_derivacion

        return respuesta_egreso

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al comunicarse con Supabase: {str(e)}")
