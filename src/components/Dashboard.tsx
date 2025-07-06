import React, { useState, useEffect } from 'react';
import { Clock, Target, PenTool, TrendingUp, Calendar, Award } from 'lucide-react';
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
      case 'meditation': return <Clock size={16} className="text-emerald-600" />;
      case 'work': return <Target size={16} className="text-blue-600" />;
      case 'journal': return <PenTool size={16} className="text-purple-600" />;
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
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold zene-text mb-2">
          {(() => {
            let name = '';
            if (user) {
              name = user.user_metadata?.full_name || user.user_metadata?.name || '';
              if (!name && user.email) {
                name = user.email.split('@')[0];
              }
            }
            return name
              ? `Welcome back, ${name}. Make the most of your day with Zene`
              : 'Welcome back. Make the most of your day with Zene';
          })()}
        </h1>
        <p className="zene-text text-lg">
          Great minds don't wander. They conquer.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="zene-card rounded-2xl p-6 border zene-border">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 zene-icon-bg-emerald rounded-xl">
              <Clock className="zene-icon-emerald" size={24} />
            </div>
            <span className="text-2xl font-bold zene-text">{stats.totalMeditation}</span>
          </div>
          <h3 className="font-semibold zene-text">Minutes Meditated</h3>
          <p className="text-sm zene-text">Total mindful minutes</p>
        </div>

        <div className="zene-card rounded-2xl p-6 border zene-border">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 zene-icon-bg-blue rounded-xl">
              <Target className="zene-icon-blue" size={24} />
            </div>
            <span className="text-2xl font-bold zene-text">{stats.totalWork}</span>
          </div>
          <h3 className="font-semibold zene-text">Focus Minutes</h3>
          <p className="text-sm zene-text">Deep work sessions</p>
        </div>

        <div className="zene-card rounded-2xl p-6 border zene-border">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 zene-icon-bg-purple rounded-xl">
              <PenTool className="zene-icon-purple" size={24} />
            </div>
            <span className="text-2xl font-bold zene-text">{stats.journalEntries}</span>
          </div>
          <h3 className="font-semibold zene-text">Journal Entries</h3>
          <p className="text-sm zene-text">Reflective moments</p>
        </div>

        <div className="zene-card rounded-2xl p-6 border zene-border">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 zene-icon-bg-orange rounded-xl">
              <Award className="zene-icon-orange" size={24} />
            </div>
            <span className="text-2xl font-bold zene-text">{stats.streak}</span>
          </div>
          <h3 className="font-semibold zene-text">Day Streak</h3>
          <p className="text-sm zene-text">Consistent practice</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="zene-card rounded-2xl p-6 border zene-border">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 zene-icon-bg-slate rounded-lg">
            <TrendingUp className="zene-icon-slate" size={20} />
          </div>
          <h2 className="text-xl font-bold zene-text">Recent Activity</h2>
        </div>

        {recentActivity.length > 0 ? (
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div className="flex items-center space-x-3">
                  {getActivityIcon(activity.type)}
                  <div>
                    <p className="font-medium zene-text">
                      {getActivityLabel(activity.type)}
                    </p>
                    <p className="text-sm zene-text">
                      {new Date(activity.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {activity.duration && (
                  <span className="text-sm font-medium zene-text">
                    {formatDuration(activity.duration)}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="mx-auto zene-icon-slate-light mb-4" size={48} />
            <p className="zene-text">No recent activity</p>
            <p className="text-sm zene-text">Start your mindful journey today</p>
          </div>
        )}
      </div>
    </div>
  );
}