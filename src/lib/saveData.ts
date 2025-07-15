import { supabase } from './supabase';
import { offlineStorage } from './offlineStorage';
import { MeditationSession, WorkSession, JournalLog, Goal, VoiceMessage } from '../types';

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

// Add after saveJournalLog:
export async function deleteJournalLog(user_id: string, timestamp: string) {
  return await offlineStorage.deleteJournalLog(user_id, timestamp);
}

// Save a goal
export async function saveGoal(goal: Omit<Goal, 'id'>) {
  return await offlineStorage.saveGoal(goal);
}

// Update a goal
export async function updateGoal(id: number | string, updates: Partial<Goal>) {
  return await offlineStorage.updateGoal(id, updates);
}

// Delete a goal
export async function deleteGoal(id: number | string) {
  return await offlineStorage.deleteGoal(id);
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
export async function upsertUserBookStatus({ user_id, book_summary_id, is_favourite, timestamp }: {
  user_id: string;
  book_summary_id: string;
  is_favourite: boolean;
  timestamp?: string;
}) {
  return await offlineStorage.upsertUserBookStatus({ user_id, book_summary_id, is_favourite, timestamp });
}

// Fetch user preferences from user_prefs table
export async function getUserPrefs(user_id: string) {
  if (!user_id) return null;
  return await offlineStorage.getUserPrefs(user_id);
}

// Upsert (insert or update) user preferences
export async function upsertUserPrefs({ user_id, meditation_goal, focus_goal, onboarded, main_goal }: {
  user_id: string,
  meditation_goal?: number,
  focus_goal?: number,
  onboarded?: boolean,
  main_goal?: string
}) {
  return await offlineStorage.upsertUserPrefs({ user_id, meditation_goal, focus_goal, onboarded, main_goal });
}

// Fetch friend request notifications for the user
export async function getFriendNotifications(userId: string) {
  if (!userId) return { hasNotifications: false, incoming: [], outgoing: [] };
  // Incoming: requests sent TO the user that are pending
  const { data: incoming, error: incomingError } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('to_user_id', userId)
    .eq('status', 'pending');

  // Outgoing: requests sent BY the user that have been accepted and not yet notified
  const { data: outgoing, error: outgoingError } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('from_user_id', userId)
    .eq('status', 'accepted')
    .eq('notified', false);

  return {
    hasNotifications: (incoming?.length ?? 0) > 0 || (outgoing?.length ?? 0) > 0,
    incoming: incoming || [],
    outgoing: outgoing || [],
  };
}

// Export offline storage for direct access when needed
export { offlineStorage };

// Voice message functions
export async function saveVoiceMessage(message: Omit<VoiceMessage, 'id'>) {
  return await offlineStorage.saveVoiceMessage(message);
}

export async function getVoiceMessages(user_id: string): Promise<VoiceMessage[]> {
  return await offlineStorage.getVoiceMessages(user_id);
}

export async function getVoiceMessagesForDate(user_id: string, date: string): Promise<VoiceMessage[]> {
  return await offlineStorage.getVoiceMessagesForDate(user_id, date);
}

export async function markVoiceMessageAsPlayed(id: string | number) {
  return await offlineStorage.markVoiceMessageAsPlayed(id);
}

export async function deleteVoiceMessage(id: string | number) {
  return await offlineStorage.deleteVoiceMessage(id);
}