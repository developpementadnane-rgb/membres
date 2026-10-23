-- SHM member attendance foundation
-- Run this migration in the Supabase SQL editor with a privileged role.
-- It deliberately does not create or expose QR/PIN generation.

CREATE EXTENSION IF NOT EXISTS pgcrypto;


DO $$
DECLARE
  users_id_type text;
  sessions_id_type text;
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE EXCEPTION 'Attendance migration requires public.users to exist';
  END IF;

  SELECT format_type(a.atttypid, a.atttypmod)
    INTO users_id_type
    FROM pg_attribute a
   WHERE a.attrelid = 'public.users'::regclass
     AND a.attname = 'id'
     AND NOT a.attisdropped;

  IF users_id_type IS NULL THEN
    RAISE EXCEPTION 'Attendance migration could not determine public.users.id type';
  END IF;

  IF to_regclass('public.sessions') IS NULL THEN
    CREATE TABLE public.sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      date date NOT NULL,
      is_open boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  ELSE
    SELECT format_type(a.atttypid, a.atttypmod)
      INTO sessions_id_type
      FROM pg_attribute a
     WHERE a.attrelid = 'public.sessions'::regclass
       AND a.attname = 'id'
       AND NOT a.attisdropped;

    IF sessions_id_type IS NULL OR sessions_id_type <> 'uuid' THEN
      RAISE EXCEPTION 'Incompatible sessions table: sessions.id is %, expected uuid', COALESCE(sessions_id_type, 'missing');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_attribute
       WHERE attrelid = 'public.sessions'::regclass
         AND attname = 'date'
         AND NOT attisdropped
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_attribute
         WHERE attrelid = 'public.sessions'::regclass
           AND attname = 'date_time'
           AND NOT attisdropped
      ) THEN
        RAISE EXCEPTION 'Incompatible sessions table: required column sessions.date is missing and no compatible date_time column exists';
      END IF;

      ALTER TABLE public.sessions ADD COLUMN date date;
      UPDATE public.sessions SET date = date_time::date WHERE date IS NULL;

      IF EXISTS (SELECT 1 FROM public.sessions WHERE date IS NULL) THEN
        RAISE EXCEPTION 'Incompatible sessions table: sessions.date could not be populated from date_time';
      END IF;

      ALTER TABLE public.sessions ALTER COLUMN date SET NOT NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_attribute
       WHERE attrelid = 'public.sessions'::regclass
         AND attname = 'is_open'
         AND NOT attisdropped
    ) THEN
      ALTER TABLE public.sessions
        ADD COLUMN is_open boolean NOT NULL DEFAULT true;
    END IF;
  END IF;

  SELECT format_type(a.atttypid, a.atttypmod)
    INTO sessions_id_type
    FROM pg_attribute a
   WHERE a.attrelid = 'public.sessions'::regclass
     AND a.attname = 'id'
     AND NOT a.attisdropped;

  IF sessions_id_type <> 'uuid' THEN
    RAISE EXCEPTION 'Incompatible sessions table: sessions.id is %, expected uuid', sessions_id_type;
  END IF;

  IF to_regclass('public.attendance') IS NULL THEN
    EXECUTE format($sql$
      CREATE TABLE public.attendance (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        member_id %s NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
        session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE RESTRICT,
        present boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT attendance_member_session_unique UNIQUE (member_id, session_id)
      )
    $sql$, users_id_type);
  END IF;

  IF to_regclass('public.attendance_challenges') IS NULL THEN
    EXECUTE format($sql$
      CREATE TABLE public.attendance_challenges (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE RESTRICT,
        token_hash text NOT NULL UNIQUE,
        pin_hash text NOT NULL,
        expires_at timestamptz NOT NULL,
        used_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        created_by %s NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
        pin_attempts integer NOT NULL DEFAULT 0 CHECK (pin_attempts >= 0)
      )
    $sql$, users_id_type);
  END IF;
END
$$;

COMMENT ON TABLE public.sessions IS 'SHM sessions; one row per organized session.';
COMMENT ON TABLE public.attendance IS 'Recorded member attendance; absence is inferred when no row exists for a past session.';
COMMENT ON TABLE public.attendance_challenges IS 'Temporary QR/PIN authorization challenges; not attendance history.';
COMMENT ON COLUMN public.attendance_challenges.token_hash IS 'SHA-256 hash of the QR token; the original token is never stored.';
COMMENT ON COLUMN public.attendance_challenges.pin_hash IS 'bcrypt hash of the PIN; the plaintext PIN is never stored.';

DO $$
DECLARE
  users_id_type text;
  attendance_member_type text;
  challenge_creator_type text;
  attendance_session_type text;
  challenge_session_type text;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod) INTO users_id_type
    FROM pg_attribute a
   WHERE a.attrelid = 'public.users'::regclass AND a.attname = 'id' AND NOT a.attisdropped;
  SELECT format_type(a.atttypid, a.atttypmod) INTO attendance_member_type
    FROM pg_attribute a
   WHERE a.attrelid = 'public.attendance'::regclass AND a.attname = 'member_id' AND NOT a.attisdropped;
  SELECT format_type(a.atttypid, a.atttypmod) INTO challenge_creator_type
    FROM pg_attribute a
   WHERE a.attrelid = 'public.attendance_challenges'::regclass AND a.attname = 'created_by' AND NOT a.attisdropped;
  SELECT format_type(a.atttypid, a.atttypmod) INTO attendance_session_type
    FROM pg_attribute a
   WHERE a.attrelid = 'public.attendance'::regclass AND a.attname = 'session_id' AND NOT a.attisdropped;
  SELECT format_type(a.atttypid, a.atttypmod) INTO challenge_session_type
    FROM pg_attribute a
   WHERE a.attrelid = 'public.attendance_challenges'::regclass AND a.attname = 'session_id' AND NOT a.attisdropped;

  IF attendance_member_type IS DISTINCT FROM users_id_type THEN
    RAISE EXCEPTION 'Incompatible attendance table: member_id is %, users.id is %', attendance_member_type, users_id_type;
  END IF;
  IF challenge_creator_type IS DISTINCT FROM users_id_type THEN
    RAISE EXCEPTION 'Incompatible attendance_challenges table: created_by is %, users.id is %', challenge_creator_type, users_id_type;
  END IF;
  IF attendance_session_type <> 'uuid' OR challenge_session_type <> 'uuid' THEN
    RAISE EXCEPTION 'Incompatible attendance session reference type: attendance.session_id=%, attendance_challenges.session_id=%; expected uuid', attendance_session_type, challenge_session_type;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.attendance'::regclass AND attname = 'present' AND NOT attisdropped)
     OR NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.attendance'::regclass AND attname = 'created_at' AND NOT attisdropped) THEN
    RAISE EXCEPTION 'Incompatible attendance table: required columns are missing; no existing column was modified';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.attendance_challenges'::regclass AND attname = 'token_hash' AND NOT attisdropped)
     OR NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.attendance_challenges'::regclass AND attname = 'pin_hash' AND NOT attisdropped)
     OR NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.attendance_challenges'::regclass AND attname = 'expires_at' AND NOT attisdropped)
     OR NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.attendance_challenges'::regclass AND attname = 'used_at' AND NOT attisdropped)
     OR NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.attendance_challenges'::regclass AND attname = 'pin_attempts' AND NOT attisdropped) THEN
    RAISE EXCEPTION 'Incompatible attendance_challenges table: required columns are missing; no existing column was modified';
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_attendance_member_id ON public.attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session_id ON public.attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_challenges_session_id ON public.attendance_challenges(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_challenges_token_hash ON public.attendance_challenges(token_hash);
CREATE INDEX IF NOT EXISTS idx_attendance_challenges_expires_at ON public.attendance_challenges(expires_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.attendance'::regclass
       AND conname = 'attendance_member_session_unique'
  ) THEN
    ALTER TABLE public.attendance
      ADD CONSTRAINT attendance_member_session_unique UNIQUE (member_id, session_id);
  END IF;
END
$$;

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_challenges ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.attendance FROM anon, authenticated;
REVOKE ALL ON TABLE public.attendance_challenges FROM anon, authenticated;

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
    CREATE OR REPLACE FUNCTION public.record_attendance(
      p_member_id %s,
      p_challenge_id uuid
    )
    RETURNS TABLE (
      success boolean,
      session_id text,
      session_title text,
      date date,
      present boolean
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $body$
    DECLARE
      locked_challenge public.attendance_challenges%%ROWTYPE;
      current_session public.sessions%%ROWTYPE;
      already_present boolean;
    BEGIN
      SELECT *
        INTO locked_challenge
        FROM public.attendance_challenges
       WHERE id = p_challenge_id
       FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'QR challenge not found';
      END IF;

      IF locked_challenge.expires_at <= now() THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'QR challenge expired';
      END IF;

      IF locked_challenge.used_at IS NOT NULL THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'QR challenge already used';
      END IF;

      SELECT *
        INTO current_session
        FROM public.sessions
       WHERE id = locked_challenge.session_id
       FOR SHARE;

      IF NOT FOUND OR current_session.is_open IS NOT TRUE THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Session is closed';
      END IF;

      SELECT EXISTS (
        SELECT 1
          FROM public.attendance a
         WHERE a.member_id = p_member_id
           AND a.session_id = locked_challenge.session_id
      ) INTO already_present;

      IF already_present THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Attendance already recorded';
      END IF;

      INSERT INTO public.attendance (member_id, session_id, present)
      VALUES (p_member_id, locked_challenge.session_id, true);

      UPDATE public.attendance_challenges
         SET used_at = now()
       WHERE id = locked_challenge.id;

      RETURN QUERY SELECT
        true,
        current_session.id::text,
        current_session.title::text,
        current_session.date,
        true;
    END;
    $body$;
  $function$, users_id_type);
END
$$;

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

  EXECUTE format('REVOKE ALL ON FUNCTION public.record_attendance(%s, uuid) FROM PUBLIC, anon, authenticated', users_id_type);
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.record_attendance(%s, uuid) TO service_role', users_id_type);
END
$$;
