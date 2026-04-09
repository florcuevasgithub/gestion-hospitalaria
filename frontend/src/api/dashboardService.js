import apiClient from './client'

export const getDashboardStats = (periodo = 'month') =>
  apiClient.get(`/dashboard/stats?periodo=${periodo}`).then((res) => res.data)

export const getDiagnosticosPrevalentes = (periodo = 'all', limite = 10) =>
  apiClient
    .get(`/dashboard/diagnosticos-prevalentes?periodo=${periodo}&limite=${limite}`)
    .then((res) => res.data)
