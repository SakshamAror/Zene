import { meditationService } from './meditationService';
import { workService } from './workService';
import { journalService } from './journalService';

export interface DailyStats {
  date: string;
  meditation: number; // minutes
  work: number; // minutes
  hasJournal: boolean;
  mood?: number; // 1-10 scale
}

export interface WeeklyAnalytics {
  totalMeditation: number;
  totalWork: number;
  journalEntries: number;
  streak: number;
  dailyStats: DailyStats[];
  averageMood: number;
}

export const analyticsService = {
  async getWeeklyAnalytics(): Promise<WeeklyAnalytics> {
    const [
      meditationSessions,
      workSessions,
      journalEntries,
      streak,
      totalMeditation,
      totalWork,
      journalCount
    ] = await Promise.all([
      meditationService.getMeditationSessions(7),
      workService.getWorkSessions(7),
      journalService.getRecentJournalEntries(7),
      meditationService.getMeditationStreak(),
      meditationService.getTotalMeditationTime(7),
      workService.getTotalWorkTime(7),
      journalService.getJournalEntryCount(7)
    ]);

    // Create daily stats for the last 7 days
    const dailyStats: DailyStats[] = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayMeditation = meditationSessions
        .filter(session => session.date === dateStr)
        .reduce((total, session) => total + session.duration, 0);
      
      const dayWork = workSessions
        .filter(session => session.date === dateStr && session.session_type === 'work')
        .reduce((total, session) => total + session.duration, 0);
      
      const hasJournal = journalEntries.some(entry => entry.date === dateStr);
      
      dailyStats.push({
        date: dateStr,
        meditation: Math.round(dayMeditation / 60), // Convert to minutes
        work: Math.round(dayWork / 60), // Convert to minutes
        hasJournal,
        mood: hasJournal ? Math.floor(Math.random() * 3) + 7 : undefined // Placeholder mood data
      });
    }

    const averageMood = dailyStats
      .filter(day => day.mood)
      .reduce((sum, day) => sum + (day.mood || 0), 0) / 
      dailyStats.filter(day => day.mood).length || 0;

    return {
      totalMeditation: Math.round(totalMeditation / 60), // Convert to minutes
      totalWork: Math.round(totalWork / 60), // Convert to minutes
      journalEntries: journalCount,
      streak,
      dailyStats,
      averageMood: Math.round(averageMood * 10) / 10
    };
  }
};