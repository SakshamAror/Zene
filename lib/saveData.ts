import { supabase } from './supabase';
import { MeditationSession, WorkSession, JournalLog, Goal } from '@/types';

// Save a meditation session
export async function saveMeditationSession(session: Omit<MeditationSession, 'id'>) {
  const { data, error } = await supabase
    .from('meditation_sessions')
    .insert([session])
    .select();
  if (error) {
    console.error('Error saving meditation session:', error);
    throw error;
  }
  return data;
}

// Save a work session
export async function saveWorkSession(session: Omit<WorkSession, 'id'>) {
  const { data, error } = await supabase
    .from('work_sessions')
    .insert([session])
    .select();
  if (error) {
    console.error('Error saving work session:', error);
    throw error;
  }
  return data;
}

// Save a journal log
export async function saveJournalLog(log: Omit<JournalLog, 'id'>) {
  const { data, error } = await supabase
    .from('journal_logs')
    .upsert([log], {
      onConflict: 'user_id,date'
    })
    .select();
  if (error) {
    console.error('Error saving journal log:', error);
    throw error;
  }
  return data;
}

// Save a goal
export async function saveGoal(goal: Omit<Goal, 'id'>) {
  const { data, error } = await supabase
    .from('goals')
    .insert([goal])
    .select();
  if (error) {
    console.error('Error saving goal:', error);
    throw error;
  }
  return data;
}

// Update a goal
export async function updateGoal(id: number, updates: Partial<Goal>) {
  const { data, error } = await supabase
    .from('goals')
    .update(updates)
    .eq('id', id)
    .select();
  if (error) {
    console.error('Error updating goal:', error);
    throw error;
  }
  return data;
}

// Fetch all meditation sessions for a user
export async function getMeditationSessions(user_id: string): Promise<MeditationSession[]> {
  const { data, error } = await supabase
    .from('meditation_sessions')
    .select('*')
    .eq('user_id', user_id)
    .order('date', { ascending: false });
  if (error) {
    console.error('Error fetching meditation sessions:', error);
    throw error;
  }
  return data || [];
}

// Fetch all work sessions for a user
export async function getWorkSessions(user_id: string): Promise<WorkSession[]> {
  const { data, error } = await supabase
    .from('work_sessions')
    .select('*')
    .eq('user_id', user_id)
    .order('date', { ascending: false });
  if (error) {
    console.error('Error fetching work sessions:', error);
    throw error;
  }
  return data || [];
}

// Fetch all journal logs for a user
export async function getJournalLogs(user_id: string): Promise<JournalLog[]> {
  const { data, error } = await supabase
    .from('journal_logs')
    .select('*')
    .eq('user_id', user_id)
    .order('date', { ascending: false });
  if (error) {
    console.error('Error fetching journal logs:', error);
    throw error;
  }
  return data || [];
}

// Fetch all goals for a user
export async function getGoals(user_id: string): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user_id)
    .order('date_created', { ascending: false });
  if (error) {
    console.error('Error fetching goals:', error);
    throw error;
  }
  return data || [];
}

// Fetch all book summaries (global)
export async function getBookSummaries() {
  const { data, error } = await supabase
    .from('book_summaries')
    .select('*');
  if (error) {
    console.error('Error fetching book summaries:', error);
    throw error;
  }
  return data || [];
}

// Fetch all user book status for a user
export async function getUserBookStatus(user_id: string) {
  const { data, error } = await supabase
    .from('user_book_status')
    .select('*')
    .eq('user_id', user_id);
  if (error) {
    console.error('Error fetching user book status:', error);
    throw error;
  }
  return data || [];
}

// Upsert (insert or update) user book status (read/favourite)
export async function upsertUserBookStatus({ user_id, book_summary_id, is_favourite, read_at }: {
  user_id: string;
  book_summary_id: string;
  is_favourite: boolean;
  read_at: string;
}) {
  const { data, error } = await supabase
    .from('user_book_status')
    .upsert([
      { user_id, book_summary_id, is_favourite, read_at }
    ], { onConflict: 'user_id,book_summary_id' })
    .select();
  if (error) {
    console.error('Error upserting user book status:', error);
    throw error;
  }
  return data && data[0];
}