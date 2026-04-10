import math
from collections import Counter
from datetime import datetime, timezone, timedelta, date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from api.security import get_current_user
from db.supabase_client import supabase

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

# ── Helpers ──────────────────────────────────────────────────────────────────

def _calcular_dias_estancia(fecha_ingreso_str: str, fecha_egreso_str: str | None) -> int:
    """
    Calcula días de estancia redondeando hacia arriba.
    Si no hay egreso, usa la hora actual como referencia.
    """
    fmt = "%Y-%m-%dT%H:%M:%S"

    def parse(s: str) -> datetime:
        # Supabase devuelve timestamps con offset (+00:00) o con 'Z'
        s = s.replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(s)
        except ValueError:
            # Fallback: truncar microsegundos extras
            return datetime.fromisoformat(s[:26] + s[-6:])

    ingreso = parse(fecha_ingreso_str)
    egreso = parse(fecha_egreso_str) if fecha_egreso_str else datetime.now(timezone.utc)

    delta = egreso - ingreso
    dias = delta.total_seconds() / 86400
    return math.ceil(dias) if dias > 0 else 1


def _inicio_periodo(periodo: str) -> datetime:
    ahora = datetime.now(timezone.utc)
    if periodo == "day":
        return ahora - timedelta(days=1)
    if periodo == "week":
        return ahora - timedelta(weeks=1)
    return ahora - timedelta(days=30)  # month


def _kpis_por_tipo(internaciones: list, tipo: str) -> dict:
    """
    Calcula KPIs (mortalidad, estancia media) filtrando por tipo de cama.
    Maneja división por cero devolviendo 0.0.
    """
    subset = [i for i in internaciones if i.get("cama", {}).get("tipo") == tipo]
    egresados = [i for i in subset if i.get("fecha_hora_egreso")]

    total_egresos = len(egresados)
    defunciones = sum(1 for i in egresados if i.get("tipo_egreso") == "Defuncion")
    tasa_mortalidad = round((defunciones / total_egresos) * 100, 2) if total_egresos else 0.0

    dias_lista = [
        _calcular_dias_estancia(i["fecha_hora_ingreso"], i["fecha_hora_egreso"])
        for i in egresados
    ]
    promedio_estancia = round(sum(dias_lista) / len(dias_lista), 2) if dias_lista else 0.0

    return {
        "total_internaciones_periodo": len(subset),
        "total_egresos": total_egresos,
        "defunciones": defunciones,
        "tasa_mortalidad_pct": tasa_mortalidad,
        "promedio_estancia_dias": promedio_estancia,
    }


# ── Endpoint principal ────────────────────────────────────────────────────────

@router.get("/stats")
def get_dashboard_stats(
    periodo: Literal["day", "week", "month"] = Query(
        default="month",
        description="Rango temporal para los KPIs históricos: day | week | month",
    )
):
    """
    Devuelve el estado actual de la UTI y los KPIs calculados en Python.

    - **camas**: contadores totales y discriminados por tipo (Común / KPC).
    - **kpis**: mortalidad, estancia media y ocupación, separados por tipo de cama.
    - **pacientes_actuales**: lista de internaciones abiertas con trazabilidad completa.
    - **periodo**: rango temporal aplicado a los KPIs históricos.
    """
    try:
        inicio = _inicio_periodo(periodo)

        # ── 1. Estado de camas ────────────────────────────────────────────────
        res_camas = supabase.table("cama").select("id, codigo_cama, tipo, estado").execute()
        todas_las_camas = sorted(
            res_camas.data or [],
            key=lambda c: int("".join(filter(str.isdigit, c["codigo_cama"])) or 0),
        )

        conteo_camas = {"total": 0, "disponibles": 0, "ocupadas": 0, "limpieza": 0, "mantenimiento": 0}
        conteo_comunes = {"total": 0, "disponibles": 0, "ocupadas": 0}
        conteo_kpc     = {"total": 0, "disponibles": 0, "ocupadas": 0}

        for c in todas_las_camas:
            conteo_camas["total"] += 1
            estado = c["estado"]
            if estado == "Disponible":
                conteo_camas["disponibles"] += 1
            elif estado == "Ocupada":
                conteo_camas["ocupadas"] += 1
            elif estado == "Limpieza":
                conteo_camas["limpieza"] += 1
            elif estado == "Mantenimiento":
                conteo_camas["mantenimiento"] += 1

            bloque = conteo_kpc if c["tipo"] == "KPC" else conteo_comunes
            bloque["total"] += 1
            if estado == "Disponible":
                bloque["disponibles"] += 1
            elif estado == "Ocupada":
                bloque["ocupadas"] += 1

        total_camas = conteo_camas["total"]
        ocupacion_pct = (
            round((conteo_camas["ocupadas"] / total_camas) * 100, 2) if total_camas else 0.0
        )

        # ── 2. Internaciones del periodo (con join a cama y paciente_boveda) ──
        res_internaciones = (
            supabase.table("internacion")
            .select(
                "id, fecha_hora_ingreso, fecha_hora_egreso, tipo_egreso, cama_id, uuid_paciente,"
                "cama(id, codigo_cama, tipo),"
                "paciente_boveda(nombre, apellido)"
            )
            .gte("fecha_hora_ingreso", inicio.isoformat())
            .execute()
        )
        internaciones_periodo = res_internaciones.data or []

        # ── 3. KPIs discriminados por tipo de cama ────────────────────────────
        kpis_comunes = _kpis_por_tipo(internaciones_periodo, "Comun")
        kpis_kpc     = _kpis_por_tipo(internaciones_periodo, "KPC")

        # ── 4. Pacientes actualmente internados ───────────────────────────────
        res_activos = (
            supabase.table("internacion")
            .select(
                "id, fecha_hora_ingreso, codigo_cie10,"
                "cama(id, codigo_cama, tipo),"
                "paciente_boveda(nombre, apellido, sexo_biologico, fecha_nacimiento)"
            )
            .is_("fecha_hora_egreso", "null")
            .execute()
        )
        activos = res_activos.data or []

        def _horas_minutos_estancia(fecha_ingreso_str: str) -> tuple[int, int]:
            s = fecha_ingreso_str.replace("Z", "+00:00")
            try:
                ingreso = datetime.fromisoformat(s)
            except ValueError:
                ingreso = datetime.fromisoformat(s[:26] + s[-6:])
            delta = datetime.now(timezone.utc) - ingreso
            total_segundos = max(0, int(delta.total_seconds()))
            horas_totales = total_segundos // 3600
            minutos = (total_segundos % 3600) // 60
            return horas_totales, minutos

        def _calcular_edad(fecha_nac_str: str | None) -> int | None:
            if not fecha_nac_str:
                return None
            try:
                nac = date.fromisoformat(fecha_nac_str)
                hoy = date.today()
                return hoy.year - nac.year - ((hoy.month, hoy.day) < (nac.month, nac.day))
            except Exception:
                return None

        pacientes_actuales = [
            {
                "internacion_id": i["id"],
                "nombre": i.get("paciente_boveda", {}).get("nombre", "—"),
                "apellido": i.get("paciente_boveda", {}).get("apellido", "—"),
                "sexo_biologico": i.get("paciente_boveda", {}).get("sexo_biologico", "—"),
                "edad": _calcular_edad(i.get("paciente_boveda", {}).get("fecha_nacimiento")),
                "codigo_cama": i.get("cama", {}).get("codigo_cama", "—"),
                "tipo_cama": i.get("cama", {}).get("tipo", "—"),
                "dias_estancia": _calcular_dias_estancia(i["fecha_hora_ingreso"], None),
                "horas_estancia": _horas_minutos_estancia(i["fecha_hora_ingreso"])[0],
                "minutos_estancia": _horas_minutos_estancia(i["fecha_hora_ingreso"])[1],
                "codigo_cie10": i.get("codigo_cie10", "—"),
                "fecha_ingreso": i["fecha_hora_ingreso"],
            }
            for i in activos
        ]

        # ── 5. Egresos históricos (últimos 50) ───────────────────────────────
        res_egresos = (
            supabase.table("internacion")
            .select(
                "id, fecha_hora_ingreso, fecha_hora_egreso, tipo_egreso, destino_derivacion, codigo_cie10,"
                "cama(codigo_cama, tipo),"
                "paciente_boveda(nombre, apellido, sexo_biologico, fecha_nacimiento)"
            )
            .not_.is_("fecha_hora_egreso", "null")
            .order("fecha_hora_egreso", desc=True)
            .limit(50)
            .execute()
        )
        egresos_raw = res_egresos.data or []

        egresos_historicos = [
            {
                "internacion_id": e["id"],
                "nombre": e.get("paciente_boveda", {}).get("nombre", "—"),
                "apellido": e.get("paciente_boveda", {}).get("apellido", "—"),
                "sexo_biologico": e.get("paciente_boveda", {}).get("sexo_biologico", "—"),
                "edad": _calcular_edad(e.get("paciente_boveda", {}).get("fecha_nacimiento")),
                "codigo_cama": e.get("cama", {}).get("codigo_cama", "—"),
                "tipo_cama": e.get("cama", {}).get("tipo", "—"),
                "codigo_cie10": e.get("codigo_cie10", "—"),
                "tipo_egreso": e.get("tipo_egreso", "—"),
                "destino_derivacion": e.get("destino_derivacion"),
                "fecha_ingreso": e["fecha_hora_ingreso"],
                "fecha_egreso": e["fecha_hora_egreso"],
                "dias_estancia": _calcular_dias_estancia(e["fecha_hora_ingreso"], e["fecha_hora_egreso"]),
            }
            for e in egresos_raw
        ]

        # ── 6. Respuesta final ────────────────────────────────────────────────
        return {
            "periodo_consultado": periodo,
            "camas": {
                **conteo_camas,
                "ocupacion_porcentaje": ocupacion_pct,
                "por_tipo": {
                    "comunes": conteo_comunes,
                    "kpc": conteo_kpc,
                },
            },
            "kpis": {
                "comunes": kpis_comunes,
                "kpc": kpis_kpc,
            },
            "pacientes_actuales": pacientes_actuales,
            "total_pacientes_internados": len(pacientes_actuales),
            "egresos_historicos": egresos_historicos,
            # Lista cruda de camas para renderizar la grilla en el frontend
            "_camas_raw": [
                {
                    "id": c["id"],
                    "codigo_cama": c["codigo_cama"],
                    "tipo": c["tipo"],
                    "estado": c["estado"],
                }
                for c in todas_las_camas
            ],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al calcular estadísticas: {str(e)}")


@router.get("/diagnosticos-prevalentes")
def get_diagnosticos_prevalentes(
    _: Annotated[str, Depends(get_current_user)],
    limite: int = Query(default=10, ge=1, le=50, description="Cantidad máxima de diagnósticos a devolver"),
    periodo: Literal["day", "week", "month", "all"] = Query(
        default="all",
        description="Rango temporal: day | week | month | all",
    ),
):
    """
    Ranking de diagnósticos CIE-10 más frecuentes en internaciones.

    Agrupa por codigo_cie10, cuenta ocurrencias y devuelve ordenado de mayor a menor.
    Útil para análisis epidemiológico y detección de patrones en la UTI.
    """
    try:
        query = supabase.table("internacion").select("codigo_cie10")

        if periodo != "all":
            inicio = _inicio_periodo(periodo)
            query = query.gte("fecha_hora_ingreso", inicio.isoformat())

        resultado = query.execute()
        registros = resultado.data or []

        conteo = Counter(r["codigo_cie10"] for r in registros)
        ranking = [
            {"codigo_cie10": codigo, "total": total}
            for codigo, total in conteo.most_common(limite)
        ]

        return {
            "periodo_consultado": periodo,
            "total_registros_analizados": len(registros),
            "ranking": ranking,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al calcular diagnósticos prevalentes: {str(e)}")
