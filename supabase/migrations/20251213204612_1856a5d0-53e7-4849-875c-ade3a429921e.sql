-- Add GNV field to buildings table (Grundstücksnutzungsvertrag vorhanden)
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS gnv_vorhanden boolean DEFAULT false;