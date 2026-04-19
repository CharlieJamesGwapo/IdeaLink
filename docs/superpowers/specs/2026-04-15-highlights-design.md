# Highlights — Design Spec

Date: 2026-04-15
Status: Approved, implementing

## Goal

Per instructor's request: add a **Highlights** feature where an administrator can
spotlight one or more existing feedback items (suggestions) on the user-side
landing page. Students can ❤️ a highlight; the highlight with the most reacts
floats to the top in a landscape (wide) card. Each highlight auto-expires
**24 hours** after it was created.

## Scope

- Admin marks existing suggestions as highlighted (option A from brainstorm).
- Student users react (heart) once per highlight; toggleable.
- Active highlights render at the top of `AnnouncementsPage` (user-side
  landing), sorted by react count desc, ties broken by `created_at` desc. Top
  entry gets a larger "featured" card.
- Expired highlights are filtered server-side and simply become invisible.
  No cleanup job — rows are kept for audit.
- Admin can manually unhighlight before expiry.
- Re-highlighting an expired suggestion inserts a fresh row (24h clock resets).

Explicitly out of scope: comments on highlights, multi-react (one heart only),
push notifications, server-side cron cleanup, analytics on highlight reactions.

## Data model

New migration `005_highlights.sql`:

```sql
CREATE TABLE IF NOT EXISTS highlights (
  id            SERIAL PRIMARY KEY,
  suggestion_id INT NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  created_by    INT NOT NULL REFERENCES admins(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL
);
-- Only one ACTIVE highlight per suggestion at a time.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_highlight_active_suggestion
  ON highlights (suggestion_id)
  WHERE expires_at > NOW();
CREATE INDEX IF NOT EXISTS idx_highlights_expires_at ON highlights(expires_at);

CREATE TABLE IF NOT EXISTS highlight_reactions (
  highlight_id INT NOT NULL REFERENCES highlights(id) ON DELETE CASCADE,
  user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (highlight_id, user_id)
);
```

Note: the partial unique index relies on `NOW()` at write time, which makes
Postgres reject a second insert while the first is still active but allow a
new one once the previous has expired. Good enough for this scale.

## API

All routes assume existing middleware.

- `POST   /api/admin/highlights` — body `{suggestion_id: int}`. Admin only.
  Inserts with `expires_at = now() + 24h`. Rejects if already actively highlighted.
  Returns the new highlight enriched (same shape as GET).
- `DELETE /api/admin/highlights/:id` — Admin only. Marks expired immediately
  by setting `expires_at = NOW()`. (Soft delete — row stays.)
- `GET    /api/highlights` — auth required (all roles, but only `user` role
  gets `viewer_reacted` populated for UI state). Returns only active
  (`expires_at > NOW()`) highlights sorted by react count desc, then
  `created_at` desc. Each row is enriched with an embedded `suggestion` plus
  `react_count` and `viewer_reacted`.
- `POST   /api/highlights/:id/react` — `user` role only. Toggles the viewer's
  heart on the highlight. Returns `{react_count, viewer_reacted}`. Rejects if
  the highlight is expired.

### Response shape

```json
{
  "id": 1,
  "suggestion_id": 42,
  "created_by": 1,
  "created_at": "2026-04-15T…",
  "expires_at": "2026-04-16T…",
  "react_count": 3,
  "viewer_reacted": true,
  "suggestion": { /* full Suggestion object */ }
}
```

## Backend implementation

- `models/highlight.go` — `Highlight` struct with embedded `*Suggestion`.
- `repository/highlight_repo.go` — CRUD + react toggle. Methods:
  - `Create(suggestionID, adminID int, ttl time.Duration)`
  - `Expire(id int)`
  - `ListActive(viewerUserID int) ([]*models.Highlight, error)` — does the join
    with suggestions + aggregate react count + `EXISTS` for viewer_reacted.
  - `ToggleReact(highlightID, userID int) (count int, reacted bool, err error)`
    — performs a delete-then-insert inside a transaction; returns fresh count.
  - `FindActiveByID(id int)` — for react endpoint expiry check.
- `services/highlight_service.go` — thin wrapper, owns TTL constant
  (`24 * time.Hour`). Validates suggestion exists before creating.
- `handlers/highlights.go` — wires 4 endpoints as above.
- Router wiring in `cmd/main.go`:
  - `admin.POST("/admin/highlights", …)` and `admin.DELETE("/admin/highlights/:id", …)`
  - `authenticated.GET("/highlights", …)`
  - `user.POST("/highlights/:id/react", …)`

## Frontend implementation

- `types.ts` — add `Highlight` interface.
- `api/highlights.ts` — `getHighlights`, `createHighlight(suggestionId)`,
  `deleteHighlight(id)`, `reactHighlight(id)`.
- `hooks/useHighlights.ts` — small hook: fetch on mount, `refetch`, optimistic
  react toggle.
- `components/shared/HighlightsStrip.tsx` — landscape card for the top
  highlight + smaller cards beneath (max 4 visible, rest via "Show more").
  Heart button only enabled for `role === 'user'`.
- `pages/user/AnnouncementsPage.tsx` — render `<HighlightsStrip />` above the
  announcement list.
- `pages/admin/AdminSuggestions.tsx` + `components/shared/SuggestionRow.tsx` —
  add a Highlight ★ button next to the Feature button. Button shows filled
  state when already highlighted; clicking toggles highlight / unhighlight.
  Admin list needs to know active highlight state → `AdminSuggestions` fetches
  active highlights alongside suggestions and passes down a
  `highlightedSuggestionIds: Set<number>` plus an `onToggleHighlight` callback.

## Testing

- Backend: unit test for `HighlightRepo.Create` blocking duplicates, for
  `ToggleReact` toggling correctly, for `ListActive` excluding expired rows
  and populating viewer_reacted. Skip service-level tests beyond happy path
  (thin layer).
- Frontend: component-level smoke tests are out of scope for this feature;
  rely on manual smoke of the UI flow.

## Migration safety

Single new migration file, no changes to existing tables, runs idempotently
via `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.

## Rollout

Local-only for now. Production deployment requires the same migration to run
on whatever Postgres backs the deployed backend.
