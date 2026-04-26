import { useState, useEffect, type FormEvent } from 'react'
import { toast } from 'sonner'
import axios from 'axios'
import { Lock, Eye, EyeOff, User as UserIcon, Mail } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { EducationFields } from '../../components/auth/EducationFields'
import {
  me,
  updateProfile,
  changePassword,
  type EducationLevel,
  type CollegeDepartment,
  type GradeLevel,
} from '../../api/auth'

interface FullProfile {
  fullname: string
  email: string
  educationLevel: EducationLevel | ''
  collegeDepartment: CollegeDepartment | ''
  gradeLevel: GradeLevel | ''
}

export function MyAccountPage() {
  const { currentUser, role, setAuth } = useAuth()
  const [profile, setProfile] = useState<FullProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)

  // Change-password state
  const [current, setCurrent]   = useState('')
  const [newPw, setNewPw]       = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew]         = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [savingPw, setSavingPw] = useState(false)

  // Hydrate fullname/email by re-reading /me (which the backend already populates).
  // The auth context only caches id + level + dept + grade.
  useEffect(() => {
    let cancelled = false
    me()
      .then(res => {
        if (cancelled) return
        const d = res.data
        setProfile({
          fullname: d.fullname ?? '',
          email: d.email ?? '',
          educationLevel: (d.education_level as EducationLevel | undefined) ?? '',
          collegeDepartment: (d.college_department as CollegeDepartment | undefined) ?? '',
          gradeLevel: (d.grade_level as GradeLevel | undefined) ?? '',
        })
      })
      .catch(() => { if (!cancelled) toast.error('Could not load your account.') })
      .finally(() => { if (!cancelled) setProfileLoading(false) })
    return () => { cancelled = true }
  }, [])

  const onSaveProfile = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile) return
    if (!profile.educationLevel) { toast.error('Choose an education level'); return }
    if (profile.educationLevel === 'College' && !profile.collegeDepartment) {
      toast.error('Choose a department'); return
    }
    if ((profile.educationLevel === 'HS' || profile.educationLevel === 'SHS') && !profile.gradeLevel) {
      toast.error('Choose a grade'); return
    }
    setSavingProfile(true)
    try {
      await updateProfile(
        profile.educationLevel as EducationLevel,
        profile.educationLevel === 'College' ? (profile.collegeDepartment as CollegeDepartment) : null,
        profile.educationLevel !== 'College' ? (profile.gradeLevel as GradeLevel) : null,
      )
      // Refresh auth cache so other pages see the new values.
      if (currentUser) {
        setAuth({
          id: currentUser.id,
          education_level: profile.educationLevel || null,
          college_department: profile.educationLevel === 'College' ? (profile.collegeDepartment || null) : null,
          grade_level: profile.educationLevel !== 'College' ? (profile.gradeLevel || null) : null,
        }, role)
      }
      toast.success('Profile updated')
    } catch (err) {
      toast.error(axios.isAxiosError(err) ? (err.response?.data?.error ?? 'Could not update profile') : 'Something went wrong')
    } finally {
      setSavingProfile(false)
    }
  }

  const onChangePw = async (e: FormEvent) => {
    e.preventDefault()
    if (!current) { toast.error('Enter your current password'); return }
    if (newPw.length < 6) { toast.error('New password must be at least 6 characters'); return }
    if (newPw !== confirm) { toast.error('New password and confirmation do not match'); return }
    setSavingPw(true)
    try {
      await changePassword(current, newPw)
      toast.success('Password updated')
      setCurrent(''); setNewPw(''); setConfirm('')
    } catch (err) {
      const isAxios = axios.isAxiosError(err)
      if (isAxios && err.response?.status === 401) {
        toast.error('Current password is incorrect')
      } else {
        toast.error(isAxios ? (err.response?.data?.error ?? 'Could not change password') : 'Something went wrong')
      }
    } finally {
      setSavingPw(false)
    }
  }

  if (profileLoading || !profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-ascb-orange border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white font-display">My Account</h1>
        <p className="text-gray-400 text-sm font-ui mt-1">Manage your profile and password.</p>
      </div>

      {/* PROFILE CARD */}
      <form onSubmit={onSaveProfile} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6 space-y-5">
        <h2 className="text-base font-semibold text-white font-ui">Profile</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 font-ui">Full Name</label>
            <div className="relative">
              <UserIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
              <input value={profile.fullname} readOnly className="input-field pl-10 h-11 cursor-not-allowed opacity-80" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 font-ui">Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
              <input value={profile.email} readOnly className="input-field pl-10 h-11 cursor-not-allowed opacity-80" />
            </div>
          </div>
        </div>

        <p className="text-[11px] text-gray-500 font-ui -mt-2">
          Full name and email are managed by the registrar. Contact the office to change them.
        </p>

        <EducationFields
          level={profile.educationLevel}
          department={profile.collegeDepartment}
          grade={profile.gradeLevel}
          showGrade
          onLevelChange={(level) => setProfile({ ...profile, educationLevel: level })}
          onDepartmentChange={(dept) => setProfile({ ...profile, collegeDepartment: dept })}
          onGradeChange={(g) => setProfile({ ...profile, gradeLevel: g })}
        />

        <button
          type="submit"
          disabled={savingProfile}
          className="w-full sm:w-auto h-11 px-5 rounded-xl text-white font-semibold font-ui text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #F47C20 0%, #d4651a 100%)' }}
        >
          {savingProfile ? <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : 'Save changes'}
        </button>
      </form>

      {/* CHANGE PASSWORD CARD */}
      <form onSubmit={onChangePw} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6 space-y-5">
        <h2 className="text-base font-semibold text-white font-ui">Change Password</h2>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 font-ui">Current password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                type={showCurrent ? 'text' : 'password'}
                value={current}
                onChange={e => setCurrent(e.target.value)}
                className="input-field pl-10 pr-11 h-11"
                autoComplete="current-password"
              />
              <button type="button" tabIndex={-1} onClick={() => setShowCurrent(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 p-0.5">
                {showCurrent ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 font-ui">New password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                type={showNew ? 'text' : 'password'}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="At least 6 characters"
                className="input-field pl-10 pr-11 h-11"
                autoComplete="new-password"
              />
              <button type="button" tabIndex={-1} onClick={() => setShowNew(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 p-0.5">
                {showNew ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 font-ui">Confirm new password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="input-field pl-10 pr-11 h-11"
                autoComplete="new-password"
              />
              <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 p-0.5">
                {showConfirm ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={savingPw}
          className="w-full sm:w-auto h-11 px-5 rounded-xl text-white font-semibold font-ui text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #F47C20 0%, #d4651a 100%)' }}
        >
          {savingPw ? <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : 'Update password'}
        </button>
      </form>
    </div>
  )
}
