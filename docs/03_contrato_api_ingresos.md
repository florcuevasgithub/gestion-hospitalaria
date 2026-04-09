# Contrato de API: Ingreso de Pacientes (Internación)

## Objetivo
Crear el endpoint `POST /api/internaciones/ingreso` que gestione la lógica completa de admitir a un paciente en la UTI, interactuando con múltiples tablas en Supabase.

## Ubicación
Crear un nuevo archivo: `/backend/api/routes/internaciones.py`
Asegurarse de registrar este nuevo router en `main.py`.

## Modelos Pydantic (Esquemas de Entrada)
Crear los modelos en un archivo `/backend/api/schemas.py`:
- `PacienteIngresoPayload`: 
  - `dni` (str)
  - `nombre` (str)
  - `apellido` (str)
  - `fecha_nacimiento` (date)
  - `sexo_biologico` (str)
  - `cama_id` (int)
  - `codigo_cie10` (str)
  - `procedencia` (str)
  - `personal_ingreso_id` (UUID)

## Lógica del Endpoint (Transacción Secuencial)
El endpoint debe realizar los siguientes pasos usando el `supabase_client`:
1. **Buscar Paciente:** Consultar `paciente_boveda` por `dni`.
2. **Crear Paciente (si no existe):** Si el DNI no está, insertar los datos demográficos y obtener el `uuid_paciente` generado. Si ya existe, usar el `uuid_paciente` recuperado.
3. **Validar Cama:** Consultar la tabla `cama` por `cama_id`. Si el estado no es 'Disponible', lanzar `HTTPException 400 ("La cama no está disponible")`.
4. **Registrar Internación:** Insertar un registro en la tabla `internacion` con el `uuid_paciente`, `cama_id`, `codigo_cie10`, `procedencia` y `personal_ingreso_id`.
5. **Actualizar Cama:** Hacer un UPDATE en la tabla `cama` cambiando el `estado` a 'Ocupada'.
6. **Retorno:** Devolver un JSON de éxito con el ID de la internación generada.

*Nota para IA:* Manejar excepciones generales con try/except y devolver errores HTTP 500 si falla la comunicación con Supabase.