-- Create papercut_likes table
CREATE TABLE IF NOT EXISTS papercut_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  papercut_id UUID NOT NULL REFERENCES papercuts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(papercut_id, user_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_papercut_likes_papercut_id ON papercut_likes(papercut_id);
CREATE INDEX IF NOT EXISTS idx_papercut_likes_user_id ON papercut_likes(user_id);

-- Enable RLS
ALTER TABLE papercut_likes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view likes
CREATE POLICY "Anyone can view likes"
  ON papercut_likes
  FOR SELECT
  USING (true);

-- Policy: Users can like papercuts
CREATE POLICY "Users can like papercuts"
  ON papercut_likes
  FOR INSERT
  WITH CHECK (true);

-- Policy: Users can unlike their own likes
CREATE POLICY "Users can delete own likes"
  ON papercut_likes
  FOR DELETE
  USING (user_id::text = auth.uid()::text);
