import type { EducationLevel, CollegeDepartment } from '../../api/auth'

const DEPARTMENTS: { value: CollegeDepartment; label: string }[] = [
  { value: 'CCE', label: 'CCE — College of Computing Education' },
  { value: 'CTE', label: 'CTE — College of Teacher Education' },
  { value: 'CABE', label: 'CABE — College of Accountancy & Business Education' },
  { value: 'CCJE', label: 'CCJE — College of Criminal Justice Education' },
  { value: 'TVET', label: 'TVET — Technical & Vocational Education' },
]

interface Props {
  level: EducationLevel | ''
  department: CollegeDepartment | ''
  onLevelChange: (level: EducationLevel) => void
  onDepartmentChange: (dept: CollegeDepartment | '') => void
}

export function EducationFields({ level, department, onLevelChange, onDepartmentChange }: Props) {
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
    </div>
  )
}
