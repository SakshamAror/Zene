import { supabase } from '@/lib/supabase';

export interface MeditationSession {
  id: string;
  length: number;
  date: string;
  created_at: string;
}

export const meditationService = {
  async saveMeditationSession(duration: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const today = new Date().toISOString().split('T')[0];
    
    const { error } = await supabase
      .from('meditation_sessions')
      .insert({
        user_id: user.id,
        length: duration,
        date: today,
      });

    if (error) throw error;
  },

  async getMeditationSessions(days: number = 7): Promise<MeditationSession[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('meditation_sessions')
      .select('id, length, date, created_at')
      .eq('user_id', user.id)
      .gte('date', startDateStr)
      .order('date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getTotalMeditationTime(days: number = 7): Promise<number> {
    const sessions = await this.getMeditationSessions(days);
    return sessions.reduce((total, session) => total + session.length, 0);
  },

  async getMeditationStreak(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('meditation_sessions')
      .select('date')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    const dates = data.map(session => new Date(session.date));
    
    for (let i = 0; i < dates.length; i++) {
      const daysDiff = Math.floor((today.getTime() - dates[i].getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak) {
        streak++;
      } else if (daysDiff > streak) {
        break;
      }
    }

    return streak;
  }
};