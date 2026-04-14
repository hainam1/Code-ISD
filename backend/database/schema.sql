-- Supabase Postgres Schema for Smart Guard
-- Converted from MySQL schema

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(32) NOT NULL UNIQUE,
  role VARCHAR(32) NOT NULL CHECK (role IN ('CANDIDATE', 'HR', 'MANAGEMENT', 'ADMIN')),
  password_hash VARCHAR(255),
  date_of_birth DATE NULL,
  id_card VARCHAR(32) NULL UNIQUE,
  address VARCHAR(255) NULL,
  avatar_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  company_name VARCHAR(255) NOT NULL DEFAULT 'Smart Guard',
  location VARCHAR(255) NOT NULL,
  address VARCHAR(255) NULL,
  requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  experience VARCHAR(128) NULL,
  schedule_type VARCHAR(128) NULL,
  work_hours VARCHAR(128) NULL,
  day_off VARCHAR(128) NULL,
  employment_type VARCHAR(64) NOT NULL DEFAULT 'Full-time',
  status VARCHAR(32) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'DRAFT')),
  salary_min DECIMAL(12, 2) NULL,
  salary_max DECIMAL(12, 2) NULL,
  salary_currency VARCHAR(8) NOT NULL DEFAULT 'VND',
  slots_filled INT NOT NULL DEFAULT 0,
  slots_total INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_jobs_slots CHECK (slots_filled >= 0 AND slots_total >= 0 AND slots_filled <= slots_total),
  CONSTRAINT chk_jobs_salary_range CHECK (
    salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max
  )
);

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS requirements JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS experience VARCHAR(128) NULL;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS schedule_type VARCHAR(128) NULL;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS work_hours VARCHAR(128) NULL;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS day_off VARCHAR(128) NULL;

ALTER TABLE public.jobs
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.users
  ALTER COLUMN avatar_url TYPE TEXT;

ALTER TABLE public.users
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  candidate_full_name VARCHAR(255) NULL,
  candidate_email VARCHAR(255) NULL,
  candidate_phone VARCHAR(32) NULL,
  note TEXT NULL,
  cv_original_name VARCHAR(255) NOT NULL,
  cv_mime_type VARCHAR(128) NOT NULL,
  cv_size INT NOT NULL CHECK (cv_size >= 0),
  cv_path VARCHAR(255) NOT NULL,
  health_original_name VARCHAR(255) NULL,
  health_mime_type VARCHAR(128) NULL,
  health_size INT NULL CHECK (health_size >= 0),
  health_path VARCHAR(255) NULL,
  status VARCHAR(64) NOT NULL CHECK (
    status IN (
      'Under Review',
      'Shortlisted',
      'Rejected',
      'Interview Scheduled',
      'Interviewed',
      'Approved',
      'Final Rejected'
    )
  ),
  status_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (candidate_id, job_id)
);

CREATE TABLE IF NOT EXISTS public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL UNIQUE REFERENCES public.applications(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  scheduled_start_at TIMESTAMPTZ NULL,
  interview_date VARCHAR(32) NOT NULL,
  interview_time VARCHAR(32) NOT NULL,
  interview_location VARCHAR(255) NOT NULL,
  result VARCHAR(32) NULL CHECK (result IS NULL OR result IN ('Pass', 'Fail', 'Pending')),
  comments TEXT NULL,
  scheduled_by UUID NOT NULL REFERENCES public.users(id),
  evaluated_by UUID NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.interview_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL UNIQUE REFERENCES public.applications(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  final_status VARCHAR(64) NOT NULL CHECK (final_status IN ('Approved', 'Final Rejected')),
  interview_result VARCHAR(32) NOT NULL CHECK (interview_result IN ('Pass', 'Fail')),
  fit_level VARCHAR(64) NULL,
  note TEXT NULL,
  evaluated_by UUID NULL REFERENCES public.users(id),
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

ALTER TABLE public.interview_history
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_interview_history_candidate_id
  ON public.interview_history(candidate_id);

CREATE INDEX IF NOT EXISTS idx_interview_history_application_id
  ON public.interview_history(application_id);

CREATE INDEX IF NOT EXISTS idx_interview_history_job_id
  ON public.interview_history(job_id);

CREATE INDEX IF NOT EXISTS idx_interview_history_final_status
  ON public.interview_history(final_status);

CREATE INDEX IF NOT EXISTS idx_interview_history_evaluated_at
  ON public.interview_history(evaluated_at DESC);

ALTER TABLE public.interview_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interview_history'
      AND policyname = 'service_role_manage_interview_history'
  ) THEN
    CREATE POLICY service_role_manage_interview_history
      ON public.interview_history
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS set_interview_history_updated_at ON public.interview_history;

CREATE TRIGGER set_interview_history_updated_at
BEFORE UPDATE ON public.interview_history
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  payload JSONB NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ NULL,
  CONSTRAINT chk_notifications_read_state CHECK (
    (is_read = false AND read_at IS NULL) OR (is_read = true)
  )
);

CREATE TABLE IF NOT EXISTS public.chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id),
  receiver_id UUID NOT NULL REFERENCES public.users(id),
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ NULL,
  CONSTRAINT chk_chat_messages_read_state CHECK (
    (is_read = false AND read_at IS NULL) OR (is_read = true)
  )
);

ALTER TABLE public.interviews
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.notifications
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.chat_threads
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.chat_messages
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
