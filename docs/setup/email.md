# Email Setup (SMTP) — IdeaLink

IdeaLink sends two kinds of email:
- **Password reset** — link sent when a user clicks "Forgot password" on `/login`.
- **New user credentials** — sent when an admin or registrar provisions an account from `/admin/users`.

If SMTP is not configured, both flows return HTTP 501 ("email not configured") and the user-facing UI surfaces a clear error. The reset token is still issued in the DB so a quick fix is to retry once SMTP is wired up.

## Required environment variables

| Variable        | Example                              | Notes |
|-----------------|--------------------------------------|-------|
| `SMTP_HOST`     | `smtp.gmail.com`                     | If empty, send is skipped and `mail.ErrNotConfigured` is returned. |
| `SMTP_PORT`     | `465` (implicit TLS) or `587` (STARTTLS) | Code branches on this — both are tested. |
| `SMTP_USER`     | `noreply@ascb.edu.ph`                | Gmail account name (full email). |
| `SMTP_PASS`     | `xxxx xxxx xxxx xxxx`                | **Gmail App Password**, not the account password (see below). |
| `SMTP_FROM`     | `IdeaLink <noreply@ascb.edu.ph>`     | Display From; address part is also used as MAIL FROM if parseable. |
| `FRONTEND_URL`  | `https://idealink.app`               | Used to build the reset link (`<base>/reset-password?token=…`). May be a comma-separated list — first entry wins for the link. |

## Generating a Gmail App Password

1. Sign in to the Gmail account that will send mail (`noreply@ascb.edu.ph` or similar).
2. Visit https://myaccount.google.com/security and enable 2-Step Verification.
3. Visit https://myaccount.google.com/apppasswords and create an app password labelled `IdeaLink`.
4. Copy the 16-character value into `SMTP_PASS`. Spaces are OK; the SMTP library trims them.

## Smoke test (run after every prod deploy)

1. Open `https://<frontend-host>/forgot-password` in a clean browser session.
2. Enter a real registered email and submit.
3. Open the admin panel: `/admin/email-logs`. Confirm a row with `kind=password_reset`, `status=sent`.
4. Open the inbox of the email above. Find the IdeaLink message. Click the link.
5. Set a new password (≥ 6 chars). Confirm the success toast.
6. Sign back in with the new password.

If step 3 shows `status=failed` or `status=skipped`, check `SMTP_*` env vars and Gmail App Password validity.

If step 4 never arrives but step 3 says `sent`, check the recipient's spam / promotions folder. Some Gmail accounts mark first-time senders as spam.
