import { supabase } from '@/lib/supabase';

export interface JournalEntry {
  id: string;
  log: string;
  date: string;
  created_at: string;
}

export const journalService = {
  async saveJournalEntry(content: string, date?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const entryDate = date || new Date().toISOString().split('T')[0];
    
    const { error } = await supabase
      .from('journal_logs')
      .upsert({
        user_id: user.id,
        log: content,
        date: entryDate,
      }, {
        onConflict: 'user_id,date'
      });

    if (error) throw error;
  },

  async getJournalEntry(date: string): Promise<JournalEntry | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('journal_logs')
      .select('id, log, date, created_at')
      .eq('user_id', user.id)
      .eq('date', date)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async getRecentJournalEntries(limit: number = 10): Promise<JournalEntry[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('journal_logs')
      .select('id, log, date, created_at')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async getJournalEntryCount(days: number = 7): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const { count, error } = await supabase
      .from('journal_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('date', startDateStr);

    if (error) throw error;
    return count || 0;
  }
};