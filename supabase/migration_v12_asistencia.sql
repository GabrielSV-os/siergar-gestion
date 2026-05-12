-- Create brigada_asistencia table
CREATE TABLE IF NOT EXISTS brigada_asistencia (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    brigada_id UUID REFERENCES brigadas(id) ON DELETE CASCADE,
    personal_id UUID REFERENCES personal(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    asistio BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(brigada_id, personal_id, fecha)
);

-- RLS
ALTER TABLE brigada_asistencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authentication users" 
ON brigada_asistencia FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all authenticated users" 
ON brigada_asistencia FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all authenticated users" 
ON brigada_asistencia FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for all authenticated users" 
ON brigada_asistencia FOR DELETE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_brigada_asistencia_brigada_fecha ON brigada_asistencia(brigada_id, fecha);
