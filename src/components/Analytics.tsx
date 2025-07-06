import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Calendar, Clock, ChevronDown } from 'lucide-react';
import { getMeditationSessions, getWorkSessions, getJournalLogs, getGoals } from '../lib/saveData';
import type { MeditationSession, WorkSession, JournalLog, Goal } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';

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
  const [showTimeRangePicker, setShowTimeRangePicker] = useState(false);

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

  const timeRangeOptions = [
    { label: 'Last 7 days', value: '7d' },
    { label: 'Last 30 days', value: '30d' },
    { label: 'Last 90 days', value: '90d' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="mobile-text-3xl font-bold text-primary mb-2">Insights</h1>
        <p className="text-secondary">Track your mindfulness journey</p>
      </div>

      {/* Time Range Selector */}
      <div className="opal-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="mobile-text-xl font-bold text-primary">Overview</h2>
          <div className="relative">
            <button
              onClick={() => setShowTimeRangePicker(!showTimeRangePicker)}
              className="opal-button-secondary px-4 py-2 flex items-center space-x-2"
            >
              <span>{timeRangeOptions.find(opt => opt.value === timeRange)?.label}</span>
              <ChevronDown size={16} />
            </button>
            
            {showTimeRangePicker && (
              <div className="absolute right-0 top-full mt-2 opal-card border border-white/10 rounded-xl overflow-hidden z-10">
                {timeRangeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setTimeRange(option.value);
                      setShowTimeRangePicker(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-white/10 transition-colors ${timeRange === option.value ? 'bg-emerald-500/20 text-emerald-400' : 'text-primary'
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="stat-card">
          <div className="icon-bg icon-bg-emerald">
            <Clock size={20} />
          </div>
          <div className="text-2xl font-bold text-primary mb-1">
            {stats.totalMeditationTime}m
          </div>
          <div className="text-sm text-secondary">
            Total Meditation
          </div>
        </div>

        <div className="stat-card">
          <div className="icon-bg icon-bg-blue">
            <TrendingUp size={20} />
          </div>
          <div className="text-2xl font-bold text-primary mb-1">
            {stats.totalWorkTime}m
          </div>
          <div className="text-sm text-secondary">
            Total Focus Time
          </div>
        </div>

        <div className="stat-card">
          <div className="icon-bg icon-bg-purple">
            <Calendar size={20} />
          </div>
          <div className="text-2xl font-bold text-primary mb-1">
            {stats.journalEntries}
          </div>
          <div className="text-sm text-secondary">
            Journal Entries
          </div>
        </div>

        <div className="stat-card">
          <div className="icon-bg icon-bg-orange">
            <BarChart3 size={20} />
          </div>
          <div className="text-2xl font-bold text-primary mb-1">
            {stats.goalCompletionRate}%
          </div>
          <div className="text-sm text-secondary">
            Goal Completion
          </div>
        </div>
      </div>

      {/* Activity Chart */}
      <div className="opal-card p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="icon-bg icon-bg-blue">
            <BarChart3 size={20} />
          </div>
          <h3 className="mobile-text-xl font-bold text-primary">Daily Activity</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-emerald-500 rounded"></div>
              <span className="text-secondary">Meditation</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-secondary">Focus</span>
            </div>
          </div>
          
          <div className="chart-container" style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyActivity} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={d => new Date(d).getDate().toString()} 
                  stroke="rgba(255,255,255,0.6)" 
                  fontSize={12} 
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.6)" 
                  fontSize={12} 
                  tickFormatter={v => `${v}m`} 
                  width={32} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.9)', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '12px',
                    color: '#fff'
                  }}
                />
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