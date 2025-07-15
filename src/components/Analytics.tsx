import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { BarChart3, TrendingUp, Calendar, Clock, ChevronDown } from 'lucide-react';
import { getMeditationSessions, getWorkSessions, getJournalLogs, getGoals, getBookSummaries, getUserBookStatus } from '../lib/saveData';
import type { MeditationSession, WorkSession, JournalLog, Goal, BookSummary, UserBookStatus } from '../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import type { TooltipProps } from 'recharts';
import { Emoji } from './Emoji';

interface AnalyticsProps {
  userId: string;
}

// Custom Tooltip for 7-day chart
// Recharts TooltipProps does not guarantee payload/label, so use 'any' for props
function Custom7DayTooltip(props: any) {
  const { active, payload, label } = props;
  if (active && payload && payload.length) {
    const date = new Date(label as string);
    const day = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' });
    // Helper to round to 5 significant figures
    const sig = (v: number) => {
      if (!v) return '0';
      if (v === 0) return '0';
      const str = Number(v).toPrecision(4);
      // Remove trailing zeros and dot
      return str.replace(/\.0+$|0+$/, '');
    };
    return (
      <div className="bg-black/95 border border-emerald-900 rounded-xl shadow-lg px-4 py-3 min-w-[160px] text-white">
        <div className="font-semibold text-emerald-200 mb-1 text-sm">{day}</div>
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="font-medium">Meditation</span>
          <span className="font-bold text-emerald-400 flex items-center">
            {sig(payload[0].value as number)}
            <span className="ml-3 font-normal text-white/80">mins</span>
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Focus</span>
          <span className="font-bold text-blue-400 flex items-center">
            {sig(payload[1].value as number)}
            <span className="ml-3 font-normal text-white/80">mins</span>
          </span>
        </div>
      </div>
    );
  }
  return null;
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
  const [bookSummaries, setBookSummaries] = useState<BookSummary[]>([]);
  const [userBookStatus, setUserBookStatus] = useState<UserBookStatus[]>([]);

  useEffect(() => {
    loadAnalyticsData();
    getBookSummaries().then(setBookSummaries);
    getUserBookStatus(userId).then(setUserBookStatus);
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
      // console.error('Error loading analytics data:', error);
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
        meditations: data.meditations.filter(m => m.timestamp && m.timestamp.split('T')[0] >= cutoffStr),
        workSessions: data.workSessions.filter(w => w.timestamp && w.timestamp.split('T')[0] >= cutoffStr),
        journals: data.journals.filter(j => j.timestamp && j.timestamp.split('T')[0] >= cutoffStr),
        goals: data.goals.filter(g => g.timestamp && g.timestamp.split('T')[0] >= cutoffStr),
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

      const dayMeditations = filtered.meditations.filter(m => m.timestamp && m.timestamp.split('T')[0] === dateStr);
      const dayWork = filtered.workSessions.filter(w => w.timestamp && w.timestamp.split('T')[0] === dateStr);

      dailyData.push({
        date: dateStr,
        meditation: dayMeditations.reduce((sum, m) => sum + m.length, 0) / 60,
        work: dayWork.reduce((sum, w) => sum + w.length, 0) / 60,
      });
    }

    return dailyData;
  };

  // Helper to get book summaries read in selected time frame
  const getBookSummariesRead = () => {
    if (!userBookStatus) return 0;
    if (timeRange === 'lifetime') {
      return userBookStatus.filter(s => s.timestamp).length;
    } else {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const cutoffStr = cutoff.toISOString().split('T')[0];
      return userBookStatus.filter(s => s.timestamp && s.timestamp.split('T')[0] >= cutoffStr).length;
    }
  };

  // Helper to get weekly activity for lifetime
  const getWeeklyLifetimeActivity = () => {
    // Group by week (ISO week: Monday-Sunday)
    const { meditations, workSessions } = getFilteredData();
    if (!meditations.length && !workSessions.length) return [];
    // Find min and max date
    const allDates = [...meditations.map(m => m.timestamp && m.timestamp.split('T')[0]), ...workSessions.map(w => w.timestamp && w.timestamp.split('T')[0])].filter(Boolean);
    const minDate = new Date(Math.min(...allDates.map(d => new Date(d).getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => new Date(d).getTime())));
    // Start from the first Monday before minDate
    const start = new Date(minDate);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // Monday
    const end = new Date(maxDate);
    end.setDate(end.getDate() + (7 - ((end.getDay() + 6) % 7))); // Next Monday
    const weeks = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 7)) {
      const weekStart = new Date(d);
      const weekEnd = new Date(d);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
      const weekMeditation = meditations.filter(m => {
        const md = new Date(m.timestamp);
        return md >= weekStart && md <= weekEnd;
      }).reduce((sum, m) => sum + m.length, 0) / 60;
      const weekWork = workSessions.filter(w => {
        const wd = new Date(w.timestamp);
        return wd >= weekStart && wd <= weekEnd;
      }).reduce((sum, w) => sum + w.length, 0) / 60;
      weeks.push({ week: weekLabel, meditation: weekMeditation, work: weekWork });
    }
    return weeks;
  };

  // --- Add helper to determine Y axis format ---
  function getYAxisFormat(data: any[], keys: string[]) {
    let max = 0;
    for (const row of data) {
      for (const key of keys) {
        if (typeof row[key] === 'number' && row[key] > max) max = row[key];
      }
    }
    if (max > 60) {
      return {
        format: (v: number) => v >= 60 ? `${Math.round(v / 60)}h` : `${Math.round(v)}m`,
        isHours: true,
      };
    } else {
      return {
        format: (v: number) => `${Math.round(v)}m`,
        isHours: false,
      };
    }
  }

  const stats = calculateStats();
  const dailyActivity = getDailyActivity();

  // For daily and weekly activity, get y-axis format
  const dailyYAxis = getYAxisFormat(dailyActivity, ['meditation', 'work']);
  const weeklyYAxis = getYAxisFormat(getWeeklyLifetimeActivity(), ['meditation', 'work']);

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
        {/* For the analytics header icon: */}
        <div className="w-16 h-16 mb-6 flex items-center justify-center mx-auto animate-float">
          <Emoji emoji="🚀" png="rocket.png" alt="rocket" size="3xl" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3" style={{ letterSpacing: '-0.03em' }}>
          Your Progress
        </h1>
        <p className="text-white/80 text-lg max-w-sm mx-auto">
          Track your mindful journey
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Charts/Graphs */}
        <div>
          {/* Time Range Selector */}
          <div className="w-full max-w-sm mb-8">
            <div className="relative flex gap-2 justify-center flex-wrap">
              {timeRangeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTimeRange(option.value)}
                  className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 border focus:outline-none focus:ring-2 focus:ring-emerald-400/60
                    ${timeRange === option.value
                      ? 'bg-emerald-400/90 text-emerald-900 border-emerald-400 shadow-md'
                      : 'bg-emerald-900/60 text-white/80 border-emerald-700 hover:bg-emerald-800/60'}
                  `}
                  style={{ minWidth: 90 }}
                >
                  {option.label}
                </button>
              ))}
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
                <div className="text-center col-span-2">
                  <div className="text-2xl font-bold text-purple-300 mb-1">
                    {getBookSummariesRead()}
                  </div>
                  <div className="text-sm text-white/70">Book Summaries Read</div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Chart */}
          <div className="w-full max-w-sm mb-8">
            <div className="bg-emerald-900/60 rounded-2xl p-6 border border-emerald-700">
              <h3 className="text-xl font-bold text-white mb-4 text-center">
                {timeRange === 'lifetime' ? 'Weekly Activity' : 'Daily Activity'}
              </h3>

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
                <div style={{ width: '100%', height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getWeeklyLifetimeActivity()} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis
                        dataKey="week"
                        stroke="rgba(255,255,255,0.6)"
                        fontSize={12}
                      />
                      <YAxis
                        stroke="rgba(255,255,255,0.6)"
                        fontSize={12}
                        tickFormatter={weeklyYAxis.format}
                        width={36}
                        domain={['auto', dataMax => Math.ceil(dataMax + 5)]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(0,0,0,0.9)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          color: '#fff'
                        }}
                        formatter={(value: any) => weeklyYAxis.isHours && value >= 60 ? `${Math.round(value / 60)}h` : `${Math.round(value)}m`}
                      />
                      <Line type="monotone" dataKey="meditation" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} name="Meditation" />
                      <Line type="monotone" dataKey="work" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} name="Focus" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ width: '100%', height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyActivity} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
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
                        tickFormatter={dailyYAxis.format}
                        width={36}
                        domain={['auto', dataMax => Math.ceil(dataMax + 5)]}
                      />
                      {timeRange === '7d' ? (
                        <Tooltip content={<Custom7DayTooltip />} />
                      ) : (
                        <Tooltip formatter={(value: any) => dailyYAxis.isHours && value >= 60 ? `${Math.round(value / 60)}h` : `${Math.round(value)}m`} />
                      )}
                      <Line type="monotone" dataKey="meditation" stroke="#10b981" strokeWidth={2.5}
                        dot={timeRange === '7d' ? { r: 4, fill: '#10b981' } : false}
                        activeDot={timeRange === '7d' ? { r: 6 } : false}
                        name="Meditation" />
                      <Line type="monotone" dataKey="work" stroke="#3b82f6" strokeWidth={2.5}
                        dot={timeRange === '7d' ? { r: 4, fill: '#3b82f6' } : false}
                        activeDot={timeRange === '7d' ? { r: 6 } : false}
                        name="Focus" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Additional Stats */}
          <div className="w-full max-w-sm space-y-8">
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

          {/* Book Summaries Breakdown */}
          {getBookSummariesRead() > 0 && (
            <div className="w-full max-w-sm mt-8">
              <div className="bg-emerald-900/60 rounded-2xl p-4 border border-emerald-700">
                <h3 className="text-lg font-bold text-white mb-3 text-center">Read Book Summaries</h3>
                <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                  {userBookStatus
                    .filter(s => s.timestamp && (timeRange === 'lifetime' || new Date(s.timestamp) >= new Date(Date.now() - (timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90) * 24 * 60 * 60 * 1000)))
                    .map(s => {
                      const book = bookSummaries.find(b => b.id === s.book_summary_id);
                      if (!book) return null;
                      return (
                        <div key={book.id} className="flex items-center gap-3 bg-emerald-800/40 rounded-xl px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-semibold text-sm truncate">{book.title}</div>
                            {book.category && <div className="text-xs text-emerald-300 truncate">{book.category}</div>}
                          </div>
                          <span className="text-xs text-emerald-400">{s.timestamp ? new Date(s.timestamp).toLocaleDateString() : ''}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Stats/Filters */}
        <div>
          {/* Motivational Footer */}
          <div className="mt-12 text-center">
            <p className="text-white/60 text-sm">
              Progress, not perfection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}