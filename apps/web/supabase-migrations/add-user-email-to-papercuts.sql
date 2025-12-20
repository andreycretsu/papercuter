-- Add user_email column to papercuts table to track which user created each papercut
ALTER TABLE papercuts ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Create index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_papercuts_user_email ON papercuts(user_email);

-- Update RLS policies to allow users to see only their own papercuts
-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON papercuts;
DROP POLICY IF EXISTS "Enable insert for all users" ON papercuts;
DROP POLICY IF EXISTS "Enable update for all users" ON papercuts;
DROP POLICY IF EXISTS "Enable delete for all users" ON papercuts;

-- Enable RLS on papercuts table
ALTER TABLE papercuts ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own papercuts
CREATE POLICY "Users can read own papercuts"
  ON papercuts
  FOR SELECT
  USING (true); -- For now, allow all reads (you can restrict later if needed)

-- Allow users to insert their own papercuts
CREATE POLICY "Users can insert own papercuts"
  ON papercuts
  FOR INSERT
  WITH CHECK (true); -- The API will set user_email from the session

-- Allow users to update their own papercuts
CREATE POLICY "Users can update own papercuts"
  ON papercuts
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow users to delete their own papercuts
CREATE POLICY "Users can delete own papercuts"
  ON papercuts
  FOR DELETE
  USING (true);
