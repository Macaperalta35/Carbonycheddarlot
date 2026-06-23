-- ================================================================
-- Carbon & Cheddar POS — Esquema de Base de Datos en Supabase
-- ================================================================
-- Cómo usar:
-- 1. Ve a tu proyecto en supabase.com
-- 2. Abre: SQL Editor → New query
-- 3. Pega TODO este contenido y haz clic en "Run"
-- ================================================================


-- ── TABLA: menu_items ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.menu_items (
  id          TEXT        PRIMARY KEY,
  name        TEXT        NOT NULL DEFAULT '',
  price       INTEGER     NOT NULL DEFAULT 0,
  category    TEXT        NOT NULL DEFAULT '',
  emoji       TEXT        DEFAULT '',
  description TEXT        DEFAULT '',
  stock       INTEGER     NOT NULL DEFAULT 0,
  variants    JSONB       DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── TABLA: orders ─────────────────────────────────────────────
-- Nota: "number" y "table" van entre comillas por ser palabras reservadas en SQL.
CREATE TABLE IF NOT EXISTS public.orders (
  id               BIGINT      PRIMARY KEY,
  "number"         INTEGER,
  type             TEXT        DEFAULT '',
  "table"          TEXT        DEFAULT '',
  items            JSONB       DEFAULT '[]'::jsonb,
  discount         INTEGER     DEFAULT 0,
  total            INTEGER     NOT NULL DEFAULT 0,
  "paymentMethod"  TEXT        DEFAULT '',
  "cashReceived"   INTEGER,
  notes            TEXT        DEFAULT '',
  "customerName"   TEXT        DEFAULT '',
  "customerEmail"  TEXT        DEFAULT '',
  phone            TEXT        DEFAULT '',
  "pickupTime"     TEXT        DEFAULT '',
  status           TEXT        DEFAULT 'Pendiente',
  timestamp        BIGINT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Migración para bases ya creadas (agrega columnas nuevas si faltan):
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "customerEmail" TEXT DEFAULT '';

-- ── TABLA: egresos ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.egresos (
  id               BIGINT      PRIMARY KEY,
  date             TEXT        NOT NULL DEFAULT '',
  category         TEXT        NOT NULL DEFAULT '',
  description      TEXT        NOT NULL DEFAULT '',
  amount           INTEGER     NOT NULL DEFAULT 0,
  "paymentMethod"  TEXT        DEFAULT '',
  supplier         TEXT        DEFAULT '',
  notes            TEXT        DEFAULT '',
  timestamp        BIGINT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── TABLA: compras ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.compras (
  id               BIGINT      PRIMARY KEY,
  "docType"        TEXT        DEFAULT 'Factura',
  "docNumber"      TEXT        DEFAULT '',
  supplier         TEXT        NOT NULL DEFAULT '',
  date             TEXT        NOT NULL DEFAULT '',
  category         TEXT        DEFAULT '',
  description      TEXT        DEFAULT '',
  net              INTEGER     DEFAULT 0,
  iva              INTEGER     DEFAULT 0,
  total            INTEGER     NOT NULL DEFAULT 0,
  "paymentMethod"  TEXT        DEFAULT '',
  status           TEXT        DEFAULT 'Pendiente',
  notes            TEXT        DEFAULT '',
  timestamp        BIGINT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);


-- ── TABLA: insumos ────────────────────────────────────────────
-- Inventario de materias primas / ingredientes (pan, carne, queso, etc.)
CREATE TABLE IF NOT EXISTS public.insumos (
  id          TEXT        PRIMARY KEY,
  name        TEXT        NOT NULL DEFAULT '',
  unit        TEXT        NOT NULL DEFAULT 'un',
  stock       NUMERIC     NOT NULL DEFAULT 0,
  "minStock"  NUMERIC     NOT NULL DEFAULT 0,
  cost        INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── TABLA: recetas ────────────────────────────────────────────
-- Relación producto → ingredientes. "id" = id del producto (menu_items).
-- ingredients: [{ "insumoId": "...", "qty": 1 }]
CREATE TABLE IF NOT EXISTS public.recetas (
  id           TEXT        PRIMARY KEY,
  "productName" TEXT       DEFAULT '',
  ingredients  JSONB       DEFAULT '[]'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── TABLA: settings ───────────────────────────────────────────
-- Configuración global del sistema (ej. activar/desactivar pedidos online).
CREATE TABLE IF NOT EXISTS public.settings (
  id          TEXT        PRIMARY KEY,
  enabled     BOOLEAN     DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- SEGURIDAD: Row Level Security (RLS)
-- Permite acceso completo con la anon key del proyecto.
-- Para producción real, revisa estas políticas.
-- ================================================================

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.egresos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insumos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recetas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings   ENABLE ROW LEVEL SECURITY;

-- Políticas: acceso completo para la clave anónima
DROP POLICY IF EXISTS "anon_all_menu_items" ON public.menu_items;
CREATE POLICY "anon_all_menu_items" ON public.menu_items
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_orders" ON public.orders;
CREATE POLICY "anon_all_orders" ON public.orders
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_egresos" ON public.egresos;
CREATE POLICY "anon_all_egresos" ON public.egresos
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_compras" ON public.compras;
CREATE POLICY "anon_all_compras" ON public.compras
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_insumos" ON public.insumos;
CREATE POLICY "anon_all_insumos" ON public.insumos
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_recetas" ON public.recetas;
CREATE POLICY "anon_all_recetas" ON public.recetas
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_settings" ON public.settings;
CREATE POLICY "anon_all_settings" ON public.settings
  FOR ALL TO anon USING (true) WITH CHECK (true);


-- ================================================================
-- TIEMPO REAL: Habilitar Realtime para sincronización entre
-- múltiples dispositivos (cajas, tablets, etc.)
-- Idempotente: solo agrega las tablas que aún no están en la publicación,
-- para poder re-ejecutar este script sin el error 42710.
-- ================================================================

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['menu_items','orders','egresos','compras','insumos','recetas','settings'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
