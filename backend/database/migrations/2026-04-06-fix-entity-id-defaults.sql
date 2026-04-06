CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.interviews
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.notifications
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.chat_threads
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.chat_messages
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
