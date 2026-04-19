export interface User {
  id: number
  email: string
  fullname: string
  last_announcement_view: string
  created_at: string
}

export interface AdminAccount {
  id: number
  email: string
  fullname: string
}

export interface StaffAccount {
  id: number
  email: string
}

export type AuthUser =
  | { role: 'user'; data: User }
  | { role: 'admin'; data: AdminAccount }
  | { role: 'registrar'; data: StaffAccount }
  | { role: 'accounting'; data: StaffAccount }

export interface Suggestion {
  id: number
  user_id: number
  department: string
  service_category: string
  user_role?: string
  title: string
  description: string
  status: 'Delivered' | 'Reviewed'
  rating?: number | null
  anonymous: boolean
  is_read: boolean
  status_seen_by_user?: boolean
  submitted_at: string
  submitter_name?: string
}

export interface Announcement {
  id: number
  admin_id: number
  title: string
  message: string
  date_posted: string
}

export interface Testimonial {
  id: number
  suggestion_id: number | null
  name: string
  department: string
  message: string
  is_active: boolean
  created_at: string
}

export interface Analytics {
  total_users: number
  total_suggestions: number
  this_month_suggestions: number
  unread_suggestions: number
  student_count: number
  faculty_count: number
  by_department: { department: string; count: number }[]
  by_status: { status: string; count: number }[]
  monthly_trend: { month: string; count: number }[]
  by_category_registrar: { category: string; count: number }[]
  by_category_accounting: { category: string; count: number }[]
}

export interface Highlight {
  id: number
  suggestion_id: number
  created_by: number
  created_at: string
  expires_at: string
  react_count: number
  viewer_reacted: boolean
  suggestion: Suggestion
}

export interface OfficeHoursStatus {
  department: string
  is_open: boolean
  closure_reason?: string
  closed_until?: string
  updated_at?: string
}
