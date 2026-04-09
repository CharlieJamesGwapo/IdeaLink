import client from './client'

export const signup = (email: string, password: string, fullname: string) =>
  client.post('/api/auth/signup', { email, password, fullname })

export const login = (email: string, password: string) =>
  client.post('/api/auth/login', { email, password })

export const adminLogin = (email: string, password: string) =>
  client.post('/api/auth/admin/login', { email, password })

export const registrarLogin = (username: string, password: string) =>
  client.post('/api/auth/registrar/login', { username, password })

export const accountingLogin = (username: string, password: string) =>
  client.post('/api/auth/accounting/login', { username, password })

export const logout = () => client.post('/api/auth/logout')

export const me = () => client.get<{ user_id: number; role: string }>('/api/auth/me')
