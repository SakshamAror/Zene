/*
  # Add missing RLS policies for complete CRUD operations

  1. Security Updates
    - Add SELECT policies for all tables to allow users to read their own data
    - Add UPDATE policies for goals table to allow users to update their goals
    - Add DELETE policies where needed
    - Fix default values and constraints

  2. Schema Improvements
    - Add proper default values for timestamps
    - Ensure proper data types and constraints
*/

-- Add SELECT policies for all tables
CREATE POLICY "Users can read own meditation sessions"
  ON meditation_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own work sessions"
  ON work_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own journal logs"
  ON journal_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own goals"
  ON goals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Add UPDATE policies
CREATE POLICY "Users can update own goals"
  ON goals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal logs"
  ON journal_logs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add DELETE policies
CREATE POLICY "Users can delete own goals"
  ON goals
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Fix the goals table to ensure proper defaults
DO $$
BEGIN
  -- Add default for date_created if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'goals' AND column_name = 'date_created' AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE goals ALTER COLUMN date_created SET DEFAULT CURRENT_DATE;
  END IF;

  -- Ensure completed has a default
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'goals' AND column_name = 'completed' AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE goals ALTER COLUMN completed SET DEFAULT false;
  END IF;

  -- Ensure user_id is not nullable
  ALTER TABLE goals ALTER COLUMN user_id SET NOT NULL;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_meditation_sessions_user_date ON meditation_sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_work_sessions_user_date ON work_sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_journal_logs_user_date ON journal_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_goals_user_completed ON goals(user_id, completed);