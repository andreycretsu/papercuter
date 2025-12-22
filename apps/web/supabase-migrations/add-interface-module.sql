-- Add Interface to the valid modules constraint
-- This migration adds 'Interface' as a valid module option

ALTER TABLE papercuts DROP CONSTRAINT IF EXISTS valid_module;
ALTER TABLE papercuts ADD CONSTRAINT valid_module
  CHECK (module IS NULL OR module IN ('CoreHR', 'Recruit', 'Perform', 'Pulse', 'Time', 'Desk', 'Interface'));

