-- Migration: Add es_lider to brigada_personal
ALTER TABLE brigada_personal ADD COLUMN IF NOT EXISTS es_lider BOOLEAN DEFAULT false;
