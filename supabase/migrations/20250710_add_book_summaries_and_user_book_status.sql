-- Book summaries table (global, added by admin)
CREATE TABLE IF NOT EXISTS book_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text NOT NULL
);

-- User book status table (logs which user has read/favourited which summary)
CREATE TABLE IF NOT EXISTS user_book_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_summary_id uuid NOT NULL REFERENCES book_summaries(id) ON DELETE CASCADE,
  is_favourite boolean NOT NULL DEFAULT false,
  read_at date NOT NULL,
  UNIQUE (user_id, book_summary_id)
);

-- Policy: Only allow users to see their own status
-- (You may want to adjust this for your app's needs)
-- Example RLS policy:
ALTER TABLE user_book_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own book status"
  ON user_book_status
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own book status"
  ON user_book_status
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own book status"
  ON user_book_status
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Book summaries are public (all users can read)
ALTER TABLE book_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users can read book summaries"
  ON book_summaries
  FOR SELECT
  TO public
  USING (true);

-- (Optional) Only admin can insert/update/delete book summaries
-- You can add more policies for admin-only write access if needed.
