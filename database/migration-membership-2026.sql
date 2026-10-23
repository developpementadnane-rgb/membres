-- ============================================================================
-- MIGRATION: Adhésion annuelle (membership) — Portail Membre
-- ============================================================================
-- Idempotent, defensive migration in the same style as attendance-migration.sql:
-- safe to re-run, validates the shape of `public.users` before creating
-- foreign keys, never drops or alters existing data.
--
-- Creates:
--   - public.membership_periods      (one row per member per calendar year)
--   - public.membership_documents    (the 4 required pieces per period)
--   - public.membership_status_view  (adds the computed is_active_member +
--                                      display_status derived from real data,
--                                      never a bare is_member flag)
--   - public.get_or_create_membership_period(member_id, year)  (SECURITY DEFINER,
--     used by the server route so a period always exists lazily without ever
--     duplicating rows or touching history)
--
-- Security model: mirrors attendance_challenges — RLS enabled, all direct
-- table grants revoked from anon/authenticated. Members never read/write
-- these tables directly from the browser; everything goes through the
-- Express/Netlify /api/membership/* routes using the service-role key,
-- consistent with how documents (CIN copies, birth certificates) must not
-- be publicly readable via the anon key.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  users_id_type text;
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE EXCEPTION 'Membership migration requires public.users to exist';
  END IF;

  SELECT format_type(a.atttypid, a.atttypmod)
    INTO users_id_type
    FROM pg_attribute a
   WHERE a.attrelid = 'public.users'::regclass
     AND a.attname = 'id'
     AND NOT a.attisdropped;

  IF users_id_type IS NULL THEN
    RAISE EXCEPTION 'Membership migration could not determine public.users.id type';
  END IF;

  -- ==========================================================================
  -- membership_periods: one row per member per membership_year.
  -- History is never deleted; a new row is created for each new year instead
  -- of mutating the previous one (mission requirement: "ne pas supprimer
  -- l'historique. Créer une nouvelle période pour chaque année").
  -- ==========================================================================
  IF to_regclass('public.membership_periods') IS NULL THEN
    EXECUTE format($sql$
      CREATE TABLE public.membership_periods (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        member_id %s NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        membership_year integer NOT NULL CHECK (membership_year BETWEEN 2000 AND 2100),

        -- Two independent booleans, exactly as required: is_active_member is
        -- computed from these (+ year), never stored as a bare flag.
        payment_completed boolean NOT NULL DEFAULT false,
        payment_completed_at timestamptz,
        payment_note text,

        documents_completed boolean NOT NULL DEFAULT false,

        -- Set only by the leaders portal (chef) once the whole dossier has
        -- been reviewed. This drives the "Adhésion validée" / "À corriger"
        -- workflow display state; it does NOT gate is_active_member itself
        -- (see membership_status_view), per the mission's explicit formula.
        admin_validated boolean NOT NULL DEFAULT false,
        admin_validated_at timestamptz,
        admin_validated_by %s REFERENCES public.users(id) ON DELETE SET NULL,
        admin_note text,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT membership_periods_member_year_unique UNIQUE (member_id, membership_year)
      )
    $sql$, users_id_type, users_id_type);
  END IF;

  -- ==========================================================================
  -- membership_documents: exactly the 4 required pieces, plus room for any
  -- future optional ones (required boolean per row rather than hardcoded).
  -- ==========================================================================
  IF to_regclass('public.membership_documents') IS NULL THEN
    CREATE TABLE public.membership_documents (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      membership_period_id uuid NOT NULL REFERENCES public.membership_periods(id) ON DELETE CASCADE,
      document_type text NOT NULL CHECK (document_type IN (
        'guardian_id_copy',      -- 1. Photocopie de la carte d'identité du tuteur
        'member_photo_1',        -- 2a. Photo du membre (1/2)
        'member_photo_2',        -- 2b. Photo du membre (2/2)
        'birth_certificate',     -- 3. Extrait de l'acte de naissance
        'membership_form'        -- 4. Formulaire de demande d'adhésion légalisé
      )),
      required boolean NOT NULL DEFAULT true,
      status text NOT NULL DEFAULT 'missing' CHECK (status IN ('missing', 'pending_review', 'validated', 'to_correct')),
      file_url text,
      file_path text,
      submitted_at timestamptz,
      reviewer_note text,
      reviewed_by %s REFERENCES public.users(id) ON DELETE SET NULL,
      reviewed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),

      CONSTRAINT membership_documents_period_type_unique UNIQUE (membership_period_id, document_type)
    );
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_membership_periods_member_id ON public.membership_periods(member_id);
CREATE INDEX IF NOT EXISTS idx_membership_periods_year ON public.membership_periods(membership_year);
CREATE INDEX IF NOT EXISTS idx_membership_documents_period_id ON public.membership_documents(membership_period_id);
CREATE INDEX IF NOT EXISTS idx_membership_documents_status ON public.membership_documents(status);

COMMENT ON TABLE public.membership_periods IS 'One row per member per calendar year. History is immutable/append-only: never delete or reuse a row across years.';
COMMENT ON COLUMN public.membership_periods.payment_completed IS 'Independent boolean; combined with documents_completed + membership_year = current year to compute is_active_member (see membership_status_view). Never used alone as a membership flag.';
COMMENT ON COLUMN public.membership_periods.documents_completed IS 'True once every REQUIRED membership_documents row for this period has status = validated. Kept in sync by trigger_sync_documents_completed.';
COMMENT ON COLUMN public.membership_periods.admin_validated IS 'Leader/chef final sign-off on the full dossier. Drives the pending_validation -> validated display transition; does not by itself define is_active_member.';
COMMENT ON TABLE public.membership_documents IS 'The pieces required for a membership dossier: 1 guardian ID copy, 2 member photos, 1 birth certificate, 1 legalized membership form.';

-- ============================================================================
-- Keep documents_completed accurate automatically whenever a document's
-- status changes, instead of trusting the client to recompute it.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_membership_documents_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  target_period_id uuid;
  all_required_validated boolean;
BEGIN
  target_period_id := COALESCE(NEW.membership_period_id, OLD.membership_period_id);

  SELECT NOT EXISTS (
    SELECT 1 FROM public.membership_documents
     WHERE membership_period_id = target_period_id
       AND required = true
       AND status <> 'validated'
  )
  INTO all_required_validated;

  UPDATE public.membership_periods
     SET documents_completed = COALESCE(all_required_validated, false),
         updated_at = now()
   WHERE id = target_period_id;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_sync_membership_documents_completed ON public.membership_documents;
CREATE TRIGGER trg_sync_membership_documents_completed
AFTER INSERT OR UPDATE OF status, required OR DELETE ON public.membership_documents
FOR EACH ROW EXECUTE FUNCTION public.sync_membership_documents_completed();

-- ============================================================================
-- View: computes is_active_member and a single display_status from the real
-- underlying conditions (mission section 7 — never a bare is_member flag).
-- ============================================================================
CREATE OR REPLACE VIEW public.membership_status_view AS
SELECT
  mp.*,
  (
    mp.payment_completed
    AND mp.documents_completed
    AND mp.membership_year = EXTRACT(YEAR FROM CURRENT_DATE)::int
  ) AS is_active_member,
  EXISTS (
    SELECT 1 FROM public.membership_documents d
     WHERE d.membership_period_id = mp.id AND d.status = 'to_correct'
  ) AS has_rejected_documents,
  EXISTS (
    SELECT 1 FROM public.membership_documents d
     WHERE d.membership_period_id = mp.id AND d.submitted_at IS NOT NULL
  ) AS has_any_submission,
  CASE
    WHEN mp.admin_validated THEN 'validated'
    WHEN EXISTS (
      SELECT 1 FROM public.membership_documents d
       WHERE d.membership_period_id = mp.id AND d.status = 'to_correct'
    ) THEN 'to_correct'
    WHEN mp.payment_completed AND mp.documents_completed THEN 'pending_validation'
    WHEN mp.payment_completed AND NOT mp.documents_completed THEN 'payment_done'
    WHEN NOT mp.payment_completed AND EXISTS (
      SELECT 1 FROM public.membership_documents d
       WHERE d.membership_period_id = mp.id AND d.submitted_at IS NOT NULL
    ) THEN 'documents_incomplete'
    WHEN EXISTS (
      SELECT 1 FROM public.membership_documents d
       WHERE d.membership_period_id = mp.id AND d.submitted_at IS NOT NULL
    ) OR mp.payment_completed THEN 'in_progress'
    ELSE 'not_started'
  END AS display_status
FROM public.membership_periods mp;

COMMENT ON VIEW public.membership_status_view IS 'Read-only computed view: is_active_member follows the literal mission formula (payment_completed AND documents_completed AND membership_year = current year). display_status is a richer human-facing status that additionally reflects the leader''s manual validation/rejection.';

-- ============================================================================
-- get_or_create_membership_period: lazily creates the current year's row on
-- first visit to the Adhésion page, without ever duplicating or resetting
-- history. This IS the "chaque 1er janvier redevient non validé" rule: we
-- simply never carry payment/document flags forward into a new year's row.
-- ============================================================================
DO $$
DECLARE
  users_id_type text;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod)
    INTO users_id_type
    FROM pg_attribute a
   WHERE a.attrelid = 'public.users'::regclass
     AND a.attname = 'id'
     AND NOT a.attisdropped;

  EXECUTE format($function$
    CREATE OR REPLACE FUNCTION public.get_or_create_membership_period(
      p_member_id %s,
      p_year integer
    )
    RETURNS public.membership_periods
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $body$
    DECLARE
      result public.membership_periods;
      doc_type text;
    BEGIN
      SELECT * INTO result
        FROM public.membership_periods
       WHERE member_id = p_member_id AND membership_year = p_year
       FOR UPDATE;

      IF NOT FOUND THEN
        INSERT INTO public.membership_periods (member_id, membership_year)
        VALUES (p_member_id, p_year)
        RETURNING * INTO result;

        FOREACH doc_type IN ARRAY ARRAY['guardian_id_copy','member_photo_1','member_photo_2','birth_certificate','membership_form']
        LOOP
          INSERT INTO public.membership_documents (membership_period_id, document_type, required, status)
          VALUES (result.id, doc_type, true, 'missing')
          ON CONFLICT (membership_period_id, document_type) DO NOTHING;
        END LOOP;
      END IF;

      RETURN result;
    END;
    $body$;
  $function$, users_id_type);

  EXECUTE format('REVOKE ALL ON FUNCTION public.get_or_create_membership_period(%s, integer) FROM PUBLIC, anon, authenticated', users_id_type);
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.get_or_create_membership_period(%s, integer) TO service_role', users_id_type);
END
$$;

-- ============================================================================
-- Lock down like attendance_challenges: no direct anon/authenticated access.
-- All reads/writes go through the server routes using the service-role key.
-- ============================================================================
ALTER TABLE public.membership_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_documents ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.membership_periods FROM anon, authenticated;
REVOKE ALL ON TABLE public.membership_documents FROM anon, authenticated;
REVOKE ALL ON public.membership_status_view FROM anon, authenticated;

-- ============================================================================
-- Storage bucket for membership documents (private — not public like the
-- reports-pdfs bucket, since these are ID copies and birth certificates).
-- Created defensively; if it already exists this is a no-op.
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'membership-documents') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('membership-documents', 'membership-documents', false);
  END IF;
END
$$;

-- ============================================================================
-- Verification query (read-only) you can run manually after applying this
-- migration to sanity-check the shape before pointing the server at it.
-- ============================================================================
-- SELECT table_name FROM information_schema.tables
--  WHERE table_schema = 'public' AND table_name IN ('membership_periods','membership_documents');
