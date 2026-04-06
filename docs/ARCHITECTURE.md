# Smart Guard Web Structure

## 1) Screens from the provided design

- Authentication:
  - `Login` page
  - `Register` page
- Recruitment:
  - `Jobs Listing` page (cards + filters + pagination)
  - `Job Detail` page (summary cards + requirement blocks)
  - `Apply` form modal/page

## 2) Route map

- `/login`: sign in
- `/register`: create account
- `/jobs`: recruitment positions list
- `/jobs/[jobId]`: position details
- `/apply`: candidate application form
- `/dashboard`: internal post-login screen (temporary)

## 3) Folder organization

- `app/(auth)/*`: unauthenticated pages
- `app/(jobs)/*`: candidate-facing routes
- `app/(admin)/*`: admin routes
- `app/api/*`: temporary compatibility/server routes still present in the Next app
- `features/*`: domain-level UI and client-side orchestration
- `shared/components/*`: reusable UI shared across domains
- `shared/utils/*`: formatting and cross-domain helpers
- `lib/api/*`: shared HTTP client helpers for Express backend access
- `lib/constants/*`: route/constants shared across features
- `lib/db/*`: legacy LowDB storage still used by some admin/notification flows
- `lib/files/*`: file persistence helpers used by legacy Next routes

## 4) Current architecture direction

- Candidate auth, profile update, and application submission are being moved toward the Express backend as the primary business-logic layer.
- `features/*` remains the main place for frontend orchestration and page composition.
- `app/api/*` should shrink over time and become either thin proxies or disappear once all flows are served by Express.
- The main cleanup still pending is removal of the remaining LowDB-backed admin/notification flows from the Next app.

## 5) Database topology

- MySQL in `backend/database/schema.sql` is the canonical transactional database for users, jobs, applications, interviews, and notifications.
- Backend startup now runs tracked SQL migrations through `schema_migrations`; schema changes should go through backend migrations instead of relying on ad hoc `CREATE TABLE IF NOT EXISTS` behavior.
- `frontend/lib/db/database.js` remains a legacy LowDB store used by some Next.js admin and notification routes. Treat it as transitional compatibility storage, not the source of truth for new data modeling decisions.
- New domain fields, constraints, or indexes should be added to the backend MySQL schema first, then mirrored in any remaining legacy frontend storage only when strictly necessary.
