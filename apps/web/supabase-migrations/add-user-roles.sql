-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'editor';

-- Add check constraint to ensure role is valid
ALTER TABLE users DROP CONSTRAINT IF EXISTS valid_role;
ALTER TABLE users ADD CONSTRAINT valid_role
  CHECK (role IN ('admin', 'editor'));

-- Create index for filtering by role
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Update existing users to editor role (you can manually set your email to admin later)
UPDATE users SET role = 'editor' WHERE role IS NULL;
