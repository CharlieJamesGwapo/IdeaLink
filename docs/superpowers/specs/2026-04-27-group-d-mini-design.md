# Group D-mini — Service Rating Chart + Admin Service Catalog

**Date:** 2026-04-27
**Scope:** Two items from the original April 21 punch list:

- **D1 — Service rating chart:** "Sa service rating dashboard na kadtong square wala patung graph niya." Each rating card on `/admin/dashboard` shows only an average and a count; the middle of the card is empty. We render the per-rating breakdown the backend already returns as a horizontal-bar mini-chart.
- **D2 — Admin service catalog:** "Si admin maka edit and add services sa feedback form kibali maka add siyag services category tas kung asa na sya na department na service ma butang." Move the hardcoded `REGISTRAR_SERVICES` / `ACCOUNTING_SERVICES` arrays in `SubmitPage.tsx` into a database-backed catalog that admins can edit at `/admin/services`. Adds, edits, and disables flow into the user-facing rating form on next page load.

**Out of scope (later groups):**
- Group C: real-time / Facebook-style notifications (#3 + bug #9).
- Group D remaining: photo attachments visible to staff (#5), office-hours editor with history + custom workdays (#6), slow eye-icon (#10).
- Group E: homepage polish — "Values" → "Core Values", footer phone number, announcement pagination, top overflow (#8, #11, #13).

---

## D1 — Service Rating Chart

### Problem

`RatingsPanel.tsx` renders one card per `(department, category)` rating group. Each card has the title at the top and the average + count at the bottom, with an empty body. The backend already includes `breakdown: {1: x, 2: y, 3: z, 4: w, 5: v}` in every rating group payload, but the frontend ignores it.

### Design

Render five horizontal bars inside each card, one per rating value, in the order **5★ → 1★** (highest at top so the eye lands on positives first).

Per row:
- Label: `5★`, `4★`, `3★`, `2★`, `1★` in `text-ascb-gold`, fixed-width font-ui label.
- Bar: a 4–6 px tall pill rendered at width `count[rating] / max(count[1..5]) × 100%` of the row's available track. We use the *maximum* (not the total) as the denominator so distribution shape is visible regardless of total volume — a card with `1, 0, 0, 0, 19` looks distinctively top-heavy.
- Bar color (Tailwind classes already in palette):
  - 5★ → `bg-green-500`
  - 4★ → `bg-lime-500`
  - 3★ → `bg-yellow-500`
  - 2★ → `bg-orange-500`
  - 1★ → `bg-red-500`
- Count text `text-[9px] tabular-nums text-gray-500` to the right of the bar.

Cards with `count === 0` render a centered "No ratings yet" placeholder in `text-[10px] text-gray-500` instead of the bars. The footer (avg + count) still shows; it gracefully reads `★ 0.0 · 0`.

The card already uses `aspect-square min-h-[96px]`. The chart adds vertical content; we bump `min-h-[120px]` so 5 rows + title + footer fit on small screens.

### Pure frontend change

No backend changes. The shape `RatingGroup.breakdown: Record<string, number>` already exists in `frontend/src/api/ratings.ts` and the response from `GET /api/ratings-summary` already populates it. Verified in `backend/internal/repository/suggestion_repo.go:203-238`.

### File

- Modify: `frontend/src/components/shared/RatingsPanel.tsx` only.

### Verification

- **Visual:** load `/admin/dashboard`, confirm each card shows 5 rows of bars at varying widths matching the breakdown; cards with no ratings show "No ratings yet."
- **Smoke at empty state:** in a fresh DB, all cards should show "No ratings yet."

---

## D2 — Admin Service Catalog

### Goal

Replace the two hardcoded service arrays in `SubmitPage.tsx` with a DB-backed list. Admin can:
1. Add a new service to either Registrar or Finance, choosing a label, icon, and display order.
2. Rename / re-icon / re-order an existing service.
3. Disable a service (soft-delete) so it no longer appears in the user submit form, but past ratings remain visible in `RatingsPanel`.
4. Re-enable a disabled service.

### Data model

New migration `015_services.sql` (next number after `014_user_grade_level.sql` from Group B):

```sql
-- 015_services.sql
-- Service catalog managed by admin. Replaces hardcoded arrays in SubmitPage.

CREATE TABLE IF NOT EXISTS services (
  id            SERIAL PRIMARY KEY,
  department    TEXT NOT NULL CHECK (department IN ('Registrar Office', 'Finance Office')),
  label         TEXT NOT NULL,
  icon_name     TEXT NOT NULL DEFAULT 'HelpCircle',
  display_order INT  NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (department, label)
);

CREATE INDEX IF NOT EXISTS services_dept_active_order_idx
  ON services (department, is_active, display_order);

-- Seed the 16 currently-hardcoded services so prod isn't suddenly empty.
-- ON CONFLICT lets the migration be re-run idempotently.
INSERT INTO services (department, label, icon_name, display_order) VALUES
  ('Registrar Office', 'Enrollment / Registration',  'BookOpen',     1),
  ('Registrar Office', 'Transcript of Records (TOR)','FileText',     2),
  ('Registrar Office', 'Certificate of Enrollment',  'Award',        3),
  ('Registrar Office', 'Good Moral Certificate',     'Shield',       4),
  ('Registrar Office', 'Diploma & Authentication',   'Award',        5),
  ('Registrar Office', 'ID Issuance',                'CreditCard',   6),
  ('Registrar Office', 'Shifting / Cross-enrollment','Shuffle',      7),
  ('Registrar Office', 'Other Registrar Concern',    'HelpCircle',   8),
  ('Finance Office',   'Tuition Fee Payment',        'DollarSign',   1),
  ('Finance Office',   'Scholarship / Financial Aid','GraduationCap', 2),
  ('Finance Office',   'Fee Assessment',             'Receipt',      3),
  ('Finance Office',   'Clearance Processing',       'CheckCircle2', 4),
  ('Finance Office',   'Refund Request',             'RotateCcw',    5),
  ('Finance Office',   'Receipt Re-issuance',        'FileText',     6),
  ('Finance Office',   'Billing Dispute',            'AlertTriangle', 7),
  ('Finance Office',   'Other Accounting Concern',   'HelpCircle',   8)
  ON CONFLICT (department, label) DO NOTHING;
```

`suggestions.service_category` (existing column) stays a free-text snapshot. Renaming a service does NOT retroactively rewrite past suggestion rows — this preserves audit trail and matches how `RatingsPanel` already aggregates by the snapshot string.

### Backend

**Model** (`backend/internal/models/service.go`):

```go
type Service struct {
    ID           int       `json:"id"`
    Department   string    `json:"department"`
    Label        string    `json:"label"`
    IconName     string    `json:"icon_name"`
    DisplayOrder int       `json:"display_order"`
    IsActive     bool      `json:"is_active"`
    CreatedAt    time.Time `json:"created_at"`
    UpdatedAt    time.Time `json:"updated_at"`
}

type CreateServiceInput struct {
    Department   string `json:"department"   binding:"required,oneof='Registrar Office' 'Finance Office'"`
    Label        string `json:"label"        binding:"required,min=2,max=100"`
    IconName     string `json:"icon_name"    binding:"required"`
    DisplayOrder int    `json:"display_order"`
}

type UpdateServiceInput struct {
    Department   *string `json:"department,omitempty"`
    Label        *string `json:"label,omitempty"`
    IconName     *string `json:"icon_name,omitempty"`
    DisplayOrder *int    `json:"display_order,omitempty"`
    IsActive     *bool   `json:"is_active,omitempty"`
}
```

**Repository** (`backend/internal/repository/service_repo.go`) implements interface `ServiceRepository`:

```go
type ServiceRepository interface {
    ListByDepartment(department string, activeOnly bool) ([]*models.Service, error)
    ListAll() ([]*models.Service, error)
    FindByID(id int) (*models.Service, error)
    Create(in models.CreateServiceInput) (*models.Service, error)
    Update(id int, in models.UpdateServiceInput) (*models.Service, error)
}
```

`Update` is partial-patch: only non-nil fields in `UpdateServiceInput` get written. `is_active=false` is the soft-delete path.

**Handler** (`backend/internal/handlers/services.go`):

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET`    | `/api/services?department=Registrar Office` | any logged-in user (`user`/`admin`/`registrar`/`accounting`) | Returns active services only. Used by SubmitPage step 2. |
| `GET`    | `/api/admin/services`                       | `admin` | Returns ALL (incl. inactive) for the catalog table. |
| `POST`   | `/api/admin/services`                       | `admin` | Create. 409 on duplicate `(department, label)`. |
| `PATCH`  | `/api/admin/services/:id`                   | `admin` | Partial update. 404 if not found. 409 on duplicate. |
| `DELETE` | `/api/admin/services/:id`                   | `admin` | Soft-delete (sets `is_active=false`). Idempotent — already-disabled returns 200. |

The DELETE handler internally calls `repo.Update(id, UpdateServiceInput{IsActive: ptr(false)})` rather than `DELETE FROM`. Re-enabling is `PATCH /:id` with `{"is_active": true}`.

**Routes** wired in `cmd/main.go` after the existing `auth.*` block:

```go
api := r.Group("/api")
api.GET("/services", middleware.AuthRequired(cfg.JWTSecret, "user", "admin", "registrar", "accounting"), servicesH.List)

admin := api.Group("/admin", middleware.AuthRequired(cfg.JWTSecret, "admin"))
admin.GET("/services",        servicesH.AdminList)
admin.POST("/services",       servicesH.Create)
admin.PATCH("/services/:id",  servicesH.Update)
admin.DELETE("/services/:id", servicesH.Delete)
```

### Frontend

**API helpers** (`frontend/src/api/services.ts`):

```ts
export interface Service {
  id: number
  department: 'Registrar Office' | 'Finance Office'
  label: string
  icon_name: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export const listServices       = (dept: string) =>
  client.get<Service[]>(`/api/services?department=${encodeURIComponent(dept)}`)
export const adminListServices  = () => client.get<Service[]>('/api/admin/services')
export const createService      = (body: Pick<Service, 'department'|'label'|'icon_name'|'display_order'>) =>
  client.post<Service>('/api/admin/services', body)
export const updateService      = (id: number, patch: Partial<Pick<Service, 'department'|'label'|'icon_name'|'display_order'|'is_active'>>) =>
  client.patch<Service>(`/api/admin/services/${id}`, patch)
export const disableService     = (id: number) => client.delete(`/api/admin/services/${id}`)
```

**Icon registry** (`frontend/src/lib/serviceIcons.tsx`) — single source of truth for the 20 curated Lucide icons:

```ts
import { BookOpen, FileText, Award, Shield, CreditCard, Shuffle, HelpCircle,
         DollarSign, GraduationCap, Receipt, RotateCcw, AlertTriangle,
         Building2, Calculator, Star, CheckCircle2, Tag, Mail, User, Settings } from 'lucide-react'

export const ICON_CHOICES = [
  'BookOpen', 'FileText', 'Award', 'Shield', 'CreditCard', 'Shuffle',
  'HelpCircle', 'DollarSign', 'GraduationCap', 'Receipt', 'RotateCcw',
  'AlertTriangle', 'Building2', 'Calculator', 'Star', 'CheckCircle2',
  'Tag', 'Mail', 'User', 'Settings',
] as const
export type IconName = (typeof ICON_CHOICES)[number]

const MAP: Record<IconName, React.ComponentType<{ size?: number; className?: string }>> = {
  BookOpen, FileText, Award, Shield, CreditCard, Shuffle, HelpCircle,
  DollarSign, GraduationCap, Receipt, RotateCcw, AlertTriangle,
  Building2, Calculator, Star, CheckCircle2, Tag, Mail, User, Settings,
}

export function ServiceIcon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  const Cmp = MAP[name as IconName] ?? HelpCircle
  return <Cmp size={size} className={className} />
}
```

If `icon_name` doesn't match the registry (e.g. legacy data), `ServiceIcon` falls back to `HelpCircle` so rendering never breaks.

**New page** (`frontend/src/pages/admin/AdminServicesPage.tsx`):

- Mounts at `/admin/services` under `<RequireAuth role="admin"><StaffLayout>…</StaffLayout></RequireAuth>` in `router.tsx`.
- Header: "Service Catalog" + "Add Service" button (top-right).
- Body: two collapsible sections, "Registrar Office" and "Finance Office". Each section is a table with columns `Order | Icon | Label | Status | Actions`.
- Inactive rows render with `opacity-60` and a "Disabled" badge in the Status column.
- Action buttons per row:
  - **Edit** (pencil icon) → opens the create/edit modal pre-filled.
  - **Disable** (eye-off) for active rows → confirmation toast → `disableService(id)`.
  - **Re-enable** (eye) for inactive rows → `updateService(id, { is_active: true })`.
- Add/Edit modal: department dropdown, label input, icon picker (5×4 grid of `ServiceIcon` buttons highlighting the selected one), display-order number field.
- Errors: 409 → "A service with that label already exists in this department." 404 → "Service no longer exists; refresh the page." Anything else → generic toast.

**Sidebar nav** (`frontend/src/components/layout/Sidebar.tsx`): add a "Services" entry to the admin links group, with the `Tag` lucide icon, pointing at `/admin/services`.

**SubmitPage rewire** (`frontend/src/pages/user/SubmitPage.tsx`):

- Delete the `REGISTRAR_SERVICES` and `ACCOUNTING_SERVICES` constants.
- Add state: `const [services, setServices] = useState<Service[] | null>(null)`.
- When the user picks a department in step 1, fetch `listServices(department)` and store the response. Show a small skeleton (3 grey blocks) while loading.
- Render step 2 buttons by mapping over `services`, using `<ServiceIcon name={s.icon_name} />` for the icon and `s.label` for the text.
- If the response is empty, render `<p>No services available — please contact the registrar's office.</p>` instead of the grid.
- The `serviceCategory` form state still stores the LABEL string (not the id), preserving the existing submit contract — backend doesn't need to change here.

### Edge cases

- **Renaming a service**: past suggestions keep the old `service_category` text. RatingsPanel groups by snapshot, so old ratings stay under the old name and new ratings start a new group under the new name. This is intended; surfacing a "merge" workflow is out of scope.
- **All services disabled in a department**: step 2 shows the empty-state message; user has to switch department or contact the office.
- **Concurrent edits by two admins**: standard last-write-wins. The 409 unique-constraint on `(department, label)` covers the "two admins create the same label" race; one of them gets the 409 and the toast tells them to pick a different label.

### Files touched

**Backend (new):**
- `backend/internal/migrations/015_services.sql`
- `backend/internal/models/service.go`
- `backend/internal/repository/service_repo.go`
- `backend/internal/handlers/services.go`

**Backend (modified):**
- `backend/internal/migrations/migrations.go` — embed new SQL.
- `backend/internal/config/db.go` — execute migration in order.
- `backend/internal/repository/interfaces.go` — add `ServiceRepository` interface.
- `backend/cmd/main.go` — wire repo + handler + routes.

**Frontend (new):**
- `frontend/src/api/services.ts`
- `frontend/src/lib/serviceIcons.tsx`
- `frontend/src/pages/admin/AdminServicesPage.tsx`

**Frontend (modified):**
- `frontend/src/components/shared/RatingsPanel.tsx` (D1 chart).
- `frontend/src/components/layout/Sidebar.tsx` (Services nav entry).
- `frontend/src/pages/user/SubmitPage.tsx` (delete constants, fetch list).
- `frontend/src/router.tsx` (register `/admin/services`).

---

## Verification

### D1 — Chart

- **Manual**: open `/admin/dashboard`. Confirm cards with ratings show 5 horizontal bars; the longest bar matches the rating with the most votes; cards with 0 ratings show "No ratings yet" centered.
- **Mobile**: at narrow viewports (sm breakpoint), the 4-column grid drops to 2 columns; bars must stay readable. Spot-check on Chrome DevTools mobile preview.
- **No regression**: existing CSV export still works.

### D2 — Catalog

**Backend unit (`backend/internal/handlers/services_test.go`):**
- `TestServices_AdminList_RequiresAdmin` → 401 without admin role.
- `TestServices_Create_Success` → 201 + body matches.
- `TestServices_Create_DuplicateLabel` → 409.
- `TestServices_Update_PartialPatch` → only sent fields change.
- `TestServices_Delete_SoftDeletes` → row remains in DB with `is_active=false`.
- `TestServices_GET_OnlyActive` → public list excludes inactive rows.

**Frontend smoke:**
- Sign in as admin → click "Services" in sidebar → see two seeded sections with 8 services each.
- Click "Add Service" → fill modal → save → row appears at the requested order.
- Edit a service → change icon → save → table updates.
- Disable a service → row dims, badge shows "Disabled".
- Sign out → sign in as user → submit feedback → confirm the disabled service is missing from step 2 and the new service is present.
- Edit a service's display_order to put it first → reload SubmitPage → it appears first.

### D2 — Migration safety

- `015_services.sql` is purely additive (new table, new index, INSERT … ON CONFLICT DO NOTHING). Re-running the migration is a no-op.
- Deploy order: migration → backend → frontend. Backend with new endpoints is a strict superset; old frontend doesn't call `/api/services`, it just keeps using the in-code arrays until the new bundle ships, so we don't need feature flags.

---

## Open Questions

None blocking. Defaults already resolved with the user:
- New `/admin/services` page (not inline on dashboard).
- Soft-delete with re-enable.
- Auto-seed the 16 existing services on first run.
- Curated 20-icon dropdown for icon picker.

---

## Summary of changed/added files

8 new files, 8 modified files. No new third-party dependencies — Lucide is already in the bundle, and the chart is plain divs styled with Tailwind.
