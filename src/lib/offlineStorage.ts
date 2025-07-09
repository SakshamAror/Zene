import { Preferences } from '@capacitor/preferences';
import { supabase } from './supabase';
import type {
    MeditationSession,
    WorkSession,
    JournalLog,
    Goal,
    UserBookStatus,
    BookSummary
} from '../types';

// Check if running on mobile (Capacitor)
const isMobile = () => {
    return typeof window !== 'undefined' && 'Capacitor' in window;
};

// Storage keys
const STORAGE_KEYS = {
    MEDITATION_SESSIONS: 'meditation_sessions',
    WORK_SESSIONS: 'work_sessions',
    JOURNAL_LOGS: 'journal_logs',
    GOALS: 'goals',
    USER_BOOK_STATUS: 'user_book_status',
    BOOK_SUMMARIES: 'book_summaries',
    USER_PREFS: 'user_prefs',
    PENDING_SYNC: 'pending_sync',
    LAST_SYNC: 'last_sync',
} as const;

// Pending sync operations
interface PendingSync {
    id: string;
    operation: 'create' | 'update' | 'delete';
    table: string;
    data: any;
    timestamp: number;
}

// Offline storage service
class OfflineStorage {
    private isEnabled: boolean;

    constructor() {
        // Only enable offline storage on mobile
        this.isEnabled = typeof navigator !== 'undefined' && /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
    }

    // Generic storage methods
    private async set(key: string, value: any): Promise<void> {
        if (!this.isEnabled) return;
        try {
            await Preferences.set({
                key,
                value: JSON.stringify(value)
            });
        } catch (error) {
            console.error(`Error setting storage key ${key}:`, error);
        }
    }

    private async get(key: string): Promise<any> {
        if (!this.isEnabled) return null;
        try {
            const { value } = await Preferences.get({ key });
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error(`Error getting storage key ${key}:`, error);
            return null;
        }
    }

    private async remove(key: string): Promise<void> {
        if (!this.isEnabled) return;
        try {
            await Preferences.remove({ key });
        } catch (error) {
            console.error(`Error removing storage key ${key}:`, error);
        }
    }

    // Add pending sync operation
    private async addPendingSync(operation: PendingSync): Promise<void> {
        if (!this.isEnabled) return;
        try {
            const pending = await this.get(STORAGE_KEYS.PENDING_SYNC) || [];
            pending.push(operation);
            await this.set(STORAGE_KEYS.PENDING_SYNC, pending);
        } catch (error) {
            console.error('Error adding pending sync:', error);
        }
    }

    // Get pending sync operations
    private async getPendingSync(): Promise<PendingSync[]> {
        if (!this.isEnabled) return [];
        try {
            return await this.get(STORAGE_KEYS.PENDING_SYNC) || [];
        } catch (error) {
            console.error('Error getting pending sync:', error);
            return [];
        }
    }

    // Clear pending sync operations
    private async clearPendingSync(): Promise<void> {
        if (!this.isEnabled) return;
        try {
            await this.remove(STORAGE_KEYS.PENDING_SYNC);
        } catch (error) {
            console.error('Error clearing pending sync:', error);
        }
    }

    // Check network connectivity
    private async isOnline(): Promise<boolean> {
        if (!this.isEnabled) return true;
        try {
            const response = await fetch('https://www.google.com', {
                method: 'HEAD',
                mode: 'no-cors'
            });
            return true;
        } catch {
            return false;
        }
    }

    // Sync pending operations with Supabase
    async syncWithServer(): Promise<void> {
        if (!this.isEnabled) return;

        // Clean up: Remove any pending syncs with invalid or missing id
        let pending = await this.getPendingSync();
        const validPending = pending.filter(op => op.id && op.id !== 'undefined' && op.id !== undefined && op.id !== null && op.id !== '');
        if (validPending.length !== pending.length) {
            // Overwrite with only valid pending syncs
            await this.set(STORAGE_KEYS.PENDING_SYNC, validPending);
            pending = validPending;
        }
        if (pending.length === 0) return;

        const isOnline = await this.isOnline();
        if (!isOnline) return;

        console.log(`Syncing ${pending.length} pending operations...`);

        const successfulSyncs: string[] = [];

        for (const operation of pending) {
            try {
                switch (operation.operation) {
                    case 'create':
                        await supabase
                            .from(operation.table)
                            .insert([operation.data]);
                        break;
                    case 'update':
                        await supabase
                            .from(operation.table)
                            .update(operation.data)
                            .eq('id', operation.data.id);
                        break;
                    case 'delete':
                        await supabase
                            .from(operation.table)
                            .delete()
                            .eq('id', operation.data.id);
                        break;
                }
                successfulSyncs.push(operation.id);
            } catch (error) {
                console.error(`Failed to sync operation:`, operation, error);
                // Keep the operation in pending sync for retry
                continue;
            }
        }

        // Remove successful syncs from pending
        if (successfulSyncs.length > 0) {
            const remainingPending = pending.filter(op => !successfulSyncs.includes(op.id));
            await this.set(STORAGE_KEYS.PENDING_SYNC, remainingPending);
        }

        // Update last sync timestamp if any operations were successful
        if (successfulSyncs.length > 0) {
            await this.set(STORAGE_KEYS.LAST_SYNC, Date.now());
        }
    }

    // Meditation Sessions
    async saveMeditationSession(session: Omit<MeditationSession, 'id'>): Promise<MeditationSession[]> {
        const tempId = `temp_${Date.now()}_${Math.random()}`;
        const sessionWithId = { ...session, id: tempId };

        if (this.isEnabled) {
            // Store locally
            const sessions = await this.get(STORAGE_KEYS.MEDITATION_SESSIONS) || [];
            sessions.unshift(sessionWithId);
            await this.set(STORAGE_KEYS.MEDITATION_SESSIONS, sessions);

            // Add to pending sync
            await this.addPendingSync({
                id: tempId,
                operation: 'create',
                table: 'meditation_sessions',
                data: session,
                timestamp: Date.now()
            });

            // Try to sync immediately
            await this.syncWithServer();
        }

        // Always try to save to server first
        try {
            const { data, error } = await supabase
                .from('meditation_sessions')
                .insert([session])
                .select();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error saving meditation session:', error);
            if (this.isEnabled) {
                return [sessionWithId];
            }
            throw error;
        }
    }

    async getMeditationSessions(user_id: string): Promise<MeditationSession[]> {
        if (this.isEnabled) {
            // Try to get from server first
            try {
                const { data, error } = await supabase
                    .from('meditation_sessions')
                    .select('*')
                    .eq('user_id', user_id)
                    .order('date', { ascending: false });
                if (error) throw error;

                // Update local storage
                await this.set(STORAGE_KEYS.MEDITATION_SESSIONS, data || []);
                return data || [];
            } catch (error) {
                console.log('Using offline meditation sessions');
                // Fall back to local storage
                const sessions = await this.get(STORAGE_KEYS.MEDITATION_SESSIONS) || [];
                return sessions.filter((s: MeditationSession) => s.user_id === user_id);
            }
        }

        // Non-mobile: use server only
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

    // Work Sessions
    async saveWorkSession(session: Omit<WorkSession, 'id'>): Promise<WorkSession[]> {
        const tempId = `temp_${Date.now()}_${Math.random()}`;
        const sessionWithId = { ...session, id: tempId };

        if (this.isEnabled) {
            // Store locally
            const sessions = await this.get(STORAGE_KEYS.WORK_SESSIONS) || [];
            sessions.unshift(sessionWithId);
            await this.set(STORAGE_KEYS.WORK_SESSIONS, sessions);

            // Add to pending sync
            await this.addPendingSync({
                id: tempId,
                operation: 'create',
                table: 'work_sessions',
                data: session,
                timestamp: Date.now()
            });

            // Try to sync immediately
            await this.syncWithServer();
        }

        // Always try to save to server first
        try {
            const { data, error } = await supabase
                .from('work_sessions')
                .insert([session])
                .select();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error saving work session:', error);
            if (this.isEnabled) {
                return [sessionWithId];
            }
            throw error;
        }
    }

    async getWorkSessions(user_id: string): Promise<WorkSession[]> {
        if (this.isEnabled) {
            // Try to get from server first
            try {
                const { data, error } = await supabase
                    .from('work_sessions')
                    .select('*')
                    .eq('user_id', user_id)
                    .order('date', { ascending: false });
                if (error) throw error;

                // Update local storage
                await this.set(STORAGE_KEYS.WORK_SESSIONS, data || []);
                return data || [];
            } catch (error) {
                console.log('Using offline work sessions');
                // Fall back to local storage
                const sessions = await this.get(STORAGE_KEYS.WORK_SESSIONS) || [];
                return sessions.filter((s: WorkSession) => s.user_id === user_id);
            }
        }

        // Non-mobile: use server only
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

    // Journal Logs
    async saveJournalLog(log: Omit<JournalLog, 'id'>): Promise<JournalLog[]> {
        const tempId = `temp_${Date.now()}_${Math.random()}`;
        const logWithId = { ...log, id: tempId };

        if (this.isEnabled) {
            // Store locally
            const logs = await this.get(STORAGE_KEYS.JOURNAL_LOGS) || [];
            const existingIndex = logs.findIndex((l: JournalLog) =>
                l.user_id === log.user_id && l.date === log.date
            );

            if (existingIndex >= 0) {
                logs[existingIndex] = logWithId;
            } else {
                logs.unshift(logWithId);
            }
            await this.set(STORAGE_KEYS.JOURNAL_LOGS, logs);

            // Add to pending sync
            await this.addPendingSync({
                id: tempId,
                operation: existingIndex >= 0 ? 'update' : 'create',
                table: 'journal_logs',
                data: log,
                timestamp: Date.now()
            });

            // Try to sync immediately
            await this.syncWithServer();
        }

        // Always try to save to server first
        try {
            const { data, error } = await supabase
                .from('journal_logs')
                .upsert([log], {
                    onConflict: 'user_id,date'
                })
                .select();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error saving journal log:', error);
            if (this.isEnabled) {
                return [logWithId];
            }
            throw error;
        }
    }

    async getJournalLogs(user_id: string): Promise<JournalLog[]> {
        if (this.isEnabled) {
            // Try to get from server first
            try {
                const { data, error } = await supabase
                    .from('journal_logs')
                    .select('*')
                    .eq('user_id', user_id)
                    .order('date', { ascending: false });
                if (error) throw error;

                // Update local storage
                await this.set(STORAGE_KEYS.JOURNAL_LOGS, data || []);
                return data || [];
            } catch (error) {
                console.log('Using offline journal logs');
                // Fall back to local storage
                const logs = await this.get(STORAGE_KEYS.JOURNAL_LOGS) || [];
                return logs.filter((l: JournalLog) => l.user_id === user_id);
            }
        }

        // Non-mobile: use server only
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

    // Goals
    async saveGoal(goal: Omit<Goal, 'id'>): Promise<Goal[]> {
        const tempId = `temp_${Date.now()}_${Math.random()}`;
        const goalWithId = { ...goal, id: tempId };

        if (this.isEnabled) {
            // Store locally
            const goals = await this.get(STORAGE_KEYS.GOALS) || [];
            goals.unshift(goalWithId);
            await this.set(STORAGE_KEYS.GOALS, goals);

            // Add to pending sync
            await this.addPendingSync({
                id: tempId,
                operation: 'create',
                table: 'goals',
                data: goal,
                timestamp: Date.now()
            });

            // Try to sync immediately
            await this.syncWithServer();
        }

        // Always try to save to server first
        try {
            const { data, error } = await supabase
                .from('goals')
                .insert([goal])
                .select();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error saving goal:', error);
            if (this.isEnabled) {
                return [goalWithId];
            }
            throw error;
        }
    }

    async updateGoal(id: number, updates: Partial<Goal>): Promise<Goal[]> {
        if (this.isEnabled) {
            // Update locally
            const goals = await this.get(STORAGE_KEYS.GOALS) || [];
            const goalIndex = goals.findIndex((g: Goal) => g.id === id);
            if (goalIndex >= 0) {
                goals[goalIndex] = { ...goals[goalIndex], ...updates };
                await this.set(STORAGE_KEYS.GOALS, goals);
            }

            // Add to pending sync
            await this.addPendingSync({
                id: id.toString(),
                operation: 'update',
                table: 'goals',
                data: { id, ...updates },
                timestamp: Date.now()
            });

            // Try to sync immediately
            await this.syncWithServer();
        }

        // Always try to update server first
        try {
            const { data, error } = await supabase
                .from('goals')
                .update(updates)
                .eq('id', id)
                .select();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating goal:', error);
            if (this.isEnabled) {
                const goals = await this.get(STORAGE_KEYS.GOALS) || [];
                const goal = goals.find((g: Goal) => g.id === id);
                return goal ? [goal] : [];
            }
            throw error;
        }
    }

    async getGoals(user_id: string): Promise<Goal[]> {
        if (this.isEnabled) {
            // Try to get from server first
            try {
                const { data, error } = await supabase
                    .from('goals')
                    .select('*')
                    .eq('user_id', user_id)
                    .order('date_created', { ascending: false });
                if (error) throw error;

                // Update local storage
                await this.set(STORAGE_KEYS.GOALS, data || []);
                return data || [];
            } catch (error) {
                console.log('Using offline goals');
                // Fall back to local storage
                const goals = await this.get(STORAGE_KEYS.GOALS) || [];
                return goals.filter((g: Goal) => g.user_id === user_id);
            }
        }

        // Non-mobile: use server only
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

    // Book Summaries (global data - cache locally)
    async getBookSummaries(): Promise<BookSummary[]> {
        if (this.isEnabled) {
            // Try to get from server first
            try {
                const { data, error } = await supabase
                    .from('book_summaries')
                    .select('*');
                if (error) throw error;

                // Update local storage
                await this.set(STORAGE_KEYS.BOOK_SUMMARIES, data || []);
                return data || [];
            } catch (error) {
                console.log('Using offline book summaries');
                // Fall back to local storage
                return await this.get(STORAGE_KEYS.BOOK_SUMMARIES) || [];
            }
        }

        // Non-mobile: use server only
        const { data, error } = await supabase
            .from('book_summaries')
            .select('*');
        if (error) {
            console.error('Error fetching book summaries:', error);
            throw error;
        }
        return data || [];
    }

    // User Book Status
    async getUserBookStatus(user_id: string): Promise<UserBookStatus[]> {
        if (this.isEnabled) {
            // Try to get from server first
            try {
                const { data, error } = await supabase
                    .from('user_book_status')
                    .select('*')
                    .eq('user_id', user_id);
                if (error) throw error;

                // Update local storage
                await this.set(STORAGE_KEYS.USER_BOOK_STATUS, data || []);
                return data || [];
            } catch (error) {
                console.log('Using offline user book status');
                // Fall back to local storage
                const statuses = await this.get(STORAGE_KEYS.USER_BOOK_STATUS) || [];
                return statuses.filter((s: UserBookStatus) => s.user_id === user_id);
            }
        }

        // Non-mobile: use server only
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

    async upsertUserBookStatus({ user_id, book_summary_id, is_favourite, read_at }: {
        user_id: string;
        book_summary_id: string;
        is_favourite: boolean;
        read_at: string;
    }): Promise<UserBookStatus | null> {
        const tempId = `temp_${Date.now()}_${Math.random()}`;
        const statusWithId = {
            id: tempId,
            user_id,
            book_summary_id,
            is_favourite,
            read_at
        };

        if (this.isEnabled) {
            // Store locally
            const statuses = await this.get(STORAGE_KEYS.USER_BOOK_STATUS) || [];
            const existingIndex = statuses.findIndex((s: UserBookStatus) =>
                s.user_id === user_id && s.book_summary_id === book_summary_id
            );

            if (existingIndex >= 0) {
                statuses[existingIndex] = statusWithId;
            } else {
                statuses.push(statusWithId);
            }
            await this.set(STORAGE_KEYS.USER_BOOK_STATUS, statuses);

            // Add to pending sync
            await this.addPendingSync({
                id: tempId,
                operation: existingIndex >= 0 ? 'update' : 'create',
                table: 'user_book_status',
                data: { user_id, book_summary_id, is_favourite, read_at },
                timestamp: Date.now()
            });

            // Try to sync immediately
            await this.syncWithServer();
        }

        // Always try to save to server first
        try {
            const { data, error } = await supabase
                .from('user_book_status')
                .upsert([
                    { user_id, book_summary_id, is_favourite, read_at }
                ], { onConflict: 'user_id,book_summary_id' })
                .select();
            if (error) throw error;
            return data && data[0];
        } catch (error) {
            console.error('Error upserting user book status:', error);
            if (this.isEnabled) {
                return statusWithId;
            }
            throw error;
        }
    }

    // User Preferences
    async getUserPrefs(user_id: string): Promise<any> {
        if (this.isEnabled) {
            // Try to get from server first
            try {
                const { data, error } = await supabase
                    .from('user_prefs')
                    .select('*')
                    .eq('user_id', user_id)
                    .single();
                if (error && error.code !== 'PGRST116') throw error;

                // Update local storage
                await this.set(STORAGE_KEYS.USER_PREFS, data);
                return data;
            } catch (error) {
                console.log('Using offline user prefs');
                // Fall back to local storage
                const prefs = await this.get(STORAGE_KEYS.USER_PREFS);
                return prefs;
            }
        }

        // Non-mobile: use server only
        const { data, error } = await supabase
            .from('user_prefs')
            .select('*')
            .eq('user_id', user_id)
            .single();
        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching user prefs:', error);
            throw error;
        }
        return data;
    }

    async upsertUserPrefs({ user_id, meditation_goal, focus_goal, onboarded }: {
        user_id: string,
        meditation_goal?: number,
        focus_goal?: number,
        onboarded?: boolean
    }): Promise<any> {
        if (!user_id) {
            console.warn('upsertUserPrefs called without a valid user_id. Aborting request.');
            return;
        }
        const updateObj: any = { user_id };
        if (meditation_goal !== undefined) updateObj.meditation_goal = meditation_goal;
        if (focus_goal !== undefined) updateObj.focus_goal = focus_goal;
        if (onboarded !== undefined) updateObj.onboarded = onboarded;

        if (this.isEnabled) {
            // Store locally
            await this.set(STORAGE_KEYS.USER_PREFS, updateObj);

            // Add to pending sync
            await this.addPendingSync({
                id: user_id,
                operation: 'update',
                table: 'user_prefs',
                data: updateObj,
                timestamp: Date.now()
            });

            // Try to sync immediately
            await this.syncWithServer();
        }

        // Always try to save to server first
        try {
            const { data, error } = await supabase
                .from('user_prefs')
                .upsert([updateObj], { onConflict: 'user_id' })
                .select('*');
            if (error) throw error;
            return data && data[0];
        } catch (error) {
            console.error('Error upserting user prefs:', error);
            if (this.isEnabled) {
                return updateObj;
            }
            throw error;
        }
    }

    // Clear all local data for a user
    async clearUserData(user_id: string): Promise<void> {
        if (!this.isEnabled) return;

        const keys = [
            STORAGE_KEYS.MEDITATION_SESSIONS,
            STORAGE_KEYS.WORK_SESSIONS,
            STORAGE_KEYS.JOURNAL_LOGS,
            STORAGE_KEYS.GOALS,
            STORAGE_KEYS.USER_BOOK_STATUS,
            STORAGE_KEYS.USER_PREFS
        ];

        for (const key of keys) {
            try {
                const data = await this.get(key);
                if (Array.isArray(data)) {
                    const filtered = data.filter((item: any) => item.user_id !== user_id);
                    await this.set(key, filtered);
                } else if (data && data.user_id === user_id) {
                    await this.remove(key);
                }
            } catch (error) {
                console.error(`Error clearing user data for key ${key}:`, error);
            }
        }
    }

    // Get sync status
    async getSyncStatus(): Promise<{ pending: number; lastSync: number | null }> {
        if (!this.isEnabled) return { pending: 0, lastSync: null };

        try {
            const pending = await this.getPendingSync();
            const lastSync = await this.get(STORAGE_KEYS.LAST_SYNC);

            return {
                pending: pending.length,
                lastSync
            };
        } catch (error) {
            console.error('Error getting sync status:', error);
            return { pending: 0, lastSync: null };
        }
    }

    // Force sync
    async forceSync(): Promise<void> {
        await this.syncWithServer();
    }

    // Clear all local storage (for debugging/testing)
    async clearAllData(): Promise<void> {
        if (!this.isEnabled) return;

        const keys = Object.values(STORAGE_KEYS);
        for (const key of keys) {
            try {
                await this.remove(key);
            } catch (error) {
                console.error(`Error clearing key ${key}:`, error);
            }
        }
    }

    // Get storage size info (for debugging)
    async getStorageInfo(): Promise<{ [key: string]: number }> {
        if (!this.isEnabled) return {};

        const info: { [key: string]: number } = {};
        const keys = Object.values(STORAGE_KEYS);

        for (const key of keys) {
            try {
                const data = await this.get(key);
                if (data) {
                    info[key] = JSON.stringify(data).length;
                }
            } catch (error) {
                console.error(`Error getting storage info for ${key}:`, error);
            }
        }

        return info;
    }
}

// Export singleton instance
export const offlineStorage = new OfflineStorage(); 