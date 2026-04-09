import apiClient from './client'

export const getOpciones = () =>
  apiClient.get('/metadata/opciones').then((res) => res.data)

export const buscarCIE10 = (query) =>
  apiClient.get(`/metadata/cie10?search=${encodeURIComponent(query)}`).then((res) => res.data)

export const getCatalogoCIE10 = () =>
  apiClient.get('/metadata/cie10/catalogo').then((res) => res.data)
