# Contrato de API: Gestión de Camas

## Objetivo
Crear el endpoint `PATCH /api/camas/{cama_id}/estado` para permitir al personal actualizar el estado operativo de una cama (por ejemplo, pasarla de 'Limpieza' a 'Disponible').

## Ubicación
Crear un nuevo archivo: `/backend/api/routes/camas.py`
Añadir esquemas al archivo existente: `/backend/api/schemas.py`
Registrar el router en `main.py`.

## Modelos Pydantic (Esquemas de Entrada)
Agregar en `/backend/api/schemas.py`:
- `EstadoCamaPayload`:
  - `estado` (Literal['Disponible', 'Ocupada', 'Limpieza', 'Mantenimiento'])

## Lógica del Endpoint
El endpoint recibe el `cama_id` por la URL y el nuevo estado en el body.
1. **Validar Cama:** Consultar `cama` por `id`. Si no existe, devolver `HTTP 404`.
2. **Actualizar:** Hacer un UPDATE en la tabla `cama` cambiando el `estado` al valor recibido.
3. **Retorno:** Devolver un JSON confirmando el nuevo estado.