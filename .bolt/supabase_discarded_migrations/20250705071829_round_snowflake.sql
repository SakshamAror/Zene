/*
  # Add missing columns to existing tables

  1. Changes to journal_logs table
    - Add `content` column (text) to store journal entry content
  
  2. Changes to work_sessions table  
    - Add `duration` column (integer) to store session duration in minutes

  3. Security
    - No changes to existing RLS policies needed
*/

-- Add content column to journal_logs table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'journal_logs' AND column_name = 'content'
  ) THEN
    ALTER TABLE journal_logs ADD COLUMN content text DEFAULT '';
  END IF;
END $$;

-- Add duration column to work_sessions table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_sessions' AND column_name = 'duration'
  ) THEN
    ALTER TABLE work_sessions ADD COLUMN duration integer DEFAULT 0;
  END IF;
END $$;