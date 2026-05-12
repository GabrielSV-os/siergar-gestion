-- Migration V3: Brigade Inventory Support
-- Adds tipo and horas columns to consumo_materiales

-- Add tipo column to distinguish between assignment and daily consumption
ALTER TABLE consumo_materiales ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'asignacion';

-- Add horas column for tracking hours worked (used for daily consumption)
ALTER TABLE consumo_materiales ADD COLUMN IF NOT EXISTS horas NUMERIC;

-- Update existing records to be assignments
UPDATE consumo_materiales SET tipo = 'asignacion' WHERE tipo IS NULL;
