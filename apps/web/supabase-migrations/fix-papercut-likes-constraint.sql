-- IMPORTANT: Run this in your Supabase SQL Editor to enable unlimited likes
--
-- This migration removes the unique constraint that prevents users from liking
-- a papercut multiple times.
--
-- Step 1: Check current constraints (optional - for verification)
-- Run this query to see what constraints exist:
/*
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'papercut_likes'::regclass;
*/

-- Step 2: Drop all unique constraints on papercut_likes
-- This handles both named and auto-generated constraint names
DO $$
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'papercut_likes'::regclass
        AND contype = 'u'  -- 'u' means unique constraint
    LOOP
        EXECUTE format('ALTER TABLE papercut_likes DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- Step 3: Verify the constraint was dropped (optional - for verification)
/*
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'papercut_likes'::regclass;
-- Should show no unique constraints
*/

-- The table now allows unlimited likes from the same user!
