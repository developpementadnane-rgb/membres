ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS qr_code_url TEXT,
  ADD COLUMN IF NOT EXISTS documents_generated_at TIMESTAMPTZ;

INSERT INTO storage.buckets (id, name, public)
VALUES ('reports-pdfs', 'reports-pdfs', true)
ON CONFLICT (id) DO UPDATE SET public = true;
