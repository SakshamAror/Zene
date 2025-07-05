/*
  # Add created_at column to work_sessions table

  1. Changes
    - Add `created_at` column to `work_sessions` table with default value of `now()`
    - Add `created_at` column to `meditation_sessions` table with default value of `now()`
    - Update existing records to have a created_at timestamp

  2. Security
    - No changes to existing RLS policies
*/

-- Add created_at column to work_sessions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_sessions' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE work_sessions ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add created_at column to meditation_sessions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meditation_sessions' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE meditation_sessions ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Update existing records to have created_at based on date if they don't have it
UPDATE work_sessions 
SET created_at = date::timestamptz 
WHERE created_at IS NULL;

UPDATE meditation_sessions 
SET created_at = date::timestamptz 
WHERE created_at IS NULL;