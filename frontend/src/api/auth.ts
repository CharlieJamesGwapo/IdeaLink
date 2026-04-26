import client from './client'

export type EducationLevel = 'HS' | 'SHS' | 'College'
export type CollegeDepartment = 'CCE' | 'CTE' | 'CABE' | 'CCJE' | 'TVET'

export interface MeResponse {
  user_id: number
  role: string
  education_level?: string | null
  college_department?: string | null
  grade_level?: string | null
}

export const signup = (
  email: string,
  password: string,
  fullname: string,
  educationLevel: EducationLevel,
  collegeDepartment: CollegeDepartment | null,
) =>
  client.post('/api/auth/signup', {
    email,
    password,
    fullname,
    education_level: educationLevel,
    college_department: collegeDepartment,
  })

interface LoginResponse {
  id: number
  role?: string
  education_level?: string | null
  college_department?: string | null
}

export const login = (email: string, password: string) =>
  client.post<LoginResponse>('/api/auth/login', { email, password })

export const adminLogin = (email: string, password: string) =>
  client.post<LoginResponse>('/api/auth/admin/login', { email, password })

export const registrarLogin = (email: string, password: string) =>
  client.post<LoginResponse>('/api/auth/registrar/login', { email, password })

export const accountingLogin = (email: string, password: string) =>
  client.post<LoginResponse>('/api/auth/accounting/login', { email, password })

export const logout = () => client.post('/api/auth/logout')

export const me = () => client.get<MeResponse>('/api/auth/me')

export const forgotPassword = (email: string) =>
  client.post('/api/auth/forgot-password', { email })

export const resetPassword = (token: string, newPassword: string) =>
  client.post('/api/auth/reset-password', { token, new_password: newPassword })

export const completeProfile = (
  educationLevel: EducationLevel,
  collegeDepartment: CollegeDepartment | null,
) =>
  client.post('/api/auth/complete-profile', {
    education_level: educationLevel,
    college_department: collegeDepartment,
  })

export type GradeLevel = '7' | '8' | '9' | '10' | '11' | '12'

export const updateProfile = (
  educationLevel: EducationLevel,
  collegeDepartment: CollegeDepartment | null,
  gradeLevel: GradeLevel | null,
) =>
  client.patch('/api/auth/profile', {
    education_level: educationLevel,
    college_department: collegeDepartment,
    grade_level: gradeLevel,
  })

export const changePassword = (currentPassword: string, newPassword: string) =>
  client.post('/api/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  })
