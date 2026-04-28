import type { EducationLevel, CollegeDepartment, GradeLevel } from '../../api/auth'

// TVET removed from the picker per school request (2026-04-29). The
// CollegeDepartment type still includes it so any pre-existing account
// rows with department='TVET' continue to validate; new signups just
// won't see it as an option.
const DEPARTMENTS: { value: CollegeDepartment; label: string }[] = [
  { value: 'CCE', label: 'CCE — College of Computing Education' },
  { value: 'CTE', label: 'CTE — College of Teacher Education' },
  { value: 'CABE', label: 'CABE — College of Accountancy & Business Education' },
  { value: 'CCJE', label: 'CCJE — College of Criminal Justice Education' },
]

const HS_GRADES: GradeLevel[]  = ['7', '8', '9', '10']
const SHS_GRADES: GradeLevel[] = ['11', '12']

interface Props {
  level: EducationLevel | ''
  department: CollegeDepartment | ''
  grade?: GradeLevel | ''
  showGrade?: boolean
  onLevelChange: (level: EducationLevel) => void
  onDepartmentChange: (dept: CollegeDepartment | '') => void
  onGradeChange?: (grade: GradeLevel | '') => void
}

export function EducationFields({
  level,
  department,
  grade = '',
  showGrade = false,
  onLevelChange,
  onDepartmentChange,
  onGradeChange,
}: Props) {
  const grades =
    level === 'HS'  ? HS_GRADES
    : level === 'SHS' ? SHS_GRADES
    : []

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-400 font-ui">Education Level</label>
        <div className="grid grid-cols-3 gap-2">
          {(['HS', 'SHS', 'College'] as EducationLevel[]).map(opt => {
            const selected = level === opt
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onLevelChange(opt)
                  if (opt !== 'College') onDepartmentChange('')
                  if (opt === 'College' && onGradeChange) onGradeChange('')
                }}
                className={`h-11 rounded-xl font-ui text-sm font-semibold transition-all duration-200 border ${
                  selected
                    ? 'bg-ascb-orange/15 border-ascb-orange text-white'
                    : 'bg-white/[0.04] border-white/8 text-gray-400 hover:text-white hover:border-white/20'
                }`}
              >
                {opt}
              </button>
            )
          })}
        </div>
      </div>

      {level === 'College' && (
        <div className="space-y-1.5 animate-fade-in">
          <label className="block text-xs font-semibold text-gray-400 font-ui">Department</label>
          <select
            value={department}
            onChange={e => onDepartmentChange(e.target.value as CollegeDepartment | '')}
            className="input-field h-11 w-full"
          >
            <option value="">Select department…</option>
            {DEPARTMENTS.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
      )}

      {showGrade && grades.length > 0 && onGradeChange && (
        <div className="space-y-1.5 animate-fade-in">
          <label className="block text-xs font-semibold text-gray-400 font-ui">Grade Level</label>
          <select
            value={grade}
            onChange={e => onGradeChange(e.target.value as GradeLevel | '')}
            className="input-field h-11 w-full"
          >
            <option value="">Select grade…</option>
            {grades.map(g => (
              <option key={g} value={g}>Grade {g}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
