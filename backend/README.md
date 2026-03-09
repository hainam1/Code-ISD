# Smart Guard Backend (Node.js + Express + MySQL)

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

Server default: `http://localhost:5000`

## Database

- Uses `mysql2` with SQL queries.
- DB schema is moved to: `backend/database/schema.sql`.
- The server auto-creates database/tables on startup and seeds default data.

Required `.env` values:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=smart_guard
```

## Seed Users

- HR: `hr@smartguard.com` / `123456`
- Management: `management@smartguard.com` / `123456`

## API Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`

- `GET /api/jobs`
- `GET /api/jobs/:id`

- `POST /api/applications` (Candidate, multipart form-data with `jobId` + `cv`)
- `GET /api/applications` (Candidate sees own; HR/Management sees all)
- `PUT /api/applications/:id/status` (HR only)

- `POST /api/interviews` (HR only)
- `PUT /api/interviews/:applicationId/evaluation` (HR only)
- `GET /api/interviews` (HR/Management)

- `PUT /api/hiring/:candidateId` (Management only)

## Status Workflow

- Application submit: `Under Review`
- HR update: `Under Review` | `Shortlisted` | `Rejected`
- Schedule interview (only shortlisted): `Interview Scheduled`
- Interview evaluation: `Interviewed`
- Final decision by management: `Approved` | `Final Rejected`

## Notes

- CV upload supports PDF/DOC/DOCX only.
- Max file size is 5MB.
- Uploaded files are served at `/uploads/cv/<filename>`.
