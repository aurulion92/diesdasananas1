
-- =============================================
-- DECISION TREE SYSTEM
-- =============================================

-- Enum für Knotentypen
CREATE TYPE public.decision_node_type AS ENUM ('condition', 'action');

-- Enum für Aktionstypen
CREATE TYPE public.decision_action_type AS ENUM (
  'show_products',      -- Zeige Produkte (mit Filtern)
  'show_contact_form',  -- Zeige Kontaktformular
  'show_message',       -- Zeige Nachricht
  'redirect',           -- Weiterleitung zu URL
  'show_gnv_form'       -- Zeige GNV Formular
);

-- Enum für Operatoren
CREATE TYPE public.decision_operator AS ENUM (
  'equals',
  'not_equals',
  'is_null',
  'is_not_null',
  'in_list',
  'not_in_list',
  'greater_than',
  'less_than'
);

-- Haupttabelle für Entscheidungsbäume (kann mehrere geben, z.B. für PK/KMU)
CREATE TABLE public.decision_trees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  customer_type text NOT NULL DEFAULT 'pk',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Knoten im Entscheidungsbaum
CREATE TABLE public.decision_tree_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid NOT NULL REFERENCES public.decision_trees(id) ON DELETE CASCADE,
  name text NOT NULL,
  node_type decision_node_type NOT NULL,
  is_root boolean NOT NULL DEFAULT false,
  -- Position für visuelle Darstellung
  position_x integer NOT NULL DEFAULT 0,
  position_y integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Verbindungen zwischen Knoten
CREATE TABLE public.decision_tree_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid NOT NULL REFERENCES public.decision_trees(id) ON DELETE CASCADE,
  source_node_id uuid NOT NULL REFERENCES public.decision_tree_nodes(id) ON DELETE CASCADE,
  target_node_id uuid NOT NULL REFERENCES public.decision_tree_nodes(id) ON DELETE CASCADE,
  -- Label für die Kante (z.B. "Ja", "Nein", "ftth")
  label text,
  -- Reihenfolge wenn mehrere Kanten vom gleichen Knoten ausgehen
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Bedingungen für Condition-Knoten
CREATE TABLE public.decision_tree_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL REFERENCES public.decision_tree_nodes(id) ON DELETE CASCADE,
  -- Welches Feld wird geprüft
  field_name text NOT NULL, -- z.B. 'ausbau_art', 'ausbau_status', 'kabel_tv_available', 'gnv_vorhanden'
  operator decision_operator NOT NULL DEFAULT 'equals',
  -- Wert zum Vergleichen (kann JSON sein für in_list)
  compare_value text,
  -- Mehrere Bedingungen pro Knoten = AND-Verknüpfung
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Aktionen für Action-Knoten
CREATE TABLE public.decision_tree_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL REFERENCES public.decision_tree_nodes(id) ON DELETE CASCADE,
  action_type decision_action_type NOT NULL,
  -- Konfiguration als JSON (flexibel je nach Aktionstyp)
  -- z.B. {"product_filter": {"is_ftth": true}, "message": "...", "url": "..."}
  config jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- PROTECTED FIELDS FÜR BUILDINGS
-- =============================================

-- Spalte für geschützte Felder hinzufügen
ALTER TABLE public.buildings 
ADD COLUMN IF NOT EXISTS protected_fields text[] DEFAULT '{}';

-- Kommentar zur Dokumentation
COMMENT ON COLUMN public.buildings.protected_fields IS 
'Array of field names that should not be overwritten by imports. E.g. ["ausbau_art", "pk_tariffs_available"]';

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.decision_trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_tree_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_tree_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_tree_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_tree_actions ENABLE ROW LEVEL SECURITY;

-- Admins können alles verwalten
CREATE POLICY "Admins can manage decision trees" ON public.decision_trees
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage decision tree nodes" ON public.decision_tree_nodes
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage decision tree edges" ON public.decision_tree_edges
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage decision tree conditions" ON public.decision_tree_conditions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage decision tree actions" ON public.decision_tree_actions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Public kann aktive Trees lesen (für die Bestellstrecke)
CREATE POLICY "Public can read active decision trees" ON public.decision_trees
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public can read decision tree nodes" ON public.decision_tree_nodes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.decision_trees WHERE id = tree_id AND is_active = true)
  );

CREATE POLICY "Public can read decision tree edges" ON public.decision_tree_edges
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.decision_trees WHERE id = tree_id AND is_active = true)
  );

CREATE POLICY "Public can read decision tree conditions" ON public.decision_tree_conditions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.decision_tree_nodes n
      JOIN public.decision_trees t ON t.id = n.tree_id
      WHERE n.id = node_id AND t.is_active = true
    )
  );

CREATE POLICY "Public can read decision tree actions" ON public.decision_tree_actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.decision_tree_nodes n
      JOIN public.decision_trees t ON t.id = n.tree_id
      WHERE n.id = node_id AND t.is_active = true
    )
  );

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_decision_tree_nodes_tree_id ON public.decision_tree_nodes(tree_id);
CREATE INDEX idx_decision_tree_edges_tree_id ON public.decision_tree_edges(tree_id);
CREATE INDEX idx_decision_tree_edges_source ON public.decision_tree_edges(source_node_id);
CREATE INDEX idx_decision_tree_edges_target ON public.decision_tree_edges(target_node_id);
CREATE INDEX idx_decision_tree_conditions_node ON public.decision_tree_conditions(node_id);
CREATE INDEX idx_decision_tree_actions_node ON public.decision_tree_actions(node_id);

-- =============================================
-- TRIGGERS für updated_at
-- =============================================

CREATE TRIGGER update_decision_trees_updated_at
  BEFORE UPDATE ON public.decision_trees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_decision_tree_nodes_updated_at
  BEFORE UPDATE ON public.decision_tree_nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
