CREATE TABLE IF NOT EXISTS public.pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  pin TEXT NOT NULL CHECK (pin ~ '^[0-9]{6}$'),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS pins_email_generated_at_idx
  ON public.pins (email, generated_at DESC);

ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;
