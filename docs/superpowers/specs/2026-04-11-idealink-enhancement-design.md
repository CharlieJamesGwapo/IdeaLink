# IdeaLink Enhancement Design
**Date:** 2026-04-11
**Project:** IdeaLink: ASCB E-Suggestion Platform
**Capstone:** Bachelor of Science in Information Technology — Andres Soriano Colleges of Bislig

---

## Context

The system is a web-based feedback/suggestion management platform for ASCB's Registrar and Accounting Offices. Built with React + TypeScript + Tailwind CSS (v4), backed by a PHP/MySQL API.

Panel routing form feedback identified three core improvement areas:
1. SubmitPage should follow IPO model with visual step-based category/service selection (not dropdowns)
2. Animations and transitions need to be added throughout for a polished, production-grade feel
3. The app must be fully responsive on mobile devices

**Constraint:** Nothing is removed — only additions and enhancements.

---

## Phase 1: SubmitPage — Visual IPO Stepper

### Goal
Replace the flat single-form layout with a 3-step wizard that makes the Input → Process → Output flow visible and intuitive.

### Steps

**Step 1 — Choose Department (Input)**
- Two large visual button cards: Registrar | Accounting Office
- Each card shows an icon, department name, and brief description of what it handles
- Selected card highlights in ASCB orange with a checkmark
- Animate transition to Step 2 on selection (slide left)

**Step 2 — Choose Service Category (Input)**
- Grid of category buttons (2 columns on mobile, 3 on desktop) — no dropdown
- Registrar categories: Enrollment/Registration, TOR, Certificate of Enrollment, Good Moral, Diploma & Auth, ID Issuance, Shifting/Cross-enrollment, Other
- Accounting categories: Tuition Fee, Scholarship/Financial Aid, Fee Assessment, Clearance, Refund Request, Receipt Re-issuance, Billing Dispute, Other
- Each button has a small icon and label
- Selected button highlights in orange
- Back button returns to Step 1; Next animates to Step 3

**Step 3 — Write Your Feedback (Process → Output)**
- Subject/Title input (character counter)
- Feedback Details textarea (character counter)
- Anonymous toggle
- Office Hours Banner (existing component, kept as-is)
- Submit button → triggers success animation

### Progress Indicator
- A 3-step pill bar at the top of the form card: Department → Category → Details
- Active step shown in orange; completed steps show a checkmark in green
- Animated transition between steps (slide + fade)

### Technical approach
- All state managed locally in SubmitPage with a `step` variable (1 | 2 | 3)
- No new dependencies — CSS transitions only
- Existing `submitSuggestion` API call unchanged
- Existing success state (submitted === true) unchanged

---

## Phase 2: Animations & Transitions — All Pages

### Page-level
- All pages already use `animate-fade-in` — strengthen with `animation-duration: 0.35s` and `cubic-bezier(0.16,1,0.3,1)`
- Route change: existing fade-in class is sufficient; ensure it's applied consistently on every page root

### Scroll Reveal
- Already implemented via `useScrollReveal` hook in HomePage
- Apply same hook to SubmissionsPage cards, AnnouncementsPage cards
- Stagger children using `animation-delay` (50ms increments)

### Card & Button Hover
- Cards: `hover:-translate-y-1 hover:shadow-xl transition-all duration-200`
- Buttons already have transitions — ensure `active:scale-95` is on all primary buttons
- SuggestionRow rows: subtle left-border highlight on hover (`hover:border-l-ascb-orange`)

### Form Field Focus
- Add orange glow ring on focus: `focus:ring-2 focus:ring-ascb-orange/40 focus:border-ascb-orange`
- Ensure this is in the global `input-field` CSS class in `index.css`

### Status Badge Transitions
- In SubmissionsPage and SuggestionRow, badge color changes should use `transition-colors duration-300`

### Skeleton Loaders
- Already exist — verify `skeleton-shimmer` animation is applied on all loading states across pages

---

## Phase 3: Responsiveness

### SubmitPage stepper (mobile)
- Step buttons stack to full-width on screens < 640px
- Category grid: 2 columns on mobile (already handled by `grid-cols-2`)
- Progress bar labels hidden on mobile (show only dots/icons)

### Dashboard tables → card stacks
- On screens < 768px, the suggestion tables in RegistrarSuggestions, AccountingSuggestions, AdminSuggestions render as stacked cards instead of table rows
- Each card shows: status badge, department, title, date, action button
- This is additive — no table markup removed, just hidden via `hidden md:table-row`

### Header / Sidebar
- Already have mobile handling — verify hamburger menu works and sidebar closes on route change

### HomePage sections
- Core values grid: already `sm:grid-cols-2 lg:grid-cols-4` — verified
- Goals list: already single-column — verified
- Footer grid: already `sm:grid-cols-3` — add `grid-cols-1` fallback explicitly

---

## Files to Modify

| File | Change |
|------|--------|
| `frontend/src/pages/user/SubmitPage.tsx` | Full stepper rewrite (Phase 1) |
| `frontend/src/index.css` | Strengthen focus styles, add stagger utilities |
| `frontend/src/pages/user/SubmissionsPage.tsx` | Scroll reveal, mobile card view |
| `frontend/src/pages/user/AnnouncementsPage.tsx` | Scroll reveal on cards |
| `frontend/src/pages/registrar/RegistrarSuggestions.tsx` | Mobile card stack |
| `frontend/src/pages/accounting/AccountingSuggestions.tsx` | Mobile card stack |
| `frontend/src/pages/admin/AdminSuggestions.tsx` | Mobile card stack |
| `frontend/src/components/shared/SuggestionRow.tsx` | Hover border transition |
| `frontend/src/pages/public/HomePage.tsx` | Footer grid fallback |

## Files NOT to Modify
- All staff login pages
- All staff dashboard pages (AdminDashboard, RegistrarDashboard, AccountingDashboard)
- AuthContext, API layer, types
- Router structure

---

## Success Criteria
- SubmitPage shows 3 clear steps; panel comment about "IPO system with buttons for categories" is fully addressed
- All major pages have visible, smooth animations on load and scroll
- No horizontal scroll on mobile at any breakpoint
- All existing functionality (submit, track, staff portals) continues to work unchanged
