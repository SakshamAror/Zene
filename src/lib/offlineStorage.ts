import { Preferences } from '@capacitor/preferences';
import { supabase } from './supabase';
import type {
    MeditationSession,
    WorkSession,
    JournalLog,
    Goal,
    UserBookStatus,
    BookSummary,
    VoiceMessage
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
    VOICE_MESSAGES: 'voice_messages',
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
        this.cleanPendingSyncs();
    }

    async cleanPendingSyncs() {
        try {
            const pending = await this.get(STORAGE_KEYS.PENDING_SYNC) || [];
            const cleaned = pending.filter((op: any) => {
                if (!op.id || op.id === 'undefined' || op.id === undefined || op.id === null || op.id === '') return false;
                // Remove temp IDs for update/delete
                if ((op.operation === 'update' || op.operation === 'delete') && typeof op.data?.id === 'string' && op.data.id.startsWith('temp_')) return false;
                // Remove if missing user_id
                if (!op.data?.user_id) return false;
                return true;
            });
            if (cleaned.length !== pending.length) {
                await this.set(STORAGE_KEYS.PENDING_SYNC, cleaned);
            }
        } catch (error) {
            console.error('Error cleaning pending syncs:', error);
        }
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

        // Only keep error logs and user-facing alerts.

        const successfulSyncs: string[] = [];
        let goalsSyncNeeded = false;

        for (const operation of pending) {
            // Skip update/delete for temp IDs in goals table
            if (
                operation.table === 'goals' &&
                (operation.operation === 'update' || operation.operation === 'delete') &&
                typeof operation.data.id === 'string' && operation.data.id.startsWith('temp_')
            ) {
                // Remove this operation from pending
                successfulSyncs.push(operation.id);
                continue;
            }
            try {
                switch (operation.operation) {
                    case 'create':
                        // Never send temp IDs to Supabase
                        if (operation.data.id && typeof operation.data.id === 'string' && operation.data.id.startsWith('temp_')) {
                            const { id, ...dataToSend } = operation.data;
                            await supabase.from(operation.table).insert([dataToSend]);
                        } else {
                            await supabase.from(operation.table).insert([operation.data]);
                        }
                        break;
                    case 'update':
                        // Use composite keys for user tables
                        if (operation.table === 'goals') {
                            const { id, ...updates } = operation.data;
                            await supabase.from('goals').update(updates)
                                .eq('user_id', updates.user_id)
                                .eq('timestamp', updates.timestamp);
                        } else if (operation.table === 'journal_logs') {
                            const { id, ...updates } = operation.data;
                            await supabase.from('journal_logs').update(updates)
                                .eq('user_id', updates.user_id)
                                .eq('timestamp', updates.timestamp);
                        } else if (operation.table === 'meditation_sessions' || operation.table === 'work_sessions') {
                            const { id, ...updates } = operation.data;
                            await supabase.from(operation.table).update(updates)
                                .eq('user_id', updates.user_id)
                                .eq('timestamp', updates.timestamp);
                        } else if (operation.table === 'user_book_status') {
                            const { id, ...updates } = operation.data;
                            await supabase.from('user_book_status').update(updates)
                                .eq('user_id', updates.user_id)
                                .eq('book_summary_id', updates.book_summary_id);
                        } else if (operation.table === 'user_prefs') {
                            const { id, ...updates } = operation.data;
                            await supabase.from('user_prefs').update(updates)
                                .eq('user_id', updates.user_id);
                        } else {
                            // fallback for other tables
                            await supabase.from(operation.table).update(operation.data)
                                .eq('user_id', operation.data.user_id);
                        }
                        break;
                    case 'delete':
                        // Use composite keys for user tables
                        if (operation.table === 'goals') {
                            const { id, user_id, timestamp } = operation.data;
                            await supabase.from('goals').delete()
                                .eq('user_id', user_id)
                                .eq('timestamp', timestamp);
                        } else if (operation.table === 'journal_logs') {
                            const { id, user_id, timestamp } = operation.data;
                            await supabase.from('journal_logs').delete()
                                .eq('user_id', user_id)
                                .eq('timestamp', timestamp);
                        } else if (operation.table === 'meditation_sessions' || operation.table === 'work_sessions') {
                            const { id, user_id, timestamp } = operation.data;
                            await supabase.from(operation.table).delete()
                                .eq('user_id', user_id)
                                .eq('timestamp', timestamp);
                        } else if (operation.table === 'user_book_status') {
                            const { id, user_id, book_summary_id } = operation.data;
                            await supabase.from('user_book_status').delete()
                                .eq('user_id', user_id)
                                .eq('book_summary_id', book_summary_id);
                        } else if (operation.table === 'user_prefs') {
                            const { id, user_id } = operation.data;
                            await supabase.from('user_prefs').delete()
                                .eq('user_id', user_id);
                        } else {
                            // fallback for other tables
                            await supabase.from(operation.table).delete()
                                .eq('user_id', operation.data.user_id);
                        }
                        break;
                }
                successfulSyncs.push(operation.id);
                if (operation.table === 'goals') goalsSyncNeeded = true;
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

        // If any goals were synced, reload from Supabase and update local storage
        if (goalsSyncNeeded) {
            // Find a user_id from any goals operation
            const goalsOp = pending.find(op => op.table === 'goals');
            const userId = goalsOp?.data?.user_id;
            if (userId) {
                try {
                    const { data, error } = await supabase
                        .from('goals')
                        .select('*')
                        .eq('user_id', userId)
                        .order('timestamp', { ascending: false });
                    if (!error && data) {
                        await this.set(STORAGE_KEYS.GOALS, data);
                    }
                } catch (err) {
                    console.error('Error reloading goals after sync:', err);
                }
            }
        }
    }

    // 1. Meditation Sessions
    async saveMeditationSession(session: Omit<MeditationSession, 'id'>): Promise<MeditationSession[]> {
        const tempId = `temp_${Date.now()}_${Math.random()}`;
        const sessionWithId = { ...session, id: tempId };

        if (!sessionWithId.user_id) {
            console.error('Meditation session missing user_id');
            return [sessionWithId];
        }

        const isOnline = await this.isOnline();
        if (isOnline) {
            // Online: write directly to Supabase
            try {
                const { data, error } = await supabase
                    .from('meditation_sessions')
                    .insert([{ ...session, timestamp: new Date().toISOString() }])
                    .select();
                if (error) throw error;
                return data;
            } catch (error) {
                console.error('Error saving meditation session:', error);
                // Optionally, fallback to offline if desired
                if (this.isEnabled) {
                    // Store locally and queue for sync
                    const sessions = await this.get(STORAGE_KEYS.MEDITATION_SESSIONS) || [];
                    sessions.unshift(sessionWithId);
                    await this.set(STORAGE_KEYS.MEDITATION_SESSIONS, sessions);
                    await this.addPendingSync({
                        id: tempId,
                        operation: 'create',
                        table: 'meditation_sessions',
                        data: sessionWithId,
                        timestamp: Date.now()
                    });
                }
                return [sessionWithId];
            }
        } else if (this.isEnabled) {
            // Offline: store locally and queue for sync
            const sessions = await this.get(STORAGE_KEYS.MEDITATION_SESSIONS) || [];
            sessions.unshift(sessionWithId);
            await this.set(STORAGE_KEYS.MEDITATION_SESSIONS, sessions);
            await this.addPendingSync({
                id: tempId,
                operation: 'create',
                table: 'meditation_sessions',
                data: sessionWithId,
                timestamp: Date.now()
            });
            await this.syncWithServer();
            return [sessionWithId];
        }
        // Fallback: just return local
        return [sessionWithId];
    }

    async getMeditationSessions(user_id: string): Promise<MeditationSession[]> {
        if (this.isEnabled) {
            // Always try Supabase first when online
            try {
                const { data, error } = await supabase
                    .from('meditation_sessions')
                    .select('*')
                    .eq('user_id', user_id)
                    .order('timestamp', { ascending: false });
                if (error) throw error;

                // Update local backup after successful Supabase operation
                await this.set(STORAGE_KEYS.MEDITATION_SESSIONS, data || []);
                return data || [];
            } catch (error) {
                console.log('Supabase failed, falling back to local backup:', error);
                // Fall back to local backup only if Supabase fails
                const localSessions = await this.get(STORAGE_KEYS.MEDITATION_SESSIONS) || [];
                return localSessions.filter((s: MeditationSession) => s.user_id === user_id);
            }
        }

        // Non-mobile: use server only
        const { data, error } = await supabase
            .from('meditation_sessions')
            .select('*')
            .eq('user_id', user_id)
            .order('timestamp', { ascending: false });
        if (error) {
            console.error('Error fetching meditation sessions:', error);
            throw error;
        }
        return data || [];
    }

    // 2. Work Sessions
    async saveWorkSession(session: Omit<WorkSession, 'id'>): Promise<WorkSession[]> {
        const tempId = `temp_${Date.now()}_${Math.random()}`;
        const sessionWithId = { ...session, id: tempId };

        if (!sessionWithId.user_id) {
            console.error('Work session missing user_id');
            return [sessionWithId];
        }

        const isOnline = await this.isOnline();
        if (isOnline) {
            // Online: write directly to Supabase
            try {
                const { data, error } = await supabase
                    .from('work_sessions')
                    .insert([{ ...session, timestamp: new Date().toISOString() }])
                    .select();
                if (error) throw error;
                return data;
            } catch (error) {
                console.error('Error saving work session:', error);
                // Optionally, fallback to offline if desired
                if (this.isEnabled) {
                    // Store locally and queue for sync
                    const sessions = await this.get(STORAGE_KEYS.WORK_SESSIONS) || [];
                    sessions.unshift(sessionWithId);
                    await this.set(STORAGE_KEYS.WORK_SESSIONS, sessions);
                    await this.addPendingSync({
                        id: tempId,
                        operation: 'create',
                        table: 'work_sessions',
                        data: sessionWithId,
                        timestamp: Date.now()
                    });
                }
                return [sessionWithId];
            }
        } else if (this.isEnabled) {
            // Offline: store locally and queue for sync
            const sessions = await this.get(STORAGE_KEYS.WORK_SESSIONS) || [];
            sessions.unshift(sessionWithId);
            await this.set(STORAGE_KEYS.WORK_SESSIONS, sessions);
            await this.addPendingSync({
                id: tempId,
                operation: 'create',
                table: 'work_sessions',
                data: sessionWithId,
                timestamp: Date.now()
            });
            await this.syncWithServer();
            return [sessionWithId];
        }
        // Fallback: just return local
        return [sessionWithId];
    }

    async getWorkSessions(user_id: string): Promise<WorkSession[]> {
        if (this.isEnabled) {
            // Always try Supabase first when online
            try {
                const { data, error } = await supabase
                    .from('work_sessions')
                    .select('*')
                    .eq('user_id', user_id)
                    .order('timestamp', { ascending: false });
                if (error) throw error;

                // Update local backup after successful Supabase operation
                await this.set(STORAGE_KEYS.WORK_SESSIONS, data || []);
                return data || [];
            } catch (error) {
                console.log('Supabase failed, falling back to local backup:', error);
                // Fall back to local backup only if Supabase fails
                const localSessions = await this.get(STORAGE_KEYS.WORK_SESSIONS) || [];
                return localSessions.filter((s: WorkSession) => s.user_id === user_id);
            }
        }

        // Non-mobile: use server only
        const { data, error } = await supabase
            .from('work_sessions')
            .select('*')
            .eq('user_id', user_id)
            .order('timestamp', { ascending: false });
        if (error) {
            console.error('Error fetching work sessions:', error);
            throw error;
        }
        return data || [];
    }

    // 3. Journal Logs
    async saveJournalLog(log: Omit<JournalLog, 'id'>): Promise<JournalLog[]> {
        const tempId = `temp_${Date.now()}_${Math.random()}`;
        const logWithId = { ...log, id: tempId };

        if (!logWithId.user_id) {
            console.error('Journal log missing user_id');
            return [logWithId];
        }

        if (this.isEnabled) {
            // Store locally
            const logs = await this.get(STORAGE_KEYS.JOURNAL_LOGS) || [];
            const existingIndex = logs.findIndex((l: JournalLog) =>
                l.user_id === log.user_id && l.timestamp === log.timestamp
            );

            if (existingIndex >= 0) {
                // If the existing log has an id, use it; otherwise, use tempId
                const existingLog = logs[existingIndex];
                const idToUse = existingLog.id || tempId;
                logs[existingIndex] = { ...log, id: idToUse };
                await this.set(STORAGE_KEYS.JOURNAL_LOGS, logs);
                // Add to pending sync only if id is valid
                if (idToUse && idToUse !== 'undefined') {
                    await this.addPendingSync({
                        id: idToUse,
                        operation: 'update',
                        table: 'journal_logs',
                        data: { ...log, id: idToUse },
                        timestamp: Date.now()
                    });
                }
            } else {
                logs.unshift(logWithId);
                await this.set(STORAGE_KEYS.JOURNAL_LOGS, logs);
                await this.addPendingSync({
                    id: tempId,
                    operation: 'create',
                    table: 'journal_logs',
                    data: { ...log, id: tempId },
                    timestamp: Date.now()
                });
            }

            // Try to sync immediately
            await this.syncWithServer();
        }

        // Always try to save to server first
        try {
            // Use the provided timestamp, do not overwrite with new Date().toISOString()
            const { data, error } = await supabase
                .from('journal_logs')
                .upsert([{ ...log }], {
                    onConflict: 'user_id,timestamp'
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
            // Always try Supabase first when online
            try {
                const { data, error } = await supabase
                    .from('journal_logs')
                    .select('*')
                    .eq('user_id', user_id)
                    .order('timestamp', { ascending: false });
                if (error) throw error;

                // Update local backup after successful Supabase operation
                await this.set(STORAGE_KEYS.JOURNAL_LOGS, data || []);
                return data || [];
            } catch (error) {
                console.log('Supabase failed, falling back to local backup:', error);
                // Fall back to local backup only if Supabase fails
                const localLogs = await this.get(STORAGE_KEYS.JOURNAL_LOGS) || [];
                return localLogs.filter((l: JournalLog) => l.user_id === user_id);
            }
        }

        // Non-mobile: use server only
        const { data, error } = await supabase
            .from('journal_logs')
            .select('*')
            .eq('user_id', user_id)
            .order('timestamp', { ascending: false });
        if (error) {
            console.error('Error fetching journal logs:', error);
            throw error;
        }
        return data || [];
    }

    async deleteJournalLog(user_id: string, timestamp: string): Promise<void> {
        // Remove locally
        const logs = await this.get(STORAGE_KEYS.JOURNAL_LOGS) || [];
        const updatedLogs = logs.filter((l: JournalLog) => !(l.user_id === user_id && l.timestamp === timestamp));
        await this.set(STORAGE_KEYS.JOURNAL_LOGS, updatedLogs);

        // Add to pending sync
        await this.addPendingSync({
            id: `${user_id}_${timestamp}`,
            operation: 'delete',
            table: 'journal_logs',
            data: { user_id, timestamp },
            timestamp: Date.now()
        });
        await this.syncWithServer();

        // Always try to delete from server
        try {
            await supabase.from('journal_logs').delete().eq('user_id', user_id).eq('timestamp', timestamp);
        } catch (error) {
            // Ignore, will retry via sync
        }
    }

    // 4. Goals
    async saveGoal(goal: Omit<Goal, 'id'>): Promise<Goal[]> {
        const tempId = `temp_${Date.now()}_${Math.random()}`;
        const goalWithId = { ...goal, id: tempId };

        if (!goalWithId.user_id) {
            console.error('Goal missing user_id');
            return [goalWithId];
        }

        if (this.isEnabled) {
            // Store locally, but prevent duplicates
            const goals = await this.get(STORAGE_KEYS.GOALS) || [];
            const exists = goals.some((g: Goal) => g.user_id === goal.user_id && g.goal === goal.goal && g.timestamp === goal.timestamp);
            if (!exists) {
                goals.unshift(goalWithId);
                await this.set(STORAGE_KEYS.GOALS, goals);

                // Add to pending sync
                await this.addPendingSync({
                    id: tempId,
                    operation: 'create',
                    table: 'goals',
                    data: goalWithId,
                    timestamp: Date.now()
                });

                // Try to sync immediately
                await this.syncWithServer();
            }

            return [goalWithId];
        }

        // Non-mobile: save directly to server
        try {
            const { data, error } = await supabase
                .from('goals')
                .insert([{ ...goal, timestamp: new Date().toISOString() }])
                .select();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error saving goal:', error);
            throw error;
        }
    }

    async updateGoal(id: number | string, updates: Partial<Goal>): Promise<Goal[]> {
        if (typeof id === 'string' && id.startsWith('temp_')) {
            console.warn('Attempted to update goal with temporary ID:', id);
            return [];
        }
        if (this.isEnabled) {
            // Update locally
            const goals = await this.get(STORAGE_KEYS.GOALS) || [];
            const goalIndex = goals.findIndex((g: Goal) => g.id === id);
            if (goalIndex >= 0) {
                // Only update 'completed' if that's the only property in updates
                if (Object.keys(updates).length === 1 && updates.completed !== undefined) {
                    goals[goalIndex] = { ...goals[goalIndex], completed: updates.completed };
                } else {
                    goals[goalIndex] = { ...goals[goalIndex], ...updates };
                }
                await this.set(STORAGE_KEYS.GOALS, goals);
            }
            // Add to pending sync (never send id to Supabase)
            const localGoal = goals.find((g: Goal) => g.id === id);
            if (localGoal) {
                // Only send 'completed' if that's the only property being updated
                let syncData;
                if (Object.keys(updates).length === 1 && updates.completed !== undefined) {
                    syncData = { user_id: localGoal.user_id, timestamp: localGoal.timestamp, completed: updates.completed };
                } else {
                    syncData = { ...localGoal, ...updates };
                }
                await this.addPendingSync({
                    id: id.toString(),
                    operation: 'update',
                    table: 'goals',
                    data: syncData,
                    timestamp: Date.now()
                });
            }
            await this.syncWithServer();
        }
        // Always try to update server first (only for numeric IDs)
        if (typeof id === 'number') {
            try {
                // Use user_id+timestamp as key
                // Only update 'completed' if that's the only property in updates
                let updateObj = updates;
                if (Object.keys(updates).length === 1 && updates.completed !== undefined) {
                    // Only update completed
                    const goals = await this.get(STORAGE_KEYS.GOALS) || [];
                    const goal = goals.find((g: Goal) => g.id === id);
                    if (!goal) return [];
                    updateObj = { completed: updates.completed };
                    const { data, error } = await supabase
                        .from('goals')
                        .update(updateObj)
                        .eq('user_id', goal.user_id)
                        .eq('timestamp', goal.timestamp)
                        .select();
                    if (error) throw error;
                    return data;
                } else {
                    const { data, error } = await supabase
                        .from('goals')
                        .update(updates)
                        .eq('user_id', updates.user_id)
                        .eq('timestamp', updates.timestamp)
                        .select();
                    if (error) throw error;
                    return data;
                }
            } catch (error) {
                console.error('Error updating goal:', error);
                if (this.isEnabled) {
                    const goals = await this.get(STORAGE_KEYS.GOALS) || [];
                    const goal = goals.find((g: Goal) => g.id === id);
                    return goal ? [goal] : [];
                }
                throw error;
            }
        } else {
            // For temporary IDs, just return the local goal
            if (this.isEnabled) {
                const goals = await this.get(STORAGE_KEYS.GOALS) || [];
                const goal = goals.find((g: Goal) => g.id === id);
                return goal ? [goal] : [];
            }
            return [];
        }
    }

    async deleteGoal(id: number | string): Promise<void> {
        if (typeof id === 'string' && id.startsWith('temp_')) {
            console.warn('Attempted to delete goal with temporary ID:', id);
            return;
        }
        if (this.isEnabled) {
            // Remove locally
            const goals = await this.get(STORAGE_KEYS.GOALS) || [];
            const goal = goals.find((g: Goal) => g.id === id);
            const updatedGoals = goals.filter((g: Goal) => g.id !== id);
            await this.set(STORAGE_KEYS.GOALS, updatedGoals);
            // Add to pending sync (never send id to Supabase)
            if (goal) {
                await this.addPendingSync({
                    id: id.toString(),
                    operation: 'delete',
                    table: 'goals',
                    data: { user_id: goal.user_id, timestamp: goal.timestamp },
                    timestamp: Date.now()
                });
            }
            await this.syncWithServer();
        }
        // Always try to delete from server first (only for numeric IDs)
        if (typeof id === 'number') {
            try {
                // Use user_id+timestamp as key
                const goals = await this.get(STORAGE_KEYS.GOALS) || [];
                const goal = goals.find((g: Goal) => g.id === id);
                if (goal) {
                    const { error } = await supabase
                        .from('goals')
                        .delete()
                        .eq('user_id', goal.user_id)
                        .eq('timestamp', goal.timestamp);
                    if (error) throw error;
                }
            } catch (error) {
                console.error('Error deleting goal:', error);
                if (this.isEnabled) {
                    // Already removed locally
                    return;
                }
                throw error;
            }
        } else {
            // For temporary IDs, just return (already removed locally)
            return;
        }
    }

    async getGoals(user_id: string, opts?: { localOnly?: boolean }): Promise<Goal[]> {
        if (opts && opts.localOnly) {
            const goals = await this.get(STORAGE_KEYS.GOALS) || [];
            return goals.filter((g: Goal) => g.user_id === user_id);
        }
        if (this.isEnabled) {
            // Always try Supabase first when online
            try {
                const { data, error } = await supabase
                    .from('goals')
                    .select('*')
                    .eq('user_id', user_id)
                    .order('timestamp', { ascending: false });
                if (error) throw error;

                // Update local backup after successful Supabase operation
                await this.set(STORAGE_KEYS.GOALS, data || []);
                return data || [];
            } catch (error) {
                console.log('Supabase failed, falling back to local backup:', error);
                // Fall back to local backup only if Supabase fails
                const localGoals = await this.get(STORAGE_KEYS.GOALS) || [];
                return localGoals.filter((g: Goal) => g.user_id === user_id);
            }
        }

        // Non-mobile: use server only
        const { data, error } = await supabase
            .from('goals')
            .select('*')
            .eq('user_id', user_id)
            .order('timestamp', { ascending: false });
        if (error) {
            throw error;
        }
        return data || [];
    }

    // Book Summaries (global data - cache locally)
    async getBookSummaries(): Promise<BookSummary[]> {
        if (this.isEnabled) {
            // Always try Supabase first when online
            try {
                const { data, error } = await supabase
                    .from('book_summaries')
                    .select('*');
                if (error) throw error;

                // Update local backup after successful Supabase operation
                await this.set(STORAGE_KEYS.BOOK_SUMMARIES, data || []);
                return data || [];
            } catch (error) {
                console.log('Supabase failed, falling back to local backup:', error);
                // Fall back to local backup only if Supabase fails
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

    // 5. UserBookStatus
    async getUserBookStatus(user_id: string): Promise<UserBookStatus[]> {
        if (this.isEnabled) {
            // Always try Supabase first when online
            try {
                const { data, error } = await supabase
                    .from('user_book_status')
                    .select('*')
                    .eq('user_id', user_id);
                if (error) throw error;

                // Update local backup after successful Supabase operation
                await this.set(STORAGE_KEYS.USER_BOOK_STATUS, data || []);
                return data || [];
            } catch (error) {
                console.log('Supabase failed, falling back to local backup:', error);
                // Fall back to local backup only if Supabase fails
                const localStatuses = await this.get(STORAGE_KEYS.USER_BOOK_STATUS) || [];
                return localStatuses.filter((s: UserBookStatus) => s.user_id === user_id);
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

    async upsertUserBookStatus({ user_id, book_summary_id, is_favourite, timestamp }: {
        user_id: string;
        book_summary_id: string;
        is_favourite: boolean;
        timestamp?: string;
    }): Promise<UserBookStatus | null> {
        const tempId = `temp_${Date.now()}_${Math.random()}`;
        const ts = timestamp || new Date().toISOString();
        const statusWithId: UserBookStatus = {
            id: tempId,
            user_id,
            book_summary_id,
            is_favourite,
            timestamp: ts
        };

        if (!statusWithId.user_id) {
            console.error('User book status missing user_id');
            return statusWithId;
        }

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
                data: statusWithId,
                timestamp: Date.now()
            });

            // Try to sync immediately
            await this.syncWithServer();
        }

        // Always try to save to server first
        try {
            // Never send temp IDs to Supabase
            let dataToSend: any = statusWithId;
            if (typeof statusWithId.id === 'string' && statusWithId.id.startsWith('temp_')) {
                const { id, ...rest } = statusWithId;
                dataToSend = rest;
            }
            const { data, error } = await supabase
                .from('user_book_status')
                .upsert([
                    dataToSend
                ], { onConflict: 'user_id,book_summary_id' })
                .select();
            if (error) throw error;
            // If we had a temp ID, update local storage to use the real UUID
            if (data && data[0] && statusWithId.id.startsWith('temp_')) {
                const statuses = await this.get(STORAGE_KEYS.USER_BOOK_STATUS) || [];
                const idx = statuses.findIndex((s: UserBookStatus) => s.id === statusWithId.id);
                if (idx >= 0) {
                    statuses[idx] = { ...statuses[idx], id: data[0].id };
                    await this.set(STORAGE_KEYS.USER_BOOK_STATUS, statuses);
                }
            }
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
        if (!user_id) return null;

        if (this.isEnabled) {
            // Always try Supabase first when online
            try {
                const { data, error } = await supabase
                    .from('user_prefs')
                    .select('*')
                    .eq('user_id', user_id)
                    .single();
                if (error && error.code !== 'PGRST116') throw error;

                // Update local backup after successful Supabase operation
                if (data) {
                    await this.set(STORAGE_KEYS.USER_PREFS, data);
                }
                return data;
            } catch (error) {
                console.log('Supabase failed, falling back to local backup:', error);
                // Fall back to local backup only if Supabase fails
                const localPrefs = await this.get(STORAGE_KEYS.USER_PREFS);
                if (localPrefs && localPrefs.user_id === user_id) {
                    return localPrefs;
                }
                return null;
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

    async upsertUserPrefs({ user_id, meditation_goal, focus_goal, onboarded, main_goal }: {
        user_id: string,
        meditation_goal?: number,
        focus_goal?: number,
        onboarded?: boolean,
        main_goal?: string
    }): Promise<any> {
        if (!user_id) {
            return;
        }
        const updateObj: any = { user_id };
        if (meditation_goal !== undefined) updateObj.meditation_goal = meditation_goal;
        if (focus_goal !== undefined) updateObj.focus_goal = focus_goal;
        if (onboarded !== undefined) updateObj.onboarded = onboarded;
        if (main_goal !== undefined) updateObj.main_goal = main_goal;

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
    async forceSync(user_id?: string): Promise<void> {
        await this.syncWithServer();

        if (!user_id) {
            console.warn('forceSync: user_id not provided, skipping reload of user data from Supabase.');
            return;
        }

        // After syncing, always reload from Supabase and overwrite local cache for all user data types
        try {
            // Meditation Sessions
            const { data: medData, error: medError } = await supabase
                .from('meditation_sessions')
                .select('*')
                .eq('user_id', user_id);
            if (!medError && medData) {
                await this.set(STORAGE_KEYS.MEDITATION_SESSIONS, medData);
            }
            // Work Sessions
            const { data: workData, error: workError } = await supabase
                .from('work_sessions')
                .select('*')
                .eq('user_id', user_id);
            if (!workError && workData) {
                await this.set(STORAGE_KEYS.WORK_SESSIONS, workData);
            }
            // Journal Logs
            const { data: journalData, error: journalError } = await supabase
                .from('journal_logs')
                .select('*')
                .eq('user_id', user_id);
            if (!journalError && journalData) {
                await this.set(STORAGE_KEYS.JOURNAL_LOGS, journalData);
            }
            // Goals
            const { data: goalsData, error: goalsError } = await supabase
                .from('goals')
                .select('*')
                .eq('user_id', user_id);
            if (!goalsError && goalsData) {
                await this.set(STORAGE_KEYS.GOALS, goalsData);
            }
            // User Book Status
            const { data: bookStatusData, error: bookStatusError } = await supabase
                .from('user_book_status')
                .select('*')
                .eq('user_id', user_id);
            if (!bookStatusError && bookStatusData) {
                await this.set(STORAGE_KEYS.USER_BOOK_STATUS, bookStatusData);
            }
            // Voice Messages
            const { data: voiceData, error: voiceError } = await supabase
                .from('voice_messages')
                .select('*')
                .eq('user_id', user_id);
            if (!voiceError && voiceData) {
                await this.set(STORAGE_KEYS.VOICE_MESSAGES, voiceData);
            }
            // User Prefs (single row)
            const { data: prefsData, error: prefsError } = await supabase
                .from('user_prefs')
                .select('*')
                .eq('user_id', user_id)
                .single();
            if (!prefsError && prefsData) {
                await this.set(STORAGE_KEYS.USER_PREFS, prefsData);
            }
        } catch (err) {
            console.error('Error reloading user data after sync:', err);
        }
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

    // Voice Message Methods
    async saveVoiceMessage(message: Omit<VoiceMessage, 'id'>): Promise<VoiceMessage[]> {
        if (!this.isEnabled) {
            // Non-mobile: use server only
            try {
                const { data, error } = await supabase
                    .from('voice_messages')
                    .insert([message])
                    .select('*');
                if (error) {
                    console.error('Supabase insert error (voice_messages):', error);
                    throw error;
                }
                return data || [];
            } catch (error) {
                console.error('Error saving voice message:', error);
                throw error;
            }
        }

        // Mobile: store locally and sync
        try {
            const messages = await this.get(STORAGE_KEYS.VOICE_MESSAGES) || [];
            const newMessage: VoiceMessage = {
                ...message,
                id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };
            messages.push(newMessage);
            await this.set(STORAGE_KEYS.VOICE_MESSAGES, messages);

            // Add to pending sync
            await this.addPendingSync({
                id: String(newMessage.id || ''),
                operation: 'create',
                table: 'voice_messages',
                data: message,
                timestamp: Date.now()
            });

            // Try to sync immediately
            await this.syncWithServer();

            return messages;
        } catch (error) {
            console.error('Error saving voice message locally:', error);
            throw error;
        }
    }

    async getVoiceMessages(user_id: string): Promise<VoiceMessage[]> {
        if (!this.isEnabled) {
            // Non-mobile: use server only
            try {
                const { data, error } = await supabase
                    .from('voice_messages')
                    .select('*')
                    .eq('user_id', user_id)
                    .order('created_at', { ascending: false });
                if (error) throw error;
                return data || [];
            } catch (error) {
                console.error('Error fetching voice messages:', error);
                return [];
            }
        }

        // Mobile: try server first, fall back to local
        try {
            const { data, error } = await supabase
                .from('voice_messages')
                .select('*')
                .eq('user_id', user_id)
                .order('created_at', { ascending: false });
            if (error) throw error;

            // Update local backup
            if (data) {
                await this.set(STORAGE_KEYS.VOICE_MESSAGES, data);
            }
            return data || [];
        } catch (error) {
            console.log('Supabase failed, falling back to local backup:', error);
            const localMessages = await this.get(STORAGE_KEYS.VOICE_MESSAGES) || [];
            return localMessages.filter((msg: VoiceMessage) => msg.user_id === user_id);
        }
    }

    async getVoiceMessagesForDate(user_id: string, date: string): Promise<VoiceMessage[]> {
        const messages = await this.getVoiceMessages(user_id);
        return messages.filter(msg => {
            if (!msg.reminder_date) return false;
            const reminderDate = msg.reminder_date.split('T')[0];
            return reminderDate === date;
        });
    }

    async markVoiceMessageAsPlayed(id: string | number): Promise<void> {
        if (id === undefined || id === null) throw new Error('Voice message id is required');
        if (!this.isEnabled) {
            // Non-mobile: use server only
            try {
                const { error } = await supabase
                    .from('voice_messages')
                    .update({ played: true })
                    .eq('id', id);
                if (error) throw error;
            } catch (error) {
                console.error('Error marking voice message as played:', error);
                throw error;
            }
            return;
        }

        // Mobile: update locally and sync
        try {
            const messages = await this.get(STORAGE_KEYS.VOICE_MESSAGES) || [];
            const messageIndex = messages.findIndex((msg: VoiceMessage) => msg.id === id);
            if (messageIndex >= 0) {
                messages[messageIndex].played = true;
                await this.set(STORAGE_KEYS.VOICE_MESSAGES, messages);

                // Add to pending sync
                await this.addPendingSync({
                    id: String(id),
                    operation: 'update',
                    table: 'voice_messages',
                    data: { played: true },
                    timestamp: Date.now()
                });

                // Try to sync immediately
                await this.syncWithServer();
            }
        } catch (error) {
            console.error('Error marking voice message as played locally:', error);
            throw error;
        }
    }

    async deleteVoiceMessage(id: string | number): Promise<void> {
        if (id === undefined || id === null) throw new Error('Voice message id is required');
        if (!this.isEnabled) {
            // Non-mobile: use server only
            try {
                const { error } = await supabase
                    .from('voice_messages')
                    .delete()
                    .eq('id', id);
                if (error) throw error;
            } catch (error) {
                console.error('Error deleting voice message:', error);
                throw error;
            }
            return;
        }

        // Mobile: delete locally and sync
        try {
            const messages = await this.get(STORAGE_KEYS.VOICE_MESSAGES) || [];
            const filteredMessages = messages.filter((msg: VoiceMessage) => msg.id !== id);
            await this.set(STORAGE_KEYS.VOICE_MESSAGES, filteredMessages);

            // Add to pending sync
            await this.addPendingSync({
                id: String(id),
                operation: 'delete',
                table: 'voice_messages',
                data: { id: String(id) },
                timestamp: Date.now()
            });

            // Try to sync immediately
            await this.syncWithServer();
        } catch (error) {
            console.error('Error deleting voice message locally:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const offlineStorage = new OfflineStorage(); 