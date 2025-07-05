import React, { useState, useEffect } from 'react';
import { Clock, Target, PenTool, TrendingUp, Calendar, Award } from 'lucide-react';
import { getMeditationSessions, getWorkSessions, getJournalLogs, getGoals } from '../lib/saveData';
import type { MeditationSession, WorkSession, JournalLog, Goal } from '../types';

interface DashboardProps {
  userId: string;
}

export default function Dashboard({ userId }: DashboardProps) {
  const [stats, setStats] = useState({
    totalMeditation: 0,
    totalWork: 0,
    journalEntries: 0,
    completedGoals: 0,
    streak: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [userId]);

  const loadDashboardData = async () => {
    try {
      const [meditations, workSessions, journals, goals] = await Promise.all([
        getMeditationSessions(userId),
        getWorkSessions(userId),
        getJournalLogs(userId),
        getGoals(userId),
      ]);

      const totalMeditation = meditations.reduce((sum, session) => sum + session.length, 0);
      const totalWork = workSessions.reduce((sum, session) => sum + session.length, 0);
      const completedGoals = goals.filter(goal => goal.completed).length;

      setStats({
        totalMeditation: Math.round(totalMeditation / 60),
        totalWork: Math.round(totalWork / 60),
        journalEntries: journals.length,
        completedGoals,
        streak: calculateStreak(meditations, workSessions, journals),
      });

      // Combine recent activities
      const activities = [
        ...meditations.slice(0, 3).map(m => ({ type: 'meditation', date: m.date, duration: m.length })),
        ...workSessions.slice(0, 3).map(w => ({ type: 'work', date: w.date, duration: w.length })),
        ...journals.slice(0, 3).map(j => ({ type: 'journal', date: j.date })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

      setRecentActivity(activities);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const calculateStreak = (meditations: MeditationSession[], workSessions: WorkSession[], journals: JournalLog[]) => {
    const today = new Date();
    let streak = 0;
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const hasActivity = meditations.some(m => m.date === dateStr) ||
                         workSessions.some(w => w.date === dateStr) ||
                         journals.some(j => j.date === dateStr);
      
      if (hasActivity) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    
    return streak;
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.round(seconds / 60);
    return `${minutes}m`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'meditation': return <Clock size={16} className="text-amber-600 dark:text-amber-400" />;
      case 'work': return <Target size={16} className="text-orange-600 dark:text-orange-400" />;
      case 'journal': return <PenTool size={16} className="text-yellow-600 dark:text-yellow-400" />;
      default: return null;
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'meditation': return 'Meditation';
      case 'work': return 'Focus Session';
      case 'journal': return 'Journal Entry';
      default: return '';
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Welcome Section */}
      <div className="text-center py-6">
        <h1 className="text-3xl font-bold text-amber-900 dark:text-amber-100 mb-2 handwriting">
          Welcome back to your mindful journey
        </h1>
        <p className="text-amber-700 dark:text-amber-300 text-lg handwriting">
          Great minds don't wander. They conquer.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="vintage-card rounded-xl p-4 notebook-paper">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-amber-200 dark:bg-amber-700 rounded-lg">
              <Clock className="text-amber-700 dark:text-amber-300" size={20} />
            </div>
            <span className="text-xl font-bold text-amber-900 dark:text-amber-100 handwriting">{stats.totalMeditation}</span>
          </div>
          <h3 className="font-semibold text-amber-900 dark:text-amber-100 handwriting text-sm">Minutes Meditated</h3>
          <p className="text-xs text-amber-700 dark:text-amber-300 handwriting">Total mindful minutes</p>
        </div>

        <div className="vintage-card rounded-xl p-4 notebook-paper">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-orange-200 dark:bg-orange-700 rounded-lg">
              <Target className="text-orange-700 dark:text-orange-300" size={20} />
            </div>
            <span className="text-xl font-bold text-amber-900 dark:text-amber-100 handwriting">{stats.totalWork}</span>
          </div>
          <h3 className="font-semibold text-amber-900 dark:text-amber-100 handwriting text-sm">Focus Minutes</h3>
          <p className="text-xs text-amber-700 dark:text-amber-300 handwriting">Deep work sessions</p>
        </div>

        <div className="vintage-card rounded-xl p-4 notebook-paper">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-yellow-200 dark:bg-yellow-700 rounded-lg">
              <PenTool className="text-yellow-700 dark:text-yellow-300" size={20} />
            </div>
            <span className="text-xl font-bold text-amber-900 dark:text-amber-100 handwriting">{stats.journalEntries}</span>
          </div>
          <h3 className="font-semibold text-amber-900 dark:text-amber-100 handwriting text-sm">Journal Entries</h3>
          <p className="text-xs text-amber-700 dark:text-amber-300 handwriting">Reflective moments</p>
        </div>

        <div className="vintage-card rounded-xl p-4 notebook-paper">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-amber-300 dark:bg-amber-600 rounded-lg">
              <Award className="text-amber-800 dark:text-amber-200" size={20} />
            </div>
            <span className="text-xl font-bold text-amber-900 dark:text-amber-100 handwriting">{stats.streak}</span>
          </div>
          <h3 className="font-semibold text-amber-900 dark:text-amber-100 handwriting text-sm">Day Streak</h3>
          <p className="text-xs text-amber-700 dark:text-amber-300 handwriting">Consistent practice</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="vintage-card rounded-xl p-4 lg:p-6 notebook-paper">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-amber-200 dark:bg-amber-700 rounded-lg">
            <TrendingUp className="text-amber-700 dark:text-amber-300" size={20} />
          </div>
          <h2 className="text-xl font-bold text-amber-900 dark:text-amber-100 handwriting">Recent Activity</h2>
        </div>

        {recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-amber-100 dark:bg-amber-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getActivityIcon(activity.type)}
                  <div>
                    <p className="font-medium text-amber-900 dark:text-amber-100 handwriting text-sm">
                      {getActivityLabel(activity.type)}
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 handwriting">
                      {new Date(activity.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {activity.duration && (
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-200 handwriting">
                    {formatDuration(activity.duration)}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="mx-auto text-amber-500 dark:text-amber-400 mb-4" size={48} />
            <p className="text-amber-700 dark:text-amber-300 handwriting">No recent activity</p>
            <p className="text-sm text-amber-600 dark:text-amber-400 handwriting">Start your mindful journey today</p>
          </div>
        )}
      </div>
    </div>
  );
}