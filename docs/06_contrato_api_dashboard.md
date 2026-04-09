# Contrato de API: Dashboard y KPIs

## Objetivo
Crear el endpoint `GET /api/dashboard/stats` que devuelva un resumen procesado de la situación de la UTI para visualización inmediata.

## Ubicación
Crear un nuevo archivo: `/backend/api/routes/dashboard.py`
Registrar el router en `main.py`.

## Lógica del Endpoint
El endpoint debe realizar tres consultas a Supabase:
1. **Estado de Camas:** Contar cuántas hay en cada estado (Disponible, Ocupada, Limpieza, Mantenimiento).
2. **Histórico de Internaciones:** Traer los registros que tengan `fecha_hora_egreso` (para calcular mortalidad y estancia).
3. **Cálculos en Python:**
   - **Tasa de Mortalidad:** `(Defunciones / Total Egresos) * 100`.
   - **Estancia Media:** Promedio de horas/días entre ingreso y egreso de los pacientes ya egresados.
   - **Disponibilidad:** Porcentaje de camas 'Disponible'.

## Retorno (Ejemplo de JSON)
{
  "camas": { "total": 40, "disponibles": 5, "ocupadas": 30, "limpieza": 3, "mantenimiento": 2 },
  "kpis": {
    "tasa_mortalidad": 15.4,
    "promedio_estancia_dias": 4.2,
    "ocupacion_porcentaje": 75.0
  }
}
## Nuevos Requerimientos
1. **Diferenciación KPC:** Las camas deben filtrarse por tipo (en la tabla `cama` usaremos una columna `es_kpc` o similar).
2. **Estancia por Registro:** El JSON debe incluir una lista de "Últimos Movimientos" que detalle: `paciente`, `cama_id`, `dias_estancia` y `tipo_cama`.
3. **Filtros Temporales:** El endpoint debe aceptar parámetros `?periodo=dia|semana|mes` para calcular la ocupación histórica.

## Lógica de Cálculos (Backend)
- **Días de Estancia:** Si la internación está abierta, calcular `now() - fecha_ingreso`. Si está cerrada, usar `fecha_egreso - fecha_ingreso`.
- **Filtro KPC:** Separar los KPIs en dos objetos: `comunes` y `kpc`.
- **Ocupación Histórica:** Consultar la tabla de internaciones filtrando por el rango de tiempo solicitado para ver cuántas camas estuvieron ocupadas en ese periodo.