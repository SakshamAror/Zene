import React, { useState, useEffect } from 'react';
import { Clock, Target, PenTool, TrendingUp, Calendar, Award, ChevronRight } from 'lucide-react';
import { getMeditationSessions, getWorkSessions, getJournalLogs, getGoals } from '../lib/saveData';
import type { MeditationSession, WorkSession, JournalLog, Goal } from '../types';

interface DashboardProps {
  userId: string;
  user?: any;
}

export default function Dashboard({ userId, user }: DashboardProps) {
  const [stats, setStats] = useState({
    totalMeditation: 0,
    totalWork: 0,
    journalEntries: 0,
    completedGoals: 0,
    streak: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
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
      case 'meditation': return <Clock size={16} className="text-emerald-400" />;
      case 'work': return <Target size={16} className="text-blue-400" />;
      case 'journal': return <PenTool size={16} className="text-purple-400" />;
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

  const getUserName = () => {
    if (user) {
      let name = user.user_metadata?.full_name || user.user_metadata?.name || '';
      if (!name && user.email) {
        name = user.email.split('@')[0];
      }
      return name ? name.split(' ')[0] : '';
    }
    return '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center py-8">
        <h1 className="mobile-text-3xl md:text-4xl font-bold text-primary mb-3">
          {getUserName() ? `Welcome back, ${getUserName()}` : 'Welcome back'}
        </h1>
        <p className="text-secondary mobile-text-lg">
          Great minds don't wander. They conquer.
        </p>
      </div>

      {/* Main Stats */}
      <div className="opal-card p-6 mb-6">
        <div className="text-center mb-6">
          <div className="mobile-text-2xl md:text-3xl font-bold text-primary mb-2">
            {stats.totalMeditation + stats.totalWork}m
          </div>
          <div className="text-secondary">Total mindful minutes today</div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="icon-bg icon-bg-emerald mx-auto">
              <Clock size={24} />
            </div>
            <div className="text-xl font-bold text-primary">{stats.totalMeditation}m</div>
            <div className="text-sm text-secondary">Meditation</div>
          </div>
          <div className="text-center">
            <div className="icon-bg icon-bg-blue mx-auto">
              <Target size={24} />
            </div>
            <div className="text-xl font-bold text-primary">{stats.totalWork}m</div>
            <div className="text-sm text-secondary">Focus</div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="stat-card">
          <div className="icon-bg icon-bg-purple">
            <PenTool size={20} />
          </div>
          <div className="text-xl font-bold text-primary">{stats.journalEntries}</div>
          <div className="text-sm text-secondary">Journal Entries</div>
        </div>

        <div className="stat-card">
          <div className="icon-bg icon-bg-orange">
            <Award size={20} />
          </div>
          <div className="text-xl font-bold text-primary">{stats.streak}</div>
          <div className="text-sm text-secondary">Day Streak</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="opal-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="mobile-text-xl font-bold text-primary">Recent Activity</h2>
          <ChevronRight size={20} className="text-secondary" />
        </div>

        {recentActivity.length > 0 ? (
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-4 opal-card-dark rounded-2xl">
                <div className="flex items-center space-x-3">
                  {getActivityIcon(activity.type)}
                  <div>
                    <p className="font-medium text-primary text-sm">
                      {getActivityLabel(activity.type)}
                    </p>
                    <p className="text-xs text-secondary">
                      {new Date(activity.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {activity.duration && (
                  <span className="text-sm font-medium text-secondary">
                    {formatDuration(activity.duration)}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="mx-auto text-secondary mb-4" size={48} />
            <p className="text-secondary">No recent activity</p>
            <p className="text-sm text-tertiary">Start your mindful journey today</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button className="opal-card p-6 text-left">
          <Clock className="text-emerald-400 mb-3" size={24} />
          <div className="font-semibold text-primary mb-1">Start Meditation</div>
          <div className="text-sm text-secondary">Begin a mindful session</div>
        </button>
        
        <button className="opal-card p-6 text-left">
          <Target className="text-blue-400 mb-3" size={24} />
          <div className="font-semibold text-primary mb-1">Focus Session</div>
          <div className="text-sm text-secondary">Deep work time</div>
        </button>
      </div>
    </div>
  );
}