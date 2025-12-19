-- Add new operators to the enum
ALTER TYPE public.decision_operator ADD VALUE IF NOT EXISTS 'contains';
ALTER TYPE public.decision_operator ADD VALUE IF NOT EXISTS 'not_contains';
ALTER TYPE public.decision_operator ADD VALUE IF NOT EXISTS 'starts_with';
ALTER TYPE public.decision_operator ADD VALUE IF NOT EXISTS 'greater_or_equal';
ALTER TYPE public.decision_operator ADD VALUE IF NOT EXISTS 'less_or_equal';

-- Add new action types to the enum
ALTER TYPE public.decision_action_type ADD VALUE IF NOT EXISTS 'filter_buildings_dropdown';
ALTER TYPE public.decision_action_type ADD VALUE IF NOT EXISTS 'set_connection_type';