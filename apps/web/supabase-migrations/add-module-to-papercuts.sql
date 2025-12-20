-- Add module column to papercuts table
ALTER TABLE papercuts ADD COLUMN IF NOT EXISTS module TEXT;

-- Create index for filtering by module
CREATE INDEX IF NOT EXISTS idx_papercuts_module ON papercuts(module);

-- Add check constraint to ensure module is one of the valid values
ALTER TABLE papercuts ADD CONSTRAINT valid_module
  CHECK (module IS NULL OR module IN ('CoreHR', 'Recruit', 'Perform', 'Pulse', 'Time', 'Desk'));
