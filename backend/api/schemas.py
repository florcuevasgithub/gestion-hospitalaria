from datetime import date
from pydantic import BaseModel
from typing import Literal


class PacienteIngresoPayload(BaseModel):
    dni: str
    nombre: str
    apellido: str
    fecha_nacimiento: date
    sexo_biologico: Literal["Masculino", "Femenino", "Intersex", "No especificado"]
    cama_id: int
    codigo_cie10: str
    procedencia: Literal["Guardia", "Derivado", "Quirófano", "Piso", "Ambulancia", "Otro Hospital"]
    # personal_ingreso_id se extrae del JWT en el backend; no se envía en el body


class EgresoPayload(BaseModel):
    tipo_egreso: Literal["Alta Médica", "Defunción", "Derivación"]


class EstadoCamaPayload(BaseModel):
    estado: Literal["Disponible", "Ocupada", "Limpieza", "Mantenimiento"]
