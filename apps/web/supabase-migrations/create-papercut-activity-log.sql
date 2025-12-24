-- Create papercut_activity table to track all actions on papercuts
CREATE TABLE IF NOT EXISTS papercut_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  papercut_id UUID NOT NULL REFERENCES papercuts(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL, -- 'created', 'edited', 'resolved', 'reopened'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_papercut_activity_papercut_id ON papercut_activity(papercut_id);
CREATE INDEX IF NOT EXISTS idx_papercut_activity_created_at ON papercut_activity(created_at DESC);

-- Insert initial activity records for existing papercuts (created action)
INSERT INTO papercut_activity (papercut_id, user_email, action, created_at)
SELECT
  id,
  COALESCE(user_email, 'Unknown'),
  'created',
  created_at
FROM papercuts
WHERE NOT EXISTS (
  SELECT 1 FROM papercut_activity
  WHERE papercut_activity.papercut_id = papercuts.id
  AND papercut_activity.action = 'created'
);
