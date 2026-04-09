import apiClient from './client'

export const registrarIngreso = (payload) =>
  apiClient.post('/internaciones/ingreso', payload).then((res) => res.data)

export const registrarEgreso = (internacionId, payload) =>
  apiClient.post(`/internaciones/${internacionId}/egreso`, payload).then((res) => res.data)

export const getCamasDisponibles = () =>
  apiClient.get('/camas/disponibles').then((res) => res.data)

export const actualizarEstadoCama = (camaId, estado) =>
  apiClient.patch(`/camas/${camaId}/estado`, { estado }).then((res) => res.data)
