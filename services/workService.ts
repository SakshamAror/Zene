import { supabase } from '@/lib/supabase';

export interface WorkSession {
  id: string;
  duration: number;
  session_type: 'work' | 'break';
  date: string;
  created_at: string;
}

export const workService = {
  async saveWorkSession(duration: number, sessionType: 'work' | 'break'): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const today = new Date().toISOString().split('T')[0];
    
    const { error } = await supabase
      .from('work_sessions')
      .insert({
        user_id: user.id,
        duration,
        session_type: sessionType,
        date: today,
      });

    if (error) throw error;
  },

  async getWorkSessions(days: number = 7): Promise<WorkSession[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('work_sessions')
      .select('id, duration, session_type, date, created_at')
      .eq('user_id', user.id)
      .gte('date', startDateStr)
      .order('date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getTotalWorkTime(days: number = 7): Promise<number> {
    const sessions = await this.getWorkSessions(days);
    return sessions
      .filter(session => session.session_type === 'work')
      .reduce((total, session) => total + session.duration, 0);
  }
};