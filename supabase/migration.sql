-- =============================================
-- SISTEMA DE GESTIÓN DE MATERIALES - SIERGAR
-- Supabase Migration Script
-- =============================================

-- 1. Materiales (catálogo maestro)
CREATE TABLE IF NOT EXISTS materiales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT,
  nombre TEXT NOT NULL,
  unidad TEXT NOT NULL DEFAULT 'unidad',
  descripcion TEXT,
  es_predefinido BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Inventario (stock actual por material)
CREATE TABLE IF NOT EXISTS inventario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID REFERENCES materiales(id) ON DELETE CASCADE,
  cantidad NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(material_id)
);

-- 3. Brigadas
CREATE TABLE IF NOT EXISTS brigadas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Personal técnico
CREATE TABLE IF NOT EXISTS personal (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  cedula TEXT UNIQUE,
  cargo TEXT,
  telefono TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Asignación de personal a brigadas (con histórico)
CREATE TABLE IF NOT EXISTS brigada_personal (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brigada_id UUID REFERENCES brigadas(id) ON DELETE CASCADE,
  personal_id UUID REFERENCES personal(id) ON DELETE CASCADE,
  fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_salida DATE,
  activo BOOLEAN DEFAULT true,
  motivo_cambio TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Proyectos
CREATE TABLE IF NOT EXISTS proyectos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  ubicacion TEXT,
  fecha_inicio DATE,
  fecha_fin DATE,
  estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'completado', 'cancelado')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Asignación de brigadas a proyectos
CREATE TABLE IF NOT EXISTS proyecto_brigada (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE CASCADE,
  brigada_id UUID REFERENCES brigadas(id) ON DELETE CASCADE,
  fecha_asignacion DATE DEFAULT CURRENT_DATE,
  activa BOOLEAN DEFAULT true,
  UNIQUE(proyecto_id, brigada_id)
);

-- 8. Consumo diario de materiales por proyecto/brigada
CREATE TABLE IF NOT EXISTS consumo_materiales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE CASCADE,
  brigada_id UUID REFERENCES brigadas(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materiales(id) ON DELETE CASCADE,
  cantidad NUMERIC NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  hora_inicio TIME,
  hora_fin TIME,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Movimientos de inventario (entradas/salidas)
CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID REFERENCES materiales(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  cantidad NUMERIC NOT NULL,
  descripcion TEXT,
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE SET NULL,
  brigada_id UUID REFERENCES brigadas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_inventario_material ON inventario(material_id);
CREATE INDEX IF NOT EXISTS idx_consumo_proyecto ON consumo_materiales(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_consumo_brigada ON consumo_materiales(brigada_id);
CREATE INDEX IF NOT EXISTS idx_consumo_fecha ON consumo_materiales(fecha);
CREATE INDEX IF NOT EXISTS idx_consumo_material ON consumo_materiales(material_id);
CREATE INDEX IF NOT EXISTS idx_brigada_personal_brigada ON brigada_personal(brigada_id);
CREATE INDEX IF NOT EXISTS idx_brigada_personal_personal ON brigada_personal(personal_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_material ON movimientos_inventario(material_id);
CREATE INDEX IF NOT EXISTS idx_proyecto_brigada_proyecto ON proyecto_brigada(proyecto_id);

-- =============================================
-- ROW LEVEL SECURITY (permitir todo por ahora, auth se agrega después)
-- =============================================
ALTER TABLE materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE brigadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE brigada_personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyecto_brigada ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumo_materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;

-- Policies: allow all for anon (temporal, se restringe cuando se implemente auth)
CREATE POLICY "Allow all for anon" ON materiales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON inventario FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON brigadas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON personal FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON brigada_personal FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON proyectos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON proyecto_brigada FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON consumo_materiales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON movimientos_inventario FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- MATERIALES PREDEFINIDOS (del Excel)
-- =============================================
INSERT INTO materiales (codigo, nombre, es_predefinido) VALUES
  ('1001094', 'ABRAZADERA CRUCE P/SUJETAR M', true),
  ('1000475', 'ABRAZADERA CUADRADA C/TORNILLO Y TUERCA', true),
  ('1000474', 'ABRAZADERA REDONDA C/TORNILLO Y TUERCA', true),
  ('100101J', 'ALAMBRE AMARRE ROLLO 1200FT', true),
  ('1001044', 'ALAMBRE MENSAJERO TRENZADO 1/4 RL=1000FT', true),
  ('1022052', 'ALUMINIO 1350 HDB #4 AAC', true),
  ('1000713', 'AMARRADERA CABLE 4"X 4.6 MM', true),
  ('1000714', 'AMARRADERA CABLE 8''X 4.6 MM', true),
  ('1000415', 'ANCLA EXPANSION 8 IN RED.8813', true),
  ('1000446', 'ARANDELA CUADRADA 2-IN', true),
  ('1000473', 'BRAZO TENSOR P/CABLE', true),
  ('1001252', 'CINTA BAND IT 1/2X100 P/ATERRIZAJE', true),
  ('1001050', 'CINTA VINIL 88T 1 1/2 X 44', true),
  ('1000S93', 'CLAMP PEQUEÑO SI-2175', true),
  ('1000576', 'CONECTOR P/ALAMBRE DE TIERRA', true),
  ('1001053', 'CONECTOR P/VARILLA DE TIERRA 5', true),
  ('1001037', 'EMPALME P/ALAMBRE MENSAJERO 1/4 REF.500', true),
  ('4000672', 'FIBER OPT 12 MIL SINGLE ARMOR/LOOSE TUBE', true),
  ('4000670', 'FIBER OPT 24 MIL SINGLE ARMOR/LOOSE TUBE', true),
  ('4000669', 'FIBER OPT 48 MIL SINGLE ARMOR', true),
  ('1016530', 'FIBRA OPT 2 HILOS', true),
  ('1000479', 'GANCHO TENSOR B 10M REF. SI-44', true),
  ('1001010', 'GRAPA SUSPENSION ALP P/CABLES 2 T', true),
  ('1000467', 'GRIP 1/4 PARA SUJETAR CABLE', true),
  ('1000344', 'HEBILLAS 201 DE 1/2 SS (MX=100)', true),
  ('1001051', 'HEBILLAS PLASTICAS CSS-LH (T&B)', true),
  ('1000399', 'IDENTIFICADOR DE FO AUTO-ENRO FO 2 HILO', true),
  ('1000529', 'LETRA H REFLECTIVA NEGRA FONDO AMARILLO', true),
  ('1000543', 'LETRA A REFLECTIVA NEGRA FONDO AMARILLO', true),
  ('1000532', 'LETRA C REFLECTIVA NEGRA FONDO AMARILLO', true),
  ('1000527', 'LETRA F REFLECTIVA NEGRA FONDO AMARILLO', true),
  ('1000531', 'LETRA J REFLECTIVA NEGRA FONDO AMARILLO', true),
  ('1000533', 'LETRA K REFLECTIVA NEGRA FONDO AMARILLO', true),
  ('1000541', 'LETRA L REFLECTIVA NEGRA FONDO AMARILLO', true),
  ('10000534', 'LETRA M REFLECTIVA NEGRA FONDO AMARILLO', true),
  ('1000535', 'LETRA N REFLECTIVA NEGRA FONDO AMARILLO', true),
  ('1001191', 'LETRA V REFLECTIVA NEGRA FONDO AMARILLO', true),
  ('1001192', 'LETRA W REFLECTIVA NEGRA FONDO AMARILLO', true),
  ('1000526', 'LETRA E REFLECTIVA NEGRA FONDO AMARILLO', true),
  ('1000536', 'LETRA O Y NUMERO 0 REFLECTIVOS (NEG/AMA)', true),
  ('1001007', 'MANGA TERMINAL FIBRA O-C5603B (AGREGACION)', true),
  ('1000413', 'MINITERMINAL INT.SC/APC C/SPL', true),
  ('1001196', 'NUMERO 1 REFLECTIVO NEGRO FONDO AMARILLO', true),
  ('1001197', 'NUMERO 2 REFLECTIVO NEGRO FONDO AMARILLO', true),
  ('1000970', 'NUMERO 3 REFLECTIVO NEGRO FONDO AMARILLO', true),
  ('1001262', 'NUMERO 4 REFLECTIVO NEGRO FONDO AMARILLO', true),
  ('1000968', 'NUMERO 5 REFLECTIVO NEGRO FONDO AMARILLO', true),
  ('1000784', 'NUMERO 6 Y 9 REFLECTIVO NEGRO FONDO AMARILLO', true),
  ('1000670', 'NUMERO 7 REFLECTIVO NEGRO FONDO AMARILLO', true),
  ('1000682', 'NUMERO 8 REFLECTIVO NEGRO FONDO AMARILLO', true),
  ('4000299', 'POSTE MADERA DE 25FT CCA', true),
  ('1000478', 'PROTECTOR ALAMBRE DE TIERRA PM', true),
  ('TC-001', 'TORNILLO COMUN', true),
  ('TO-001', 'TUERCA DE OJO', true),
  ('MT-001', 'MEDIO TABACO', true),
  ('HP-001', 'HOYOS DE POSTE', true),
  ('1000477', 'PROTECTOR DE VIENTO METALICO R', true);

-- Create inventory records for all predefined materials (initial stock = 0)
INSERT INTO inventario (material_id, cantidad)
SELECT id, 0 FROM materiales WHERE es_predefinido = true;
