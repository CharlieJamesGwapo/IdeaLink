import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import axios from 'axios'
import { EducationFields } from '../../components/auth/EducationFields'
import { completeProfile, type EducationLevel, type CollegeDepartment } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'

export function CompleteProfilePage() {
  const navigate = useNavigate()
  const { currentUser, role, setAuth } = useAuth()
  const [level, setLevel] = useState<EducationLevel | ''>('')
  const [dept, setDept] = useState<CollegeDepartment | ''>('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!level) { toast.error('Please select your education level'); return }
    if (level === 'College' && !dept) { toast.error('Please select your department'); return }
    if (!currentUser) return
    setIsLoading(true)
    try {
      const res = await completeProfile(level as EducationLevel, level === 'College' ? (dept as CollegeDepartment) : null)
      setAuth({
        id: currentUser.id,
        education_level: (res.data as { education_level?: string | null }).education_level ?? level,
        college_department: (res.data as { college_department?: string | null }).college_department ?? (level === 'College' ? dept : null),
      }, role)
      toast.success('Profile updated')
      navigate('/user/submit')
    } catch (err) {
      toast.error(axios.isAxiosError(err) ? (err.response?.data?.error ?? 'Could not save profile') : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <h2 className="text-[2rem] font-bold text-white font-display leading-tight">Complete your profile</h2>
        <p className="text-gray-500 text-sm font-body mt-1.5">
          Tell us about your education so we can route your feedback correctly.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 mt-7">
          <EducationFields
            level={level}
            department={dept}
            onLevelChange={setLevel}
            onDepartmentChange={setDept}
          />

          <button
            type="submit"
            disabled={isLoading}
            className="relative mt-2 w-full h-11 rounded-xl text-white font-semibold font-ui text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #F47C20 0%, #d4651a 100%)' }}
          >
            {isLoading
              ? <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              : 'Save and continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
