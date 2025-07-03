/*
  # Add unique constraint to journal_logs table

  1. Changes
    - Add unique constraint on `user_id` and `date` columns in `journal_logs` table
    - This allows upsert operations to work correctly by ensuring only one journal entry per user per date

  2. Security
    - No changes to existing RLS policies
    - Maintains data integrity by preventing duplicate journal entries for the same user on the same date
*/

-- Add unique constraint to journal_logs table for user_id and date
ALTER TABLE journal_logs 
ADD CONSTRAINT unique_journal_user_date UNIQUE (user_id, date);