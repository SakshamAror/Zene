import { supabase } from './supabase';
import { offlineStorage } from './offlineStorage';
import { MeditationSession, WorkSession, JournalLog, Goal } from '../types';

// Save a meditation session
export async function saveMeditationSession(session: Omit<MeditationSession, 'id'>) {
  return await offlineStorage.saveMeditationSession(session);
}

// Save a work session
export async function saveWorkSession(session: Omit<WorkSession, 'id'>) {
  return await offlineStorage.saveWorkSession(session);
}

// Save a journal log
export async function saveJournalLog(log: Omit<JournalLog, 'id'>) {
  return await offlineStorage.saveJournalLog(log);
}

// Save a goal
export async function saveGoal(goal: Omit<Goal, 'id'>) {
  return await offlineStorage.saveGoal(goal);
}

// Update a goal
export async function updateGoal(id: number, updates: Partial<Goal>) {
  return await offlineStorage.updateGoal(id, updates);
}

// Fetch all meditation sessions for a user
export async function getMeditationSessions(user_id: string): Promise<MeditationSession[]> {
  return await offlineStorage.getMeditationSessions(user_id);
}

// Fetch all work sessions for a user
export async function getWorkSessions(user_id: string): Promise<WorkSession[]> {
  return await offlineStorage.getWorkSessions(user_id);
}

// Fetch all journal logs for a user
export async function getJournalLogs(user_id: string): Promise<JournalLog[]> {
  return await offlineStorage.getJournalLogs(user_id);
}

// Fetch all goals for a user
export async function getGoals(user_id: string): Promise<Goal[]> {
  return await offlineStorage.getGoals(user_id);
}

// Fetch all book summaries (global)
export async function getBookSummaries() {
  return await offlineStorage.getBookSummaries();
}

// Fetch all user book status for a user
export async function getUserBookStatus(user_id: string) {
  return await offlineStorage.getUserBookStatus(user_id);
}

// Upsert (insert or update) user book status (read/favourite)
export async function upsertUserBookStatus({ user_id, book_summary_id, is_favourite, read_at }: {
  user_id: string;
  book_summary_id: string;
  is_favourite: boolean;
  read_at: string;
}) {
  return await offlineStorage.upsertUserBookStatus({ user_id, book_summary_id, is_favourite, read_at });
}

// Fetch user preferences from user_prefs table
export async function getUserPrefs(user_id: string) {
  return await offlineStorage.getUserPrefs(user_id);
}

// Upsert (insert or update) user preferences
export async function upsertUserPrefs({ user_id, meditation_goal, focus_goal, onboarded }: { user_id: string, meditation_goal?: number, focus_goal?: number, onboarded?: boolean }) {
  return await offlineStorage.upsertUserPrefs({ user_id, meditation_goal, focus_goal, onboarded });
}

// Export offline storage for direct access when needed
export { offlineStorage };