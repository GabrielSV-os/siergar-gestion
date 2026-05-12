-- Catálogo de materiales para fabricación de herrajes
CREATE TABLE fabricacion_catalogo (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  precio_estandar NUMERIC NOT NULL DEFAULT 0,
  unidad TEXT DEFAULT 'unidad',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Lotes de fabricación
CREATE TABLE fabricacion_lotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL,
  descripcion TEXT,
  fecha DATE DEFAULT CURRENT_DATE,
  cantidad_herrajes INTEGER NOT NULL DEFAULT 1,
  precio_venta_unitario NUMERIC NOT NULL DEFAULT 0,
  estado TEXT DEFAULT 'activo',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Materiales usados por lote
CREATE TABLE fabricacion_materiales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lote_id UUID REFERENCES fabricacion_lotes(id) ON DELETE CASCADE,
  catalogo_id UUID REFERENCES fabricacion_catalogo(id),
  cantidad NUMERIC NOT NULL DEFAULT 0,
  precio_unitario NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE fabricacion_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabricacion_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabricacion_materiales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON fabricacion_catalogo FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON fabricacion_lotes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON fabricacion_materiales FOR ALL USING (true) WITH CHECK (true);

-- Datos iniciales del catálogo (de la imagen proporcionada)
INSERT INTO fabricacion_catalogo (nombre, precio_estandar) VALUES
('Tubos', 640),
('Planchuelas 4x 1/4', 2435),
('Planchuela 1/2x 3/16', 235),
('Planchuelas 3x 3/16', 1765),
('Arandela', 7),
('Lata de pintura', 1400),
('Plancha de goma', 400),
('Barras 6 pies', 275);
