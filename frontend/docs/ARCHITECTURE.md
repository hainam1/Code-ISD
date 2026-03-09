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
- `app/(jobs)/*`: recruitment browsing flow
- `components/auth/*`: reusable auth UI parts
- `components/jobs/*`: reusable job listing/detail UI parts
- `components/application/*`: application UI pieces
- `components/layout/*`: global app chrome (header/footer)
- `features/jobs/*`: page-level composition for jobs screens
- `features/application/*`: page-level composition for apply flow
- `services/api/*`: API access layer
- `lib/constants/*`: route/constants shared across features
- `lib/utils/*`: formatting and helper functions

## 4) Why this structure fits the design

- Separates `Auth` vs `Recruitment` domains to match the visual flows.
- Keeps pages thin and pushes business/display composition into `features/*`.
- Keeps reusable UI widgets in `components/*` so list/detail/modal can share style and behavior.
- Gives a clean path for growth:
  - add pagination/filter state in `features/jobs`
  - add validation/upload handling in `features/application`
  - replace mock APIs in `services/api`
