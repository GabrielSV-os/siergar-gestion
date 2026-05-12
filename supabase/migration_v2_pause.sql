-- =============================================
-- MIGRATION V2: Add 'pausado' state + project history table
-- Run this in the Supabase SQL Editor
-- =============================================

-- 1. Drop old CHECK constraint and add new one with 'pausado'
ALTER TABLE proyectos DROP CONSTRAINT IF EXISTS proyectos_estado_check;
ALTER TABLE proyectos ADD CONSTRAINT proyectos_estado_check 
  CHECK (estado IN ('activo', 'completado', 'cancelado', 'pausado'));

-- 2. Add motivo_pausa column to proyectos
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS motivo_pausa TEXT;

-- 3. Create project history table for state changes
CREATE TABLE IF NOT EXISTS proyecto_historial (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE CASCADE,
  estado_anterior TEXT NOT NULL,
  estado_nuevo TEXT NOT NULL,
  motivo TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proyecto_historial_proyecto ON proyecto_historial(proyecto_id);

-- 4. RLS for new table
ALTER TABLE proyecto_historial ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON proyecto_historial FOR ALL USING (true) WITH CHECK (true);
