-- Add type column to papercuts table
ALTER TABLE papercuts
ADD COLUMN type TEXT DEFAULT 'UXUI' NOT NULL;

-- Add check constraint for valid types
ALTER TABLE papercuts
ADD CONSTRAINT valid_papercut_type CHECK (type IN ('UXUI', 'Feature Idea'));

-- Add index for type filtering
CREATE INDEX IF NOT EXISTS idx_papercuts_type ON papercuts(type);

-- Comment on the column
COMMENT ON COLUMN papercuts.type IS 'Type of papercut: UXUI (default) or Feature Idea';
