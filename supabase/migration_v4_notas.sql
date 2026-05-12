-- Migration V4: Notes table
CREATE TABLE IF NOT EXISTS notas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    contenido TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add titulo column if table already exists without it
ALTER TABLE notas ADD COLUMN IF NOT EXISTS titulo TEXT DEFAULT '';

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notas;
