CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  application_id_type TEXT;
  candidate_id_type TEXT;
  job_id_type TEXT;
  evaluated_by_type TEXT;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod)
  INTO application_id_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'applications'
    AND a.attname = 'id'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  SELECT format_type(a.atttypid, a.atttypmod)
  INTO candidate_id_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'users'
    AND a.attname = 'id'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  SELECT format_type(a.atttypid, a.atttypmod)
  INTO job_id_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'jobs'
    AND a.attname = 'id'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  SELECT format_type(a.atttypid, a.atttypmod)
  INTO evaluated_by_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'users'
    AND a.attname = 'id'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF application_id_type IS NULL OR candidate_id_type IS NULL OR job_id_type IS NULL OR evaluated_by_type IS NULL THEN
    RAISE EXCEPTION 'Could not resolve referenced id column types from public.applications/public.users/public.jobs';
  END IF;

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.interview_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      application_id %s NOT NULL UNIQUE REFERENCES public.applications(id) ON DELETE CASCADE,
      candidate_id %s NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      job_id %s NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
      final_status VARCHAR(64) NOT NULL CHECK (final_status IN (''Approved'', ''Final Rejected'')),
      interview_result VARCHAR(32) NOT NULL CHECK (interview_result IN (''Pass'', ''Fail'')),
      fit_level VARCHAR(64) NULL,
      note TEXT NULL,
      evaluated_by %s NULL REFERENCES public.users(id),
      evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )',
    application_id_type,
    candidate_id_type,
    job_id_type,
    evaluated_by_type
  );
END;
$$;

ALTER TABLE public.interview_history
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

DO $$
DECLARE
  application_id_type TEXT;
  candidate_id_type TEXT;
  job_id_type TEXT;
  evaluated_by_type TEXT;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod)
  INTO application_id_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'applications'
    AND a.attname = 'id'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  SELECT format_type(a.atttypid, a.atttypmod)
  INTO candidate_id_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'users'
    AND a.attname = 'id'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  SELECT format_type(a.atttypid, a.atttypmod)
  INTO job_id_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'jobs'
    AND a.attname = 'id'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  SELECT format_type(a.atttypid, a.atttypmod)
  INTO evaluated_by_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'users'
    AND a.attname = 'id'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  EXECUTE format(
    'ALTER TABLE public.interview_history ADD COLUMN IF NOT EXISTS application_id %s',
    application_id_type
  );

  EXECUTE format(
    'ALTER TABLE public.interview_history ADD COLUMN IF NOT EXISTS candidate_id %s',
    candidate_id_type
  );

  EXECUTE format(
    'ALTER TABLE public.interview_history ADD COLUMN IF NOT EXISTS job_id %s',
    job_id_type
  );

  EXECUTE format(
    'ALTER TABLE public.interview_history ADD COLUMN IF NOT EXISTS evaluated_by %s',
    evaluated_by_type
  );
END;
$$;

ALTER TABLE public.interview_history
  ADD COLUMN IF NOT EXISTS final_status VARCHAR(64);

ALTER TABLE public.interview_history
  ADD COLUMN IF NOT EXISTS interview_result VARCHAR(32);

ALTER TABLE public.interview_history
  ADD COLUMN IF NOT EXISTS fit_level VARCHAR(64);

ALTER TABLE public.interview_history
  ADD COLUMN IF NOT EXISTS note TEXT;

ALTER TABLE public.interview_history
  ADD COLUMN IF NOT EXISTS evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.interview_history
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.interview_history
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.interview_history
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'interview_history_application_id_fkey'
  ) THEN
    ALTER TABLE public.interview_history
      ADD CONSTRAINT interview_history_application_id_fkey
      FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'interview_history_candidate_id_fkey'
  ) THEN
    ALTER TABLE public.interview_history
      ADD CONSTRAINT interview_history_candidate_id_fkey
      FOREIGN KEY (candidate_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'interview_history_job_id_fkey'
  ) THEN
    ALTER TABLE public.interview_history
      ADD CONSTRAINT interview_history_job_id_fkey
      FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'interview_history_evaluated_by_fkey'
  ) THEN
    ALTER TABLE public.interview_history
      ADD CONSTRAINT interview_history_evaluated_by_fkey
      FOREIGN KEY (evaluated_by) REFERENCES public.users(id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'interview_history_final_status_check'
  ) THEN
    ALTER TABLE public.interview_history
      ADD CONSTRAINT interview_history_final_status_check
      CHECK (final_status IN ('Approved', 'Final Rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'interview_history_interview_result_check'
  ) THEN
    ALTER TABLE public.interview_history
      ADD CONSTRAINT interview_history_interview_result_check
      CHECK (interview_result IN ('Pass', 'Fail'));
  END IF;
END;
$$;

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

INSERT INTO public.interview_history (
  application_id,
  candidate_id,
  job_id,
  final_status,
  interview_result,
  fit_level,
  note,
  evaluated_by,
  evaluated_at,
  created_at,
  updated_at
)
SELECT
  applications.id,
  applications.candidate_id,
  applications.job_id,
  applications.status,
  CASE
    WHEN applications.status = 'Approved' THEN 'Pass'
    ELSE 'Fail'
  END,
  NULL,
  NULL,
  NULL,
  applications.updated_at,
  applications.created_at,
  applications.updated_at
FROM public.applications
WHERE applications.status IN ('Approved', 'Final Rejected')
ON CONFLICT (application_id) DO NOTHING;
