-- =============================================
-- Migration V9: Project Warehouse, Returns & Expenses
-- =============================================

-- 1. Almacén de proyecto (stock de materiales asignados al proyecto)
CREATE TABLE IF NOT EXISTS proyecto_inventario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materiales(id) ON DELETE CASCADE,
  cantidad NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(proyecto_id, material_id)
);

-- 2. Devolución de materiales del proyecto al inventario global
CREATE TABLE IF NOT EXISTS proyecto_devolucion (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materiales(id) ON DELETE CASCADE,
  cantidad NUMERIC NOT NULL,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Gastos del proyecto
CREATE TABLE IF NOT EXISTS proyecto_gastos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  categoria TEXT NOT NULL CHECK (categoria IN ('brigadas', 'combustible', 'dieta', 'mantenimiento_vehiculo', 'estadia', 'otros')),
  monto NUMERIC NOT NULL,
  titulo TEXT,
  comentario TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_proyecto_inventario_proyecto ON proyecto_inventario(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_proyecto_inventario_material ON proyecto_inventario(material_id);
CREATE INDEX IF NOT EXISTS idx_proyecto_devolucion_proyecto ON proyecto_devolucion(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_proyecto_gastos_proyecto ON proyecto_gastos(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_proyecto_gastos_fecha ON proyecto_gastos(fecha);

-- RLS
ALTER TABLE proyecto_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyecto_devolucion ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyecto_gastos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon" ON proyecto_inventario FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON proyecto_devolucion FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON proyecto_gastos FOR ALL USING (true) WITH CHECK (true);
