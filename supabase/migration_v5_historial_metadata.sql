-- Add metadata column to proyecto_historial table
ALTER TABLE proyecto_historial ADD COLUMN IF NOT EXISTS metadata JSONB;
