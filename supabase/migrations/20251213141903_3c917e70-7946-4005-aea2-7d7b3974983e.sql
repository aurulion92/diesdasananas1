-- Add import batch tracking for undo functionality
ALTER TABLE csv_import_logs 
ADD COLUMN IF NOT EXISTS affected_building_ids uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS previous_states jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS is_reverted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS reverted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS reverted_by uuid;

-- Add batch_id to buildings to track which import created/modified them
ALTER TABLE buildings
ADD COLUMN IF NOT EXISTS last_import_batch_id uuid REFERENCES csv_import_logs(id);

-- Index for faster undo operations
CREATE INDEX IF NOT EXISTS idx_buildings_import_batch ON buildings(last_import_batch_id);

-- Add CSV import settings to app_settings if not exists
INSERT INTO app_settings (key, value)
VALUES ('csv_import_settings', '{"ignore_patterns": ["flurstück"], "default_mode": "manual"}'::jsonb)
ON CONFLICT (key) DO NOTHING;