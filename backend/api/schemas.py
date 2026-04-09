from datetime import date
from pydantic import BaseModel, model_validator
from typing import Literal, Optional


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
    tipo_egreso: Literal["Alta Médica", "Defunción", "Derivación", "Cambio de Cama (Falla Técnica)"]
    nueva_cama_id: Optional[int] = None
    destino_derivacion: Optional[str] = None

    @model_validator(mode="after")
    def validar_campos_condicionales(self) -> "EgresoPayload":
        if self.tipo_egreso == "Cambio de Cama (Falla Técnica)" and self.nueva_cama_id is None:
            raise ValueError("nueva_cama_id es obligatorio para un Cambio de Cama.")
        if self.tipo_egreso != "Cambio de Cama (Falla Técnica)" and self.nueva_cama_id is not None:
            raise ValueError("nueva_cama_id solo aplica para Cambio de Cama (Falla Técnica).")
        if self.tipo_egreso != "Derivación" and self.destino_derivacion is not None:
            raise ValueError("destino_derivacion solo aplica para Derivación.")
        return self


class EstadoCamaPayload(BaseModel):
    estado: Literal["Disponible", "Ocupada", "Limpieza", "Mantenimiento"]
