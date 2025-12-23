-- ============================================================================
-- COPY AND PASTE THIS ENTIRE BLOCK INTO YOUR SUPABASE SQL EDITOR AND RUN IT
-- ============================================================================
--
-- This removes the unique constraint that prevents unlimited likes.
-- After running this, users can like papercuts as many times as they want.
--

DO $$
DECLARE
    constraint_name text;
    dropped_count integer := 0;
BEGIN
    FOR constraint_name IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'papercut_likes'::regclass
        AND contype = 'u'
    LOOP
        EXECUTE format('ALTER TABLE papercut_likes DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
        dropped_count := dropped_count + 1;
    END LOOP;

    IF dropped_count = 0 THEN
        RAISE NOTICE 'No unique constraints found to drop';
    ELSE
        RAISE NOTICE 'Successfully dropped % constraint(s)', dropped_count;
    END IF;
END $$;

-- ============================================================================
-- DONE! You should see a success message above.
-- Now go back to your app and try clicking the like button.
-- ============================================================================
