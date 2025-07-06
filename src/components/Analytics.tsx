import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Calendar, Clock } from 'lucide-react';
import { getMeditationSessions, getWorkSessions, getJournalLogs, getGoals } from '../lib/saveData';
import type { MeditationSession, WorkSession, JournalLog, Goal } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, ReferenceDot } from 'recharts';

interface AnalyticsProps {
  userId: string;
}

export default function Analytics({ userId }: AnalyticsProps) {
  const [data, setData] = useState({
    meditations: [] as MeditationSession[],
    workSessions: [] as WorkSession[],
    journals: [] as JournalLog[],
    goals: [] as Goal[],
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    loadAnalyticsData();
  }, [userId]);

  const loadAnalyticsData = async () => {
    try {
      const [meditations, workSessions, journals, goals] = await Promise.all([
        getMeditationSessions(userId),
        getWorkSessions(userId),
        getJournalLogs(userId),
        getGoals(userId),
      ]);

      setData({ meditations, workSessions, journals, goals });
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredData = () => {
    const now = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    return {
      meditations: data.meditations.filter(m => m.date >= cutoffStr),
      workSessions: data.workSessions.filter(w => w.date >= cutoffStr),
      journals: data.journals.filter(j => j.date >= cutoffStr),
      goals: data.goals.filter(g => g.date_created >= cutoffStr),
    };
  };

  const calculateStats = () => {
    const filtered = getFilteredData();

    const totalMeditationTime = filtered.meditations.reduce((sum, m) => sum + m.length, 0);
    const totalWorkTime = filtered.workSessions.reduce((sum, w) => sum + w.length, 0);
    const journalEntries = filtered.journals.length;
    const completedGoals = filtered.goals.filter(g => g.completed).length;
    const totalGoals = filtered.goals.length;

    return {
      totalMeditationTime: Math.round(totalMeditationTime / 60),
      totalWorkTime: Math.round(totalWorkTime / 60),
      journalEntries,
      goalCompletionRate: totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0,
      averageMeditationLength: filtered.meditations.length > 0
        ? Math.round(totalMeditationTime / filtered.meditations.length / 60)
        : 0,
      averageWorkLength: filtered.workSessions.length > 0
        ? Math.round(totalWorkTime / filtered.workSessions.length / 60)
        : 0,
    };
  };

  const getDailyActivity = () => {
    const filtered = getFilteredData();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const dailyData = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayMeditations = filtered.meditations.filter(m => m.date === dateStr);
      const dayWork = filtered.workSessions.filter(w => w.date === dateStr);
      const dayJournals = filtered.journals.filter(j => j.date === dateStr);

      dailyData.push({
        date: dateStr,
        meditation: dayMeditations.reduce((sum, m) => sum + m.length, 0) / 60,
        work: dayWork.reduce((sum, w) => sum + w.length, 0) / 60,
        hasJournal: dayJournals.length > 0,
      });
    }

    return dailyData;
  };

  const stats = calculateStats();
  const dailyActivity = getDailyActivity();
  const maxValue = Math.max(...dailyActivity.map(d => Math.max(d.meditation, d.work)), 1);

  // Helper to get grid color based on theme
  const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
  const gridColor = isDark ? '#334155' : '#e2e8f0';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Analytics</h1>
        <p className="text-slate-600 dark:text-slate-400">Track your mindfulness journey</p>
      </div>

      {/* Time Range Selector */}
      <div className="zene-card rounded-2xl p-6 border zene-border">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Overview</h2>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="zene-card rounded-2xl p-6 border zene-border">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-xl">
              <Clock className="text-emerald-600 dark:text-emerald-400" size={24} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            {stats.totalMeditationTime}m
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Total Meditation
          </div>
        </div>

        <div className="zene-card rounded-2xl p-6 border zene-border">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
              <TrendingUp className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            {stats.totalWorkTime}m
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Total Focus Time
          </div>
        </div>

        <div className="zene-card rounded-2xl p-6 border zene-border">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-xl">
              <Calendar className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            {stats.journalEntries}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Journal Entries
          </div>
        </div>
      </div>

      {/* Activity Chart */}
      <div className="zene-card rounded-2xl p-6 border zene-border">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
            <BarChart3 className="text-slate-600 dark:text-slate-400" size={20} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Daily Activity</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-emerald-500 rounded"></div>
              <span className="text-slate-600 dark:text-slate-400">Meditation</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-slate-600 dark:text-slate-400">Focus</span>
            </div>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyActivity} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" tickFormatter={d => new Date(d).getDate().toString()} stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={v => `${v}m`} width={32} />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 14 }} />
                <Bar dataKey="meditation" name="Meditation" fill="#10b981" radius={[4, 4, 0, 0]} barSize={18} />
                <Bar dataKey="work" name="Focus" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}