-- Migration : tranche d'âge autorisée = 12 à 20 ans (inclus)
-- À exécuter dans Supabase > SQL Editor
ALTER TABLE users DROP CONSTRAINT IF EXISTS valid_age;
ALTER TABLE users ADD CONSTRAINT valid_age
  CHECK (EXTRACT(YEAR FROM AGE(birth_date)) BETWEEN 12 AND 20);
