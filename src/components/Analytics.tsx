import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    loadAnalyticsData();
  }, [userId]);

  useEffect(() => {
    if (showTimeRangePicker && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'absolute',
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width,
        zIndex: 9999,
      });
    }
  }, [showTimeRangePicker]);

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
    if (timeRange === 'lifetime') {
      return {
        meditations: data.meditations,
        workSessions: data.workSessions,
        journals: data.journals,
        goals: data.goals,
      };
    } else {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const cutoffStr = cutoff.toISOString().split('T')[0];
      return {
        meditations: data.meditations.filter(m => m.date >= cutoffStr),
        workSessions: data.workSessions.filter(w => w.date >= cutoffStr),
        journals: data.journals.filter(j => j.date >= cutoffStr),
        goals: data.goals.filter(g => g.date_created >= cutoffStr),
      };
    }
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

      dailyData.push({
        date: dateStr,
        meditation: dayMeditations.reduce((sum, m) => sum + m.length, 0) / 60,
        work: dayWork.reduce((sum, w) => sum + w.length, 0) / 60,
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
    { label: 'Lifetime', value: 'lifetime' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-900 to-emerald-700 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 loading-spinner mx-auto mb-4"></div>
          <p className="text-white/80 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 to-emerald-700 flex flex-col items-center px-6 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-6 animate-float">📊</div>
        <h1 className="text-3xl font-bold text-white mb-3" style={{ letterSpacing: '-0.03em' }}>
          Your Progress
        </h1>
        <p className="text-white/80 text-lg max-w-sm mx-auto">
          Track your mindful journey
        </p>
      </div>

      {/* Time Range Selector */}
      <div className="w-full max-w-sm mb-8">
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => setShowTimeRangePicker(!showTimeRangePicker)}
            className="w-full py-4 px-6 bg-emerald-900/60 text-white rounded-2xl border border-emerald-700 focus:outline-none focus:border-emerald-400 transition flex items-center justify-between"
          >
            <span>{timeRangeOptions.find(opt => opt.value === timeRange)?.label}</span>
            <ChevronDown size={20} />
          </button>

          {showTimeRangePicker && ReactDOM.createPortal(
            <div
              ref={dropdownRef}
              style={dropdownStyle}
              className="bg-emerald-900/90 backdrop-blur-sm border border-emerald-700 rounded-2xl overflow-hidden shadow-lg"
            >
              {timeRangeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setTimeRange(option.value);
                    setShowTimeRangePicker(false);
                  }}
                  className={`w-full px-6 py-4 text-left hover:bg-emerald-800/60 transition-colors ${
                    timeRange === option.value ? 'bg-emerald-400/20 text-emerald-300' : 'text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>,
            document.body
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="w-full max-w-sm mb-8">
        <div className="bg-emerald-900/60 rounded-2xl p-6 border border-emerald-700">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-300 mb-1">
                {stats.totalMeditationTime}m
              </div>
              <div className="text-sm text-white/70">Meditation</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-300 mb-1">
                {stats.totalWorkTime}m
              </div>
              <div className="text-sm text-white/70">Focus Time</div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Chart */}
      <div className="w-full max-w-sm mb-8">
        <div className="bg-emerald-900/60 rounded-2xl p-6 border border-emerald-700">
          <h3 className="text-xl font-bold text-white mb-4 text-center">Daily Activity</h3>
          
          <div className="flex items-center justify-center space-x-6 mb-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-emerald-400 rounded"></div>
              <span className="text-emerald-300">Meditation</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-400 rounded"></div>
              <span className="text-blue-300">Focus</span>
            </div>
          </div>

          {timeRange === 'lifetime' ? (
            <div className="flex items-center justify-center h-48">
              <span className="text-white/60 text-center">Chart unavailable for lifetime view</span>
            </div>
          ) : (
            <div style={{ width: '100%', height: 200 }}>
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
          )}
        </div>
      </div>

      {/* Additional Stats */}
      <div className="w-full max-w-sm space-y-4">
        <div className="bg-emerald-900/60 rounded-2xl p-4 border border-emerald-700">
          <div className="text-center">
            <div className="text-xl font-bold text-white mb-1">{stats.journalEntries}</div>
            <div className="text-sm text-white/70">Journal Entries</div>
          </div>
        </div>

        <div className="bg-emerald-900/60 rounded-2xl p-4 border border-emerald-700">
          <div className="text-center">
            <div className="text-xl font-bold text-white mb-1">{stats.goalCompletionRate}%</div>
            <div className="text-sm text-white/70">Goal Completion</div>
          </div>
        </div>
      </div>

      {/* Motivational Footer */}
      <div className="mt-12 text-center">
        <p className="text-white/60 text-sm">
          Progress, not perfection.
        </p>
      </div>
    </div>
  );
}