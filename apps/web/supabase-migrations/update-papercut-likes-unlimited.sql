-- Drop the unique constraint to allow multiple likes per user
ALTER TABLE papercut_likes DROP CONSTRAINT IF EXISTS papercut_likes_papercut_id_user_id_key;

-- The table now allows unlimited likes from the same user
