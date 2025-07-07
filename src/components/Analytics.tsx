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
        top: rect.bottom + window.scrollY + 8, // 8px margin
        left: rect.left + window.scrollX,
        width: rect.width, // Match button width exactly
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
    { label: 'Lifetime', value: 'lifetime' },
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
      {/* No header or sub-heading */}

      {/* Time Range Selector */}
      <div className="opal-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="mobile-text-xl font-bold text-primary">Overview</h2>
          <div className="relative">
            <button
              ref={buttonRef}
              onClick={() => setShowTimeRangePicker(!showTimeRangePicker)}
              className="opal-button-secondary px-4 py-2 flex items-center space-x-2"
            >
              <span>{timeRangeOptions.find(opt => opt.value === timeRange)?.label}</span>
              <ChevronDown size={16} />
            </button>

            {showTimeRangePicker && ReactDOM.createPortal(
              <div
                ref={dropdownRef}
                style={dropdownStyle}
                className="opal-card border border-white/10 rounded-xl overflow-hidden z-50 shadow-lg"
              >
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
              </div>,
              document.body
            )}
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

          {timeRange === 'lifetime' ? (
            <div className="flex items-center justify-center h-48">
              <span className="text-slate-400 dark:text-slate-500 text-lg">Chart unavailable for lifetime view</span>
            </div>
          ) : (
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
          )}
        </div>

        {/* Stats Grid - styled like overview tile */}
        <div className="zene-card rounded-2xl p-0 flex flex-col md:flex-row items-center justify-center gap-0 overflow-hidden">
          <div className="flex-1 flex flex-col items-center justify-center py-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-xl mb-2">
              <Clock className="text-emerald-600 dark:text-emerald-400" size={28} />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
              {stats.totalMeditationTime}m
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Total Meditation
            </div>
          </div>
          <div className="w-px h-16 bg-slate-200 dark:bg-slate-700 hidden md:block" />
          <div className="flex-1 flex flex-col items-center justify-center py-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl mb-2">
              <TrendingUp className="text-blue-600 dark:text-blue-400" size={28} />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
              {stats.totalWorkTime}m
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Total Focus Time
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}