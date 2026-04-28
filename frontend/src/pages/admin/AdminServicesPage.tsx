import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import axios from 'axios'
import { Plus, Pencil, Search, Power, RotateCcw } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Skeleton } from '../../components/ui/Skeleton'
import { ServiceIcon, ICON_CHOICES, type IconName } from '../../lib/serviceIcons'
import {
  adminListServices,
  createService,
  updateService,
  disableService,
  type Service,
  type Department,
} from '../../api/services'

const DEPTS: Department[] = ['Registrar Office', 'Finance Office']

export function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState<'all' | Department>('all')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'disabled'>('active')

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [formDept, setFormDept] = useState<Department>('Registrar Office')
  const [formLabel, setFormLabel] = useState('')
  const [formIcon, setFormIcon] = useState<IconName>('HelpCircle')
  const [formOrder, setFormOrder] = useState<number>(0)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState<number | null>(null)

  const refetch = async () => {
    setLoading(true)
    try {
      const res = await adminListServices()
      setServices(res.data)
    } catch {
      toast.error('Could not load services')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refetch() }, [])

  const filtered = useMemo(() => {
    return services
      .filter(s => deptFilter === 'all' || s.department === deptFilter)
      .filter(s =>
        activeFilter === 'all'
          ? true
          : activeFilter === 'active' ? s.is_active : !s.is_active,
      )
      .filter(s => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return s.label.toLowerCase().includes(q) || s.department.toLowerCase().includes(q)
      })
      .sort((a, b) => {
        if (a.department !== b.department) return a.department.localeCompare(b.department)
        if (a.display_order !== b.display_order) return a.display_order - b.display_order
        return a.label.localeCompare(b.label)
      })
  }, [services, deptFilter, activeFilter, search])

  const openCreate = (preselectDept?: Department) => {
    setEditing(null)
    setFormDept(preselectDept ?? 'Registrar Office')
    setFormLabel('')
    setFormIcon('HelpCircle')
    // Suggest the next display_order so new entries land at the bottom of their dept.
    const sameDept = services.filter(s => s.department === (preselectDept ?? 'Registrar Office'))
    const nextOrder = sameDept.length === 0 ? 1 : Math.max(...sameDept.map(s => s.display_order)) + 1
    setFormOrder(nextOrder)
    setModalOpen(true)
  }

  const openEdit = (s: Service) => {
    setEditing(s)
    setFormDept(s.department)
    setFormLabel(s.label)
    setFormIcon((ICON_CHOICES as readonly string[]).includes(s.icon_name) ? (s.icon_name as IconName) : 'HelpCircle')
    setFormOrder(s.display_order)
    setModalOpen(true)
  }

  const handleSave = async () => {
    const label = formLabel.trim()
    if (label.length < 2) { toast.error('Label must be at least 2 characters'); return }
    if (label.length > 100) { toast.error('Label must be 100 characters or less'); return }
    if (!Number.isFinite(formOrder) || formOrder < 0) { toast.error('Display order must be a non-negative number'); return }

    setSaving(true)
    try {
      if (editing) {
        const patch: Record<string, unknown> = {}
        if (formDept !== editing.department)       patch.department    = formDept
        if (label !== editing.label)               patch.label         = label
        if (formIcon !== editing.icon_name)        patch.icon_name     = formIcon
        if (formOrder !== editing.display_order)   patch.display_order = formOrder
        if (Object.keys(patch).length === 0) {
          toast.message('No changes to save')
          setModalOpen(false)
          return
        }
        await updateService(editing.id, patch)
        toast.success('Service updated')
      } else {
        await createService({ department: formDept, label, icon_name: formIcon, display_order: formOrder })
        toast.success('Service created')
      }
      setModalOpen(false)
      refetch()
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.status === 409
            ? 'A service with that label already exists in this department'
            : (err.response?.data?.error as string | undefined) ?? 'Save failed')
        : 'Save failed'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (s: Service) => {
    setToggling(s.id)
    try {
      if (s.is_active) {
        await disableService(s.id)
        toast.success(`"${s.label}" disabled`)
      } else {
        await updateService(s.id, { is_active: true })
        toast.success(`"${s.label}" re-enabled`)
      }
      refetch()
    } catch {
      toast.error('Could not change status')
    } finally {
      setToggling(null)
    }
  }

  const counts = useMemo(() => ({
    total:    services.length,
    active:   services.filter(s => s.is_active).length,
    disabled: services.filter(s => !s.is_active).length,
  }), [services])

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-8 bg-ascb-orange rounded-full" />
            <h1 className="text-2xl font-bold text-white font-display">Services</h1>
          </div>
          <p className="text-gray-500 text-sm mt-1 ml-3 font-ui">
            {counts.total} total · {counts.active} active · {counts.disabled} disabled
          </p>
        </div>
        <Button onClick={() => openCreate()}>
          <Plus size={16} /> New Service
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search services…"
            className="input-field pl-9 text-sm"
            style={{ height: '40px' }}
          />
        </div>
        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value as 'all' | Department)}
          className="input-field text-sm"
          style={{ height: '40px', background: 'rgba(13,31,60,0.85)' }}
        >
          <option value="all">All Offices</option>
          {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.03] p-0.5">
          {(['active', 'all', 'disabled'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFilter(f)}
              className={`px-3 h-9 rounded-lg text-xs font-ui font-semibold transition-colors ${
                activeFilter === f
                  ? 'bg-ascb-orange/20 text-ascb-orange'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {f === 'active' ? 'Active' : f === 'disabled' ? 'Disabled' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center">
          <p className="text-sm text-gray-400 font-ui">
            {services.length === 0 ? 'No services yet — click "New Service" to add the first one.' : 'No services match your filters.'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/8 bg-white/[0.02]">
                <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-gray-500 font-ui font-semibold">Icon</th>
                <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-gray-500 font-ui font-semibold">Label</th>
                <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-gray-500 font-ui font-semibold hidden sm:table-cell">Department</th>
                <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-gray-500 font-ui font-semibold hidden md:table-cell">Order</th>
                <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-gray-500 font-ui font-semibold">Status</th>
                <th className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-gray-500 font-ui font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${s.is_active ? 'bg-ascb-orange/15 text-ascb-orange' : 'bg-white/5 text-gray-500'}`}>
                      <ServiceIcon name={s.icon_name} size={16} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className={`text-sm font-medium font-ui ${s.is_active ? 'text-white' : 'text-gray-500 line-through'}`}>{s.label}</p>
                    <p className="sm:hidden text-[11px] text-gray-500 font-ui mt-0.5">{s.department}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-ascb-navy-dark border border-white/10 text-gray-400 font-ui whitespace-nowrap">
                      {s.department}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-gray-400 font-ui tabular-nums">{s.display_order}</span>
                  </td>
                  <td className="px-4 py-3">
                    {s.is_active ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/30 text-green-300 font-ui font-semibold uppercase tracking-wider">Active</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-500 font-ui font-semibold uppercase tracking-wider">Disabled</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        title="Edit"
                        aria-label="Edit"
                        className="p-1.5 rounded-lg text-gray-500 hover:text-ascb-orange hover:bg-ascb-orange/10 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(s)}
                        disabled={toggling === s.id}
                        title={s.is_active ? 'Disable' : 'Re-enable'}
                        aria-label={s.is_active ? 'Disable' : 'Re-enable'}
                        className={`p-1.5 rounded-lg transition-colors ${s.is_active ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-500 hover:text-green-400 hover:bg-green-500/10'} disabled:opacity-50`}
                      >
                        {s.is_active ? <Power size={14} /> : <RotateCcw size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Service' : 'New Service'}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 font-ui">Department</label>
            <div className="grid grid-cols-2 gap-2">
              {DEPTS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setFormDept(d)}
                  className={`h-11 rounded-xl border text-sm font-ui font-semibold transition-all ${
                    formDept === d
                      ? 'bg-ascb-orange/15 border-ascb-orange text-white'
                      : 'bg-white/[0.04] border-white/8 text-gray-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 font-ui">Label</label>
            <input
              type="text"
              value={formLabel}
              onChange={e => setFormLabel(e.target.value)}
              placeholder="e.g. Tuition Fee Payment"
              maxLength={100}
              className="input-field h-11"
            />
            <p className="text-[10px] text-gray-500 font-ui text-right">{formLabel.length}/100</p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 font-ui">Icon</label>
            <div className="grid grid-cols-5 gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/8">
              {ICON_CHOICES.map(name => {
                const selected = formIcon === name
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setFormIcon(name)}
                    title={name}
                    className={`aspect-square rounded-lg flex items-center justify-center transition-all border ${
                      selected
                        ? 'bg-ascb-orange/20 border-ascb-orange text-ascb-orange'
                        : 'bg-white/[0.03] border-transparent text-gray-400 hover:bg-white/8 hover:text-white'
                    }`}
                  >
                    <ServiceIcon name={name} size={18} />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 font-ui">Display order</label>
            <input
              type="number"
              min={0}
              value={formOrder}
              onChange={e => setFormOrder(parseInt(e.target.value || '0', 10))}
              className="input-field h-11"
            />
            <p className="text-[10px] text-gray-500 font-ui">Lower numbers appear first within the department.</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 h-10 rounded-xl text-sm font-ui font-semibold text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 h-10 rounded-xl text-sm font-ui font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #F47C20 0%, #d4651a 100%)' }}
            >
              {saving ? 'Saving…' : (editing ? 'Save changes' : 'Create')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
