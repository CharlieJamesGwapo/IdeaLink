import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { AuthProvider, useAuthContext } from './AuthContext'
import * as authApi from '../api/auth'

vi.mock('../api/auth')

function TestComponent() {
  const { currentUser, role, isLoading } = useAuthContext()
  if (isLoading) return <div>Loading</div>
  if (!currentUser) return <div>Guest</div>
  return <div>Role: {role}</div>
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows Guest when /me returns 401', async () => {
    vi.mocked(authApi.me).mockRejectedValue({ response: { status: 401 } })
    render(<AuthProvider><TestComponent /></AuthProvider>)
    await waitFor(() => expect(screen.getByText('Guest')).toBeInTheDocument())
  })

  it('restores session when /me succeeds', async () => {
    vi.mocked(authApi.me).mockResolvedValue({
      data: { user_id: 1, role: 'user' },
    } as any)
    render(<AuthProvider><TestComponent /></AuthProvider>)
    await waitFor(() => expect(screen.getByText('Role: user')).toBeInTheDocument())
  })
})
