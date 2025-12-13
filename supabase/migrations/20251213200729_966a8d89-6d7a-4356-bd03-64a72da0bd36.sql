-- Add unique constraint for upsert capability
ALTER TABLE public.buildings 
ADD CONSTRAINT buildings_address_unique 
UNIQUE (street, house_number, city);