# Contrato de API: Egreso de Pacientes (Alta / Defunción / Derivación)

## Objetivo
Crear el endpoint `POST /api/internaciones/{internacion_id}/egreso` para cerrar el ciclo clínico de un paciente en la UTI y liberar su cama, pasándola automáticamente a estado de limpieza.

## Ubicación
Modificar el archivo existente: `/backend/api/routes/internaciones.py`
Añadir esquemas al archivo existente: `/backend/api/schemas.py`

## Modelos Pydantic (Esquemas de Entrada)
Agregar en `/backend/api/schemas.py`:
- `EgresoPayload`:
  - `tipo_egreso` (Literal['Alta Medica', 'Defuncion', 'Derivacion'])

## Lógica del Endpoint (Transacción Secuencial)
El endpoint debe recibir el `internacion_id` por la URL (Path parameter) y realizar los siguientes pasos usando el `supabase_client`:
1. **Validar Internación:** Buscar el registro en la tabla `internacion` por el `id`. Si no existe, devolver `HTTP 404`. Si ya tiene un `fecha_hora_egreso` asignado, devolver `HTTP 400 ("La internación ya fue cerrada")`.
2. **Obtener Cama:** Extraer el `cama_id` de la internación encontrada.
3. **Cerrar Internación:** Hacer un UPDATE en `internacion` usando el `internacion_id`. Setear:
   - `tipo_egreso` con el valor recibido en el payload.
   - `fecha_hora_egreso` con la fecha y hora actual en formato ISO.
4. **Liberar Cama:** Hacer un UPDATE en la tabla `cama` (usando el `cama_id` recuperado). Cambiar su `estado` a `'Limpieza'`.
5. **Retorno:** Devolver un JSON de éxito con un mensaje confirmando el egreso y recordando que la cama pasó a limpieza.