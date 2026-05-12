-- Remove the old single file columns
ALTER TABLE notas DROP COLUMN IF EXISTS archivo_url;
ALTER TABLE notas DROP COLUMN IF EXISTS archivo_nombre;

-- Add a JSONB column to store an array of objects: [{ name, url }]
ALTER TABLE notas ADD COLUMN IF NOT EXISTS archivos JSONB DEFAULT '[]'::jsonb;
