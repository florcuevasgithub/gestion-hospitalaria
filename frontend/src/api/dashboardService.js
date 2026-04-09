import apiClient from './client'

export const getDashboardStats = (periodo = 'month') =>
  apiClient.get(`/dashboard/stats?periodo=${periodo}`).then((res) => res.data)
