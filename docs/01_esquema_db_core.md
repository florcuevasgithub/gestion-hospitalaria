# Esquema de Base de Datos - MVP Gestión Hospitalaria (UTI)

## 1. Gestión de Usuarios y Personal
Dependemos de `auth.users` de Supabase para la autenticación pura (email/password). Nuestra tabla extiende esa información.

**Tabla: `personal_salud`**
* `id` (UUID, Primary Key, Foreign Key -> auth.users.id)
* `nombre_completo` (VARCHAR)
* `rol` (VARCHAR) -> Valores permitidos por ahora: 'ADMIN_MVP'. Preparado para el futuro: 'MEDICO', 'ENFERMERO'.
* `activo` (BOOLEAN) -> Default: true.

## 2. Bóveda de Pacientes (Datos Sensibles)
Aislamos los datos demográficos para pseudo-anonimizar las operaciones clínicas.

**Tabla: `paciente_boveda`**
* `uuid_paciente` (UUID, Primary Key, auto-generado)
* `dni` (VARCHAR, Unique, Indexed)
* `nombre` (VARCHAR)
* `apellido` (VARCHAR)
* `fecha_nacimiento` (DATE)
* `sexo_biologico` (VARCHAR)

## 3. Infraestructura Física
Modelado escalable para expandir de la UTI a todo el hospital.

**Tabla: `sector`**
* `id` (SERIAL, Primary Key)
* `nombre` (VARCHAR) -> Ej: 'UTI', 'Piso 1'.

**Tabla: `cama`**
* `id` (SERIAL, Primary Key)
* `sector_id` (Integer, Foreign Key -> sector.id)
* `codigo_cama` (VARCHAR) -> Ej: 'UTI-01', 'UTI-02'.
* `tipo` (VARCHAR) -> Ej: 'Comun', 'KPC'.
* `estado` (VARCHAR) -> Valores permitidos: 'Disponible', 'Ocupada', 'Limpieza', 'Mantenimiento'.

## 4. Flujo Clínico (Internaciones)
El núcleo transaccional para calcular métricas (estadía, recambio, mortalidad).

**Tabla: `internacion`**
* `id` (UUID, Primary Key, auto-generado)
* `uuid_paciente` (UUID, Foreign Key -> paciente_boveda.uuid_paciente)
* `cama_id` (Integer, Foreign Key -> cama.id)
* `codigo_cie10` (VARCHAR) -> El diagnóstico de ingreso (se cruzará en el front con nuestro catálogo local).
* `fecha_hora_ingreso` (TIMESTAMP WITH TIME ZONE) -> Default: NOW().
* `procedencia` (VARCHAR) -> Ej: 'Guardia', 'Derivado', 'Quirófano'.
* `fecha_hora_egreso` (TIMESTAMP WITH TIME ZONE, Nullable) -> Se llena al dar el alta o defunción.
* `tipo_egreso` (VARCHAR, Nullable) -> Valores: 'Alta Médica', 'Defunción', 'Derivación'.
* `personal_ingreso_id` (UUID, Foreign Key -> personal_salud.id) -> Trazabilidad de quién lo ingresó.