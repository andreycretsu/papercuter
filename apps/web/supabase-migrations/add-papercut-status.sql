-- Add status column to papercuts table
ALTER TABLE papercuts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';

-- Add check constraint to ensure status is valid
ALTER TABLE papercuts DROP CONSTRAINT IF EXISTS valid_papercut_status;
ALTER TABLE papercuts ADD CONSTRAINT valid_papercut_status
  CHECK (status IN ('open', 'resolved'));

-- Create index for filtering by status
CREATE INDEX IF NOT EXISTS idx_papercuts_status ON papercuts(status);

-- Update existing papercuts to 'open' status
UPDATE papercuts SET status = 'open' WHERE status IS NULL;
