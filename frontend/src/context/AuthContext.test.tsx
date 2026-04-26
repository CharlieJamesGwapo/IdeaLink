import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { AuthProvider, useAuthContext } from './AuthContext'
import * as authApi from '../api/auth'

vi.mock('../api/auth')

function TestComponent() {
  const { currentUser, role, isLoading } = useAuthContext()
  if (isLoading) return <div>Loading</div>
  if (!currentUser) return <div>Guest</div>
  return <div>Role: {role} | EL: {currentUser.education_level ?? 'null'}</div>
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('shows Guest when /me returns 401', async () => {
    vi.mocked(authApi.me).mockRejectedValue({ response: { status: 401 } })
    render(<AuthProvider><TestComponent /></AuthProvider>)
    await waitFor(() => expect(screen.getByText('Guest')).toBeInTheDocument())
  })

  it('restores session when /me succeeds', async () => {
    vi.mocked(authApi.me).mockResolvedValue({
      data: { user_id: 1, role: 'user', education_level: 'College', college_department: 'CCE' },
    } as any)
    render(<AuthProvider><TestComponent /></AuthProvider>)
    await waitFor(() => expect(screen.getByText(/Role: user/)).toBeInTheDocument())
  })

  // Reproduces the "Complete your profile keeps coming back" bug:
  // /me succeeds but omits education_level (e.g. GetUserByID failed server-side).
  // The cached good value must NOT be overwritten with null, otherwise the
  // profile gate reactivates on every reload.
  it('preserves cached education_level when /me omits the field', async () => {
    localStorage.setItem(
      'idealink_auth',
      JSON.stringify({
        user: { id: 1, education_level: 'College', college_department: 'CCE' },
        role: 'user',
      }),
    )
    vi.mocked(authApi.me).mockResolvedValue({
      data: { user_id: 1, role: 'user' },
    } as any)
    render(<AuthProvider><TestComponent /></AuthProvider>)
    await waitFor(() => expect(screen.getByText(/Role: user/)).toBeInTheDocument())
    expect(screen.getByText(/EL: College/)).toBeInTheDocument()
  })

  // B1 regression: only an explicit 401 should clear cached auth. Network
  // errors and 5xx mean the server is currently unreachable, not that the
  // user logged out — keeping the cache prevents the immediate-logout bug.
  it('keeps cached auth when /me rejects with a network error', async () => {
    localStorage.setItem(
      'idealink_auth',
      JSON.stringify({
        user: { id: 42, education_level: 'HS', college_department: null, grade_level: '9' },
        role: 'user',
      }),
    )
    vi.mocked(authApi.me).mockRejectedValue(Object.assign(new Error('Network Error'), { request: {} }))
    render(<AuthProvider><TestComponent /></AuthProvider>)
    await waitFor(() => expect(screen.getByText(/Role: user/)).toBeInTheDocument())
  })

  it('keeps cached auth when /me rejects with a 5xx', async () => {
    localStorage.setItem(
      'idealink_auth',
      JSON.stringify({
        user: { id: 42, education_level: 'HS', college_department: null, grade_level: '9' },
        role: 'user',
      }),
    )
    vi.mocked(authApi.me).mockRejectedValue({ response: { status: 502, data: 'Bad Gateway' } })
    render(<AuthProvider><TestComponent /></AuthProvider>)
    await waitFor(() => expect(screen.getByText(/Role: user/)).toBeInTheDocument())
  })

  it('clears cached auth when /me rejects with a 401', async () => {
    localStorage.setItem(
      'idealink_auth',
      JSON.stringify({
        user: { id: 42, education_level: 'HS', college_department: null, grade_level: '9' },
        role: 'user',
      }),
    )
    vi.mocked(authApi.me).mockRejectedValue({ response: { status: 401 } })
    render(<AuthProvider><TestComponent /></AuthProvider>)
    await waitFor(() => expect(screen.getByText('Guest')).toBeInTheDocument())
  })
})
