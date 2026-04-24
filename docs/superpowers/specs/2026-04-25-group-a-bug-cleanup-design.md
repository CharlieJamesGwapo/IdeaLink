# Group A — Bug Cleanup Sprint

**Date:** 2026-04-25
**Scope:** Four user-reported bugs from the April 21 list: broken email delivery, slow/delayed announcement notifications, slow registrar/accounting eye-icon, and homepage announcement placement.
**Out of scope:** My Account page, feedback form editor, Facebook-style notification overhaul, office-hours side-nav restructure, rating display, photo upload fixes. Those are Groups B, C, D in the larger April 21 plan.

---

## F4 — Email: make failures loud, fix the swallow

### Problem

User reports "email sending to users is still not working" even after the `00ab299` port-465 TLS fix. Code inspection shows the plumbing is fine; the real defect is that send failures are silently swallowed, so neither the user nor the operator can tell when email drops.

Specifically:
- `backend/internal/services/auth_service.go:290-292` logs `SendPasswordReset` failures via `fmt.Printf` and then returns `nil` — the HTTP layer reports success even when no email was sent.
- `backend/internal/services/user_provisioning.go:147-154` has the same swallow pattern for provisioning emails, exposing the generated temp password in the response to let admins hand-deliver; this is acceptable for provisioning but masks SMTP misconfiguration.
- Call sites do not distinguish `mail.ErrNotConfigured` (SMTP env vars missing) from real send failures.
- There is no persistent audit of email attempts; logs are lost on restart.

### Design

1. **Propagate send failures to the API layer.**
   - `AuthService.RequestPasswordReset` returns the mailer error when `SendPasswordReset` fails (unless it is `ErrNotConfigured` — see #3).
   - The password-reset HTTP handler returns `502 Bad Gateway` with body `{"error":"email delivery failed"}` on real mailer failures. Token generation still succeeds and is persisted, so the user can retry.
   - User provisioning keeps the current behavior of returning `EmailSent: false` + temp password in the JSON response (admins rely on this), but it also records the failure in the audit log (see #2).

2. **New `email_logs` audit table.**

   Schema:
   ```
   email_logs
     id          bigserial primary key
     to_address  text not null
     kind        text not null   -- 'password_reset' | 'provisioning' | 'announcement'
     status      text not null   -- 'sent' | 'failed' | 'skipped'
     error_msg   text            -- null when status = 'sent'
     created_at  timestamptz not null default now()
   ```

   Index: `create index email_logs_created_at_idx on email_logs (created_at desc)`.

   Write path: `mail.Mailer.Send` wraps every outgoing send in an audit write. Failures during the audit write log-and-continue (never block the original call).

3. **Explicit `ErrNotConfigured` handling.**
   - When `mail.Mailer.Send` detects missing SMTP env vars, it returns `mail.ErrNotConfigured`.
   - Callers log `status='skipped'` to `email_logs` and map to a **501 Not Implemented** HTTP response so the operator sees it is a config issue, not a transient failure.
   - Dev escape hatch: env var `MAIL_ALLOW_NOOP=true` converts `ErrNotConfigured` into a soft success (`status='skipped'`, HTTP 200). Default `false` in all environments.

4. **Frontend — surface failure on password reset.**
   - `frontend/src/pages/public/ForgotPasswordPage.tsx` shows `"We couldn't send the reset email. Please try again in a minute, or contact the administrator."` when the API returns 502. Today, any 200 is treated as delivered — this change makes the page honest about failures.
   - No change to behavior on 200; the success copy stays the same.

5. **Admin UI — email logs panel.**
   - New route `/admin/email-logs` rendered from `frontend/src/pages/admin/AdminEmailLogs.tsx`.
   - Backend: `GET /api/admin/email-logs?limit=50&offset=0` returns the latest rows with `kind` and `status` filters available as query params.
   - UI: a simple paginated table with columns `When | To | Kind | Status | Error`. Rows with `status='failed'` are highlighted red. No edit/delete actions.
   - Linked from `AdminDashboard` under a "Diagnostics" card.

### Verification

- **SMTP misconfigured** (`SMTP_HOST` unset, `MAIL_ALLOW_NOOP` unset): password reset returns 501, `email_logs` row has `status='skipped'`, frontend shows failure copy.
- **SMTP valid**: password reset returns 200, `email_logs` row has `status='sent'`, inbox receives the message.
- **SMTP host unreachable**: password reset returns 502, `email_logs` row has `status='failed'` with the underlying error, frontend shows failure copy.
- **Admin panel**: triggers a reset, refreshes `/admin/email-logs`, sees the new row at the top.

---

## B1 — Announcement notification delays

### Problem

User reports three symptoms:
- **Delayed arrival** — a newly published announcement does not show up for a long time.
- **Slow to clear** — clicking the notification takes time to remove the badge.
- **Click twice** — users have to click the announcement twice before the detail actually renders.

Code inspection confirms:
- `frontend/src/hooks/useAnnouncements.ts:16-27` fetches once on mount and never polls.
- `frontend/src/components/shared/NotificationBell.tsx:20-40` polls every 30s, but only for unread *submissions* — announcements are a separate system.
- The mark-seen handler awaits the API before clearing the badge; no optimistic update.
- The announcement detail view reads from the same list cache the badge is reading. If the cache is stale when the user clicks, the first click opens empty/old state; only after the next poll does the second click show the real content.

### Design

1. **Announcement polling, shared timer.**
   - `useAnnouncements` subscribes to the existing global poll timer introduced in `7b1e36a`. On each tick (30s), the hook refetches the announcement list and its unread count.
   - No new timer is created. The timer already exists in `NotificationBell`; extract it into a small `useGlobalPoll(callback)` hook under `frontend/src/hooks/useGlobalPoll.ts`, and have both `NotificationBell` and `useAnnouncements` subscribe.

2. **Optimistic mark-seen.**
   - `markAnnouncementsSeen` in `frontend/src/api/announcements.ts` stays the same on the wire.
   - The click handler in `useAnnouncements` immediately sets `unreadCount=0` and `lastSeen=now` in local state, then fires the POST in the background.
   - On API failure: rollback the local state + show a small toast "Couldn't mark as seen, will retry".

3. **Stale-check on detail open.**
   - When the user opens an announcement detail, if the cached list is older than 10 seconds (`Date.now() - lastFetchedAt > 10_000`), refetch the list before rendering the detail.
   - The detail view renders a small spinner during this refetch. Expected duration <300ms on Render.
   - This eliminates the "click twice" symptom because first-click is guaranteed to render fresh data.

4. **No backend change.**
   - `POST /api/announcements/mark-seen` (`backend/internal/handlers/announcements.go:93-109`) is already a simple timestamp update and is not the source of the delay.

### Verification

- Publish a new announcement as admin → within 30s it appears in the user's list and badge increments (without manual refresh).
- Click the bell → badge clears to 0 instantly (no roundtrip wait).
- Open an announcement detail → content renders on the first click every time, even when the list was stale.
- Simulate mark-seen API failure (dev: temporarily return 500) → badge rolls back to prior count + toast appears.

---

## B2 — Registrar/Accounting eye-icon is slow

### Problem

Clicking the eye icon on a suggestion row waits for the full API roundtrip before flipping the row to "reviewed", making the UI feel frozen. Code locations:
- `frontend/src/pages/registrar/RegistrarSuggestions.tsx:63-71` — handler `await`s `markSuggestionReviewed(id)` before updating local state.
- Parallel issue in the Accounting (Finance) suggestions page if it follows the same pattern.
- Backend: `backend/internal/services/suggestion_service.go:132, 135` calls `MarkAsRead()` twice — harmless but redundant.

### Design

1. **Optimistic UI on eye-icon click.**
   - In the click handler: first flip the row's local state to `status='reviewed'` (and mark-read flags), open the detail modal, *then* fire `markSuggestionReviewed(id)` in the background.
   - On API failure: revert the row's local state + show a toast `"Couldn't mark as reviewed"`. The detail modal stays open so the user doesn't lose their place.

2. **Apply the same pattern to the Accounting suggestions page.**
   - File: `frontend/src/pages/accounting/AccountingSuggestions.tsx`.
   - If the page shares a `SuggestionRow` component with Registrar, lift the optimistic logic into the shared component so both pages benefit.

3. **Remove the redundant second `MarkAsRead()` call.**
   - `backend/internal/services/suggestion_service.go:132, 135` — keep the first call, delete the second. Add a one-line comment only if the intent isn't obvious from the diff; prefer no comment.
   - Not user-visible; a tiny cleanup bundled with the real fix.

### Verification

- Click eye icon on a new suggestion as Registrar → row flips to reviewed instantly, modal opens instantly.
- Same flow as Accounting → identical behavior.
- Simulate API failure → row reverts + toast appears + modal stays open.
- Server logs show one `MarkAsRead` call, not two.

---

## B3 — Homepage announcement placement

### Problem

The user wrote `"Announcement sa homepage kay mu ubus sya sa testimonies"` — announcements feel buried on the homepage. Code inspection of `frontend/src/pages/public/HomePage.tsx` shows the current render order is:

1. Hero (lines 140-248)
2. About IdeaLink System (lines 251-273)
3. Our Foundation / Philosophy / Vision / Mission (lines 276-315)
4. Core Values (lines 318-335)
5. Institutional Goals (lines 338-357)
6. How It Works / Features (lines 359-385)
7. Announcements (lines 386-420)
8. Testimonials (lines 422-480)

Announcements is technically above Testimonials but requires scrolling through six sections first. Time-sensitive content should be prominent.

### Design

1. **Move Announcements to directly after Hero.**
   - New order: Hero → **Announcements** → About → Foundation → Values → Goals → How It Works → Testimonials.
   - Implementation: in `HomePage.tsx`, relocate the Announcements `<section>` JSX (lines 386-420) to sit immediately after the Hero `<section>` that ends at line 248.
   - No CSS change; the section already has its own id (`id="announcements"`) for scrollspy anchors.

2. **Confirm scrollspy still works.**
   - The header's scrollspy (`9e249c2`) relies on section ids and order. Verify that moving the anchor does not break the highlight logic — the implementation is order-agnostic if it iterates sections by DOM position.

### Verification

- Load the public homepage → Announcements appears immediately below Hero.
- Click the "Announcements" header anchor → scrolls to the right section.
- Anchors for `values`, `goals`, `how-it-works`, `testimonials` still highlight correctly as the user scrolls.

---

## Cross-cutting notes

- **No schema migration risk:** only one additive migration (`email_logs` table). No column changes on existing tables.
- **No API breakage:** existing endpoints keep their shapes. New endpoint is additive (`GET /api/admin/email-logs`).
- **Frontend state:** the new shared `useGlobalPoll` hook is the one non-trivial abstraction added. Introduced only because both `NotificationBell` and `useAnnouncements` need the same tick — matches the existing `7b1e36a` direction rather than inventing a new pattern.
- **Testing:** verify each item manually in the browser (the user's repo convention requires this for UI changes). No automated test additions in this group — they'd be a separate effort.

## Implementation order (suggested)

1. B3 (homepage reorder) — smallest, lowest-risk, instant visible win.
2. B2 (optimistic eye-icon) — isolated frontend change plus trivial backend cleanup.
3. B1 (announcement notif) — introduces `useGlobalPoll`; touches a few files but no schema.
4. F4 (email logs + loud failures) — schema migration + new admin page; largest surface.

Each item is independently shippable; there are no cross-dependencies.
