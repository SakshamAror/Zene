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

// Helper to render summary text with **bold** formatting
function renderSummaryWithBold(text: string) {
  if (!text) return null;
  // Split on ** and alternate between normal and bold
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
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
  const [selectedMetric, setSelectedMetric] = useState<'both' | 'meditation' | 'focus'>('both');

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
    } else if (timeRange === '7d') {
      // For "This week", use calendar week (Monday to Sunday)
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Start of current week (Monday)
      currentWeekStart.setHours(0, 0, 0, 0);

      const currentWeekEnd = new Date(now);
      currentWeekEnd.setHours(23, 59, 59, 999);

      // Use local date strings to avoid timezone issues
      const weekStartStr = currentWeekStart.toLocaleDateString('en-CA'); // YYYY-MM-DD format
      const weekEndStr = currentWeekEnd.toLocaleDateString('en-CA'); // YYYY-MM-DD format

      return {
        meditations: data.meditations.filter(m => {
          const dateStr = m.timestamp && m.timestamp.split('T')[0];
          return dateStr && dateStr >= weekStartStr && dateStr <= weekEndStr;
        }),
        workSessions: data.workSessions.filter(w => {
          const dateStr = w.timestamp && w.timestamp.split('T')[0];
          return dateStr && dateStr >= weekStartStr && dateStr <= weekEndStr;
        }),
        journals: data.journals.filter(j => {
          const dateStr = j.timestamp && j.timestamp.split('T')[0];
          return dateStr && dateStr >= weekStartStr && dateStr <= weekEndStr;
        }),
        goals: data.goals.filter(g => {
          const dateStr = g.timestamp && g.timestamp.split('T')[0];
          return dateStr && dateStr >= weekStartStr && dateStr <= weekEndStr;
        }),
      };
    } else if (timeRange === 'last7d') {
      // For "Last week", use previous calendar week (Monday to Sunday)
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Start of current week (Monday)
      currentWeekStart.setHours(0, 0, 0, 0);

      const lastWeekStart = new Date(currentWeekStart);
      lastWeekStart.setDate(currentWeekStart.getDate() - 7); // 7 days before current week start

      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekStart.getDate() + 6); // 6 days after last week start
      lastWeekEnd.setHours(23, 59, 59, 999);

      // Use local date strings to avoid timezone issues
      const weekStartStr = lastWeekStart.toLocaleDateString('en-CA'); // YYYY-MM-DD format
      const weekEndStr = lastWeekEnd.toLocaleDateString('en-CA'); // YYYY-MM-DD format

      return {
        meditations: data.meditations.filter(m => {
          const dateStr = m.timestamp && m.timestamp.split('T')[0];
          return dateStr && dateStr >= weekStartStr && dateStr <= weekEndStr;
        }),
        workSessions: data.workSessions.filter(w => {
          const dateStr = w.timestamp && w.timestamp.split('T')[0];
          return dateStr && dateStr >= weekStartStr && dateStr <= weekEndStr;
        }),
        journals: data.journals.filter(j => {
          const dateStr = j.timestamp && j.timestamp.split('T')[0];
          return dateStr && dateStr >= weekStartStr && dateStr <= weekEndStr;
        }),
        goals: data.goals.filter(g => {
          const dateStr = g.timestamp && g.timestamp.split('T')[0];
          return dateStr && dateStr >= weekStartStr && dateStr <= weekEndStr;
        }),
      };
    } else {
      const days = timeRange === '30d' ? 30 : 90;
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const cutoffStr = cutoff.toLocaleDateString('en-CA'); // YYYY-MM-DD format
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

  const calculatePreviousWeekStats = () => {
    const now = new Date();

    if (timeRange === 'last7d') {
      // For "Last week", compare with the week before last week
      // Current period: Last week (Monday to Sunday)
      // Previous period: Two weeks ago (Monday to Sunday)
      // --- Use local time for week boundaries ---
      // Get Monday of current week
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Start of current week (Monday)
      currentWeekStart.setHours(0, 0, 0, 0);

      // Get Monday of last week
      const lastWeekStart = new Date(currentWeekStart);
      lastWeekStart.setDate(currentWeekStart.getDate() - 7);
      lastWeekStart.setHours(0, 0, 0, 0);

      // Get Monday of two weeks ago
      const twoWeeksAgoStart = new Date(lastWeekStart);
      twoWeeksAgoStart.setDate(lastWeekStart.getDate() - 7);
      twoWeeksAgoStart.setHours(0, 0, 0, 0);

      // Get Sunday of two weeks ago
      const twoWeeksAgoEnd = new Date(twoWeeksAgoStart);
      twoWeeksAgoEnd.setDate(twoWeeksAgoStart.getDate() + 6);
      twoWeeksAgoEnd.setHours(23, 59, 59, 999);

      // Filter by local date string (YYYY-MM-DD)
      const weekStartStr = twoWeeksAgoStart.toLocaleDateString('en-CA'); // YYYY-MM-DD format
      const weekEndStr = twoWeeksAgoEnd.toLocaleDateString('en-CA'); // YYYY-MM-DD format

      const previousWeekMeditations = data.meditations.filter(m => {
        const dateStr = m.timestamp && m.timestamp.split('T')[0];
        return dateStr && dateStr >= weekStartStr && dateStr <= weekEndStr;
      });
      const previousWeekWorkSessions = data.workSessions.filter(w => {
        const dateStr = w.timestamp && w.timestamp.split('T')[0];
        return dateStr && dateStr >= weekStartStr && dateStr <= weekEndStr;
      });
      const previousWeekJournals = data.journals.filter(j => {
        const dateStr = j.timestamp && j.timestamp.split('T')[0];
        return dateStr && dateStr >= weekStartStr && dateStr <= weekEndStr;
      });
      const previousWeekGoals = data.goals.filter(g => {
        const dateStr = g.timestamp && g.timestamp.split('T')[0];
        return dateStr && dateStr >= weekStartStr && dateStr <= weekEndStr;
      });

      const totalPreviousMeditationTime = previousWeekMeditations.reduce((sum, m) => sum + m.length, 0);
      const totalPreviousWorkTime = previousWeekWorkSessions.reduce((sum, w) => sum + w.length, 0);
      const previousJournalEntries = previousWeekJournals.length;
      const previousCompletedGoals = previousWeekGoals.filter(g => g.completed).length;
      const previousTotalGoals = previousWeekGoals.length;

      const result = {
        totalMeditationTime: Math.round(totalPreviousMeditationTime / 60),
        totalWorkTime: Math.round(totalPreviousWorkTime / 60),
        journalEntries: previousJournalEntries,
        goalCompletionRate: previousTotalGoals > 0 ? Math.round((previousCompletedGoals / previousTotalGoals) * 100) : 0,
      };
      return result;
    } else {
      // For "This week", compare with the previous calendar week
      // Current period: This week (Monday to Sunday)
      // Previous period: Last week (Monday to Sunday)
      // --- Use local time for week boundaries ---
      // Get Monday of current week
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Start of current week (Monday)
      currentWeekStart.setHours(0, 0, 0, 0);

      // Get Monday of previous week
      const previousWeekStart = new Date(currentWeekStart);
      previousWeekStart.setDate(currentWeekStart.getDate() - 7);
      previousWeekStart.setHours(0, 0, 0, 0);

      // Get Sunday of previous week
      const previousWeekEnd = new Date(previousWeekStart);
      previousWeekEnd.setDate(previousWeekStart.getDate() + 6);
      previousWeekEnd.setHours(23, 59, 59, 999);

      // Filter by local date string (YYYY-MM-DD)
      const weekStartStr = previousWeekStart.toLocaleDateString('en-CA'); // YYYY-MM-DD format
      const weekEndStr = previousWeekEnd.toLocaleDateString('en-CA'); // YYYY-MM-DD format

      const previousWeekMeditations = data.meditations.filter(m => {
        const dateStr = m.timestamp && m.timestamp.split('T')[0];
        return dateStr && dateStr >= weekStartStr && dateStr <= weekEndStr;
      });
      const previousWeekWorkSessions = data.workSessions.filter(w => {
        const dateStr = w.timestamp && w.timestamp.split('T')[0];
        return dateStr && dateStr >= weekStartStr && dateStr <= weekEndStr;
      });
      const previousWeekJournals = data.journals.filter(j => {
        const dateStr = j.timestamp && j.timestamp.split('T')[0];
        return dateStr && dateStr >= weekStartStr && dateStr <= weekEndStr;
      });
      const previousWeekGoals = data.goals.filter(g => {
        const dateStr = g.timestamp && g.timestamp.split('T')[0];
        return dateStr && dateStr >= weekStartStr && dateStr <= weekEndStr;
      });

      const totalPreviousMeditationTime = previousWeekMeditations.reduce((sum, m) => sum + m.length, 0);
      const totalPreviousWorkTime = previousWeekWorkSessions.reduce((sum, w) => sum + w.length, 0);
      const previousJournalEntries = previousWeekJournals.length;
      const previousCompletedGoals = previousWeekGoals.filter(g => g.completed).length;
      const previousTotalGoals = previousWeekGoals.length;

      const result = {
        totalMeditationTime: Math.round(totalPreviousMeditationTime / 60),
        totalWorkTime: Math.round(totalPreviousWorkTime / 60),
        journalEntries: previousJournalEntries,
        goalCompletionRate: previousTotalGoals > 0 ? Math.round((previousCompletedGoals / previousTotalGoals) * 100) : 0,
      };
      return result;
    }
  };

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) {
      return current > 0 ? { type: 'new', value: null } : { type: 'none', value: null };
    }
    const change = ((current - previous) / previous) * 100;
    if (change > 0) {
      return { type: 'increase', value: `+${Math.round(change)}%` };
    } else if (change < 0) {
      return { type: 'decrease', value: `${Math.round(change)}%` };
    } else {
      return { type: 'none', value: '+0%' };
    }
  };

  const shouldShowPercentageChanges = () => {
    if (timeRange !== '7d' && timeRange !== 'last7d') return false;

    const previousStats = calculatePreviousWeekStats();
    const currentBookSummaries = getBookSummariesRead();
    const previousBookSummaries = (() => {
      if (!userBookStatus) return 0;
      const now = new Date();

      // Use the same logic as calculatePreviousWeekStats for calendar weeks
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Start of current week (Monday)
      currentWeekStart.setHours(0, 0, 0, 0);

      const previousWeekStart = new Date(currentWeekStart);
      previousWeekStart.setDate(previousWeekStart.getDate() - 7); // 7 days before current week start

      const previousWeekEnd = new Date(previousWeekStart);
      previousWeekEnd.setDate(previousWeekEnd.getDate() + 6); // 6 days after previous week start
      previousWeekEnd.setHours(23, 59, 59, 999);

      return userBookStatus.filter(s => {
        const timestamp = new Date(s.timestamp);
        return timestamp >= previousWeekStart && timestamp <= previousWeekEnd;
      }).length;
    })();

    const meditationChange = calculatePercentageChange(stats.totalMeditationTime, previousStats.totalMeditationTime);
    const focusChange = calculatePercentageChange(stats.totalWorkTime, previousStats.totalWorkTime);
    const bookChange = calculatePercentageChange(currentBookSummaries, previousBookSummaries);

    return meditationChange.value !== null || focusChange.value !== null || bookChange.value !== null;
  };

  // Helper: always generate week as Monday to Sunday
  const weekDayLabels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const getDailyActivity = () => {
    if (timeRange === '7d' || timeRange === 'last7d') {
      // Always generate week as Monday to Sunday
      const now = new Date();
      let weekStart = new Date(now);

      if (timeRange === '7d') {
        // For "This week", use calendar week (Monday to Sunday)
        weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Start of current week (Monday)
      } else {
        // For "Last week", use previous calendar week (Monday to Sunday)
        const currentWeekStart = new Date(now);
        currentWeekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Start of current week (Monday)
        weekStart = new Date(currentWeekStart);
        weekStart.setDate(currentWeekStart.getDate() - 7); // 7 days before current week start
      }

      weekStart.setHours(0, 0, 0, 0);
      const dailyData = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateStr = date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
        const dayMeditations = data.meditations.filter(m => m.timestamp && m.timestamp.split('T')[0] === dateStr);
        const dayWork = data.workSessions.filter(w => w.timestamp && w.timestamp.split('T')[0] === dateStr);
        let isFuture = false;
        if (timeRange === '7d') {
          const today = new Date();
          isFuture = date > today;
        }
        dailyData.push({
          date: dateStr,
          meditation: isFuture ? undefined : dayMeditations.reduce((sum, m) => sum + m.length, 0) / 60,
          work: isFuture ? undefined : dayWork.reduce((sum, w) => sum + w.length, 0) / 60,
        });
      }
      return dailyData;
    } else {
      const days = timeRange === '30d' ? 30 : 90;
      const dailyData = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
        const dayMeditations = data.meditations.filter(m => m.timestamp && m.timestamp.split('T')[0] === dateStr);
        const dayWork = data.workSessions.filter(w => w.timestamp && w.timestamp.split('T')[0] === dateStr);
        dailyData.push({
          date: dateStr,
          meditation: dayMeditations.reduce((sum, m) => sum + m.length, 0) / 60,
          work: dayWork.reduce((sum, w) => sum + w.length, 0) / 60,
        });
      }
      return dailyData;
    }
  };

  // Helper to get book summaries read in selected time frame
  const getBookSummariesRead = () => {
    if (!userBookStatus) return 0;
    if (timeRange === 'lifetime') {
      return userBookStatus.filter(s => s.timestamp).length;
    } else if (timeRange === '7d') {
      // For "This week", use calendar week (Monday to Sunday)
      const now = new Date();
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Start of current week (Monday)
      currentWeekStart.setHours(0, 0, 0, 0);

      const currentWeekEnd = new Date(now);
      currentWeekEnd.setHours(23, 59, 59, 999);

      const weekStartStr = currentWeekStart.toLocaleDateString('en-CA'); // YYYY-MM-DD format
      const weekEndStr = currentWeekEnd.toLocaleDateString('en-CA'); // YYYY-MM-DD format

      return userBookStatus.filter(s => {
        const dateStr = s.timestamp && s.timestamp.split('T')[0];
        return dateStr && dateStr >= weekStartStr && dateStr <= weekEndStr;
      }).length;
    } else if (timeRange === 'last7d') {
      // For "Last week", use previous calendar week (Monday to Sunday)
      const now = new Date();
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Start of current week (Monday)
      currentWeekStart.setHours(0, 0, 0, 0);

      const lastWeekStart = new Date(currentWeekStart);
      lastWeekStart.setDate(currentWeekStart.getDate() - 7); // 7 days before current week start

      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekStart.getDate() + 6); // 6 days after last week start
      lastWeekEnd.setHours(23, 59, 59, 999);

      const weekStartStr = lastWeekStart.toLocaleDateString('en-CA'); // YYYY-MM-DD format
      const weekEndStr = lastWeekEnd.toLocaleDateString('en-CA'); // YYYY-MM-DD format

      return userBookStatus.filter(s => {
        const dateStr = s.timestamp && s.timestamp.split('T')[0];
        return dateStr && dateStr >= weekStartStr && dateStr <= weekEndStr;
      }).length;
    } else {
      const days = timeRange === '30d' ? 30 : 90;
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const cutoffStr = cutoff.toLocaleDateString('en-CA'); // YYYY-MM-DD format
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

  // Helper to get Y-axis format based on selected metric
  function getYAxisFormatForMetric(data: any[], metric: 'both' | 'meditation' | 'focus') {
    if (metric === 'both') {
      return getYAxisFormat(data, ['meditation', 'work']);
    } else {
      const key = metric === 'meditation' ? 'meditation' : 'work';
      let max = 0;
      for (const row of data) {
        if (typeof row[key] === 'number' && row[key] > max) max = row[key];
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
  }

  // Helper to get domain based on selected metric
  function getYAxisDomain(data: any[], metric: 'both' | 'meditation' | 'focus') {
    let max = 0;
    if (metric === 'both') {
      for (const row of data) {
        if (typeof row.meditation === 'number' && row.meditation > max) max = row.meditation;
        if (typeof row.work === 'number' && row.work > max) max = row.work;
      }
    } else {
      const key = metric === 'meditation' ? 'meditation' : 'work';
      for (const row of data) {
        if (typeof row[key] === 'number' && row[key] > max) max = row[key];
      }
    }
    // Always at least 5 for visual padding
    if (max < 5) max = 5;
    if (max > 60) {
      const maxHours = Math.ceil(max / 60);
      return [0, maxHours * 60] as const;
    } else {
      const roundedMax = Math.ceil(max / 5) * 5;
      return [0, roundedMax] as const;
    }
  }

  // Helper to generate Y-axis ticks, always include 0
  function getYAxisTicks(data: any[], metric: 'both' | 'meditation' | 'focus') {
    const domain = getYAxisDomain(data, metric);
    const min: number = domain[0];
    const max: number = domain[1];
    const ticks: number[] = [min];
    if (max <= 60) {
      for (let t = min + 1; t <= max; t++) {
        if (t % 5 === 0) ticks.push(t);
      }
    } else {
      for (let t = min + 60; t <= max; t += 60) {
        ticks.push(t);
      }
    }
    return ticks;
  }



  // Helper to get domain-based ticks that include all domain values
  function getDomainBasedTicks(data: any[], metric: 'both' | 'meditation' | 'focus') {
    let max = 0;

    if (metric === 'both') {
      // For 'both', check both meditation and work values
      for (const row of data) {
        if (typeof row.meditation === 'number' && row.meditation > max) max = row.meditation;
        if (typeof row.work === 'number' && row.work > max) max = row.work;
      }
    } else {
      // For single metric, check only that metric
      const key = metric === 'meditation' ? 'meditation' : 'work';
      for (const row of data) {
        if (typeof row[key] === 'number' && row[key] > max) max = row[key];
      }
    }

    if (max > 60) {
      // Get the actual domain maximum (rounded up to next hour)
      const maxHours = Math.ceil(max / 60);
      const domainMaxHours = maxHours; // This matches our domain calculation
      const ticks = [];

      if (domainMaxHours <= 4) {
        // Small scale: show every hour
        for (let i = 0; i <= domainMaxHours; i++) {
          ticks.push(i * 60);
        }
      } else if (domainMaxHours <= 8) {
        // Medium scale: show every 2 hours
        for (let i = 0; i <= domainMaxHours; i += 2) {
          ticks.push(i * 60);
        }
      } else if (domainMaxHours <= 12) {
        // Large scale: show every 2 hours
        for (let i = 0; i <= domainMaxHours; i += 2) {
          ticks.push(i * 60);
        }
      } else {
        // Very large scale: show every 3 hours
        for (let i = 0; i <= domainMaxHours; i += 3) {
          ticks.push(i * 60);
        }
      }

      return ticks;
    } else {
      // For minutes, let the chart auto-generate linear ticks
      return undefined;
    }
  }

  // Helper to filter data based on selected metric
  function getFilteredChartData(data: any[], metric: 'both' | 'meditation' | 'focus') {
    if (metric === 'both') {
      return data;
    } else {
      // When a specific metric is selected, only show that metric's data
      return data.map(row => ({
        ...row,
        [metric === 'meditation' ? 'work' : 'meditation']: 0 // Set the other metric to 0
      }));
    }
  }

  const stats = calculateStats();
  const dailyActivity = getDailyActivity();

  // For daily and weekly activity, get y-axis format based on selected metric
  const dailyYAxis = getYAxisFormatForMetric(dailyActivity, selectedMetric);
  const weeklyYAxis = getYAxisFormatForMetric(getWeeklyLifetimeActivity(), selectedMetric);
  const dailyYAxisDomain = getYAxisDomain(dailyActivity, selectedMetric);
  const weeklyYAxisDomain = getYAxisDomain(getWeeklyLifetimeActivity(), selectedMetric);

  // Filter chart data based on selected metric
  const filteredDailyActivity = getFilteredChartData(dailyActivity, selectedMetric);
  const filteredWeeklyActivity = getFilteredChartData(getWeeklyLifetimeActivity(), selectedMetric);

  // Get Y-axis ticks for proper hour labels
  const dailyYAxisTicks = getDomainBasedTicks(dailyActivity, selectedMetric);
  const weeklyYAxisTicks = getDomainBasedTicks(getWeeklyLifetimeActivity(), selectedMetric);

  const timeRangeOptions = [
    { label: 'This week', value: '7d' },
    { label: 'Last week', value: 'last7d' },
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
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 to-emerald-700 flex flex-col items-center px-4 py-6">
      {/* Header */}
      <div className="text-center mb-6">
        {/* For the analytics header icon: */}
        <div className="w-14 h-14 mb-4 flex items-center justify-center mx-auto animate-float">
          <Emoji emoji="🚀" png="rocket.png" alt="rocket" size="2xl" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2" style={{ letterSpacing: '-0.03em' }}>
          Your Progress
        </h1>
        <p className="text-white/80 text-base max-w-xs mx-auto">
          Track your mindful journey
        </p>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center w-full max-w-sm mx-auto">
        {/* Time Range Selector */}
        <div className="w-full mb-6">
          <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
            {timeRangeOptions.slice(0, 4).map((option) => (
              <button
                key={option.value}
                onClick={() => setTimeRange(option.value)}
                className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 border focus:outline-none focus:ring-2 focus:ring-emerald-400/60
                    ${timeRange === option.value
                    ? 'bg-emerald-400/90 text-emerald-900 border-emerald-400 shadow-md'
                    : 'bg-emerald-900/60 text-white/80 border-emerald-700 hover:bg-emerald-800/60'}
                  `}
                style={{ minWidth: 100 }}
              >
                {option.label}
              </button>
            ))}
          </div>
          {/* Lifetime button full width */}
          <div className="flex mt-2 max-w-sm mx-auto">
            <button
              onClick={() => setTimeRange('lifetime')}
              className={`flex-1 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 border focus:outline-none focus:ring-2 focus:ring-emerald-400/60
                ${timeRange === 'lifetime'
                  ? 'bg-emerald-400/90 text-emerald-900 border-emerald-400 shadow-md'
                  : 'bg-emerald-900/60 text-white/80 border-emerald-700 hover:bg-emerald-800/60'}
              `}
              style={{ minWidth: 0 }}
            >
              Lifetime
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="w-full mb-6">
          <div className="bg-emerald-900/60 rounded-2xl p-4 border border-emerald-700">
            {shouldShowPercentageChanges() && (
              <div className="text-center mb-4">
                <div className="text-xs text-white/60 font-medium"><i> % change  </i> from last week</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="text-xl font-bold text-emerald-300 mb-1">
                  {stats.totalMeditationTime}m
                </div>
                <div className="text-xs text-white/70">Meditation</div>
                {(timeRange === '7d' || timeRange === 'last7d') && (
                  <div className="text-xs text-emerald-400 mt-1">
                    {(() => {
                      const previousStats = calculatePreviousWeekStats();
                      const change = calculatePercentageChange(stats.totalMeditationTime, previousStats.totalMeditationTime);
                      return change.value || '';
                    })()}
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-blue-300 mb-1">
                  {stats.totalWorkTime}m
                </div>
                <div className="text-xs text-white/70">Focus Time</div>
                {(timeRange === '7d' || timeRange === 'last7d') && (
                  <div className="text-xs text-blue-400 mt-1">
                    {(() => {
                      const previousStats = calculatePreviousWeekStats();
                      const change = calculatePercentageChange(stats.totalWorkTime, previousStats.totalWorkTime);
                      return change.value || '';
                    })()}
                  </div>
                )}
              </div>
              <div className="text-center col-span-2">
                <div className="text-xl font-bold text-purple-300 mb-1">
                  {getBookSummariesRead()}
                </div>
                <div className="text-xs text-white/70">Book Summaries Read</div>
                {(timeRange === '7d' || timeRange === 'last7d') && (
                  <div className="text-xs text-purple-400 mt-1">
                    {(() => {
                      const previousStats = calculatePreviousWeekStats();
                      const currentBookSummaries = getBookSummariesRead();
                      const previousBookSummaries = (() => {
                        if (!userBookStatus) return 0;
                        const now = new Date();
                        const currentWeekStart = new Date(now);
                        currentWeekStart.setDate(now.getDate() - now.getDay());
                        currentWeekStart.setHours(0, 0, 0, 0);

                        const previousWeekStart = new Date(currentWeekStart);
                        previousWeekStart.setDate(previousWeekStart.getDate() - 7);

                        const previousWeekEnd = new Date(previousWeekStart);
                        previousWeekEnd.setDate(previousWeekEnd.getDate() + 6);
                        previousWeekEnd.setHours(23, 59, 59, 999);

                        return userBookStatus.filter(s => {
                          const timestamp = new Date(s.timestamp);
                          return timestamp >= previousWeekStart && timestamp <= previousWeekEnd;
                        }).length;
                      })();
                      const change = calculatePercentageChange(currentBookSummaries, previousBookSummaries);
                      return change.value || '';
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Activity Chart */}
        <div className="w-full mb-6">
          <div className="bg-emerald-900/60 rounded-2xl p-4 border border-emerald-700">
            <h3 className="text-lg font-bold text-white mb-3 text-center">
              {timeRange === 'lifetime' ? 'Weekly Activity' : 'Daily Activity'}
            </h3>

            {/* Metric Toggle Buttons */}
            <div className="flex items-center justify-center gap-1 mb-3">
              <button
                onClick={() => setSelectedMetric('both')}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all duration-200 border
                    ${selectedMetric === 'both'
                    ? 'bg-emerald-400/90 text-emerald-900 border-emerald-400 shadow-md'
                    : 'bg-emerald-800/60 text-white/80 border-emerald-700 hover:bg-emerald-700/60'
                  }`}
              >
                Both
              </button>
              <button
                onClick={() => setSelectedMetric('meditation')}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all duration-200 border
                    ${selectedMetric === 'meditation'
                    ? 'bg-emerald-400/90 text-emerald-900 border-emerald-400 shadow-md'
                    : 'bg-emerald-800/60 text-white/80 border-emerald-700 hover:bg-emerald-700/60'
                  }`}
              >
                Meditation
              </button>
              <button
                onClick={() => setSelectedMetric('focus')}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all duration-200 border
                    ${selectedMetric === 'focus'
                    ? 'bg-blue-400/90 text-blue-900 border-blue-400 shadow-md'
                    : 'bg-emerald-800/60 text-white/80 border-emerald-700 hover:bg-emerald-700/60'
                  }`}
              >
                Focus
              </button>
            </div>

            <div className="flex items-center justify-center space-x-4 mb-3 text-xs">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded ${selectedMetric === 'meditation' ? 'bg-emerald-400 shadow-sm shadow-emerald-400/30' : 'bg-emerald-400'}`}></div>
                <span className={`${selectedMetric === 'meditation' ? 'text-emerald-200 font-semibold' : 'text-emerald-300'}`}>Meditation</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded ${selectedMetric === 'focus' ? 'bg-blue-400 shadow-sm shadow-blue-400/30' : 'bg-blue-400'}`}></div>
                <span className={`${selectedMetric === 'focus' ? 'text-blue-200 font-semibold' : 'text-blue-300'}`}>Focus</span>
              </div>
            </div>

            {timeRange === 'lifetime' ? (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredWeeklyActivity} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
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
                      domain={weeklyYAxisDomain}
                      ticks={weeklyYAxisTicks}
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
                    {/* Render lines based on selected metric */}
                    {selectedMetric === 'both' && (
                      <>
                        <Line
                          type="monotone"
                          dataKey="meditation"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          dot={{
                            r: 4,
                            fill: '#10b981',
                            filter: 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.4))'
                          }}
                          activeDot={{
                            r: 6,
                            filter: 'drop-shadow(0 0 5px rgba(16, 185, 129, 0.5))'
                          }}
                          name="Meditation"
                          style={{
                            filter: 'drop-shadow(0 0 3px rgba(16, 185, 129, 0.3))'
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="work"
                          stroke="#3b82f6"
                          strokeWidth={2.5}
                          dot={{
                            r: 4,
                            fill: '#3b82f6',
                            filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.4))'
                          }}
                          activeDot={{
                            r: 6,
                            filter: 'drop-shadow(0 0 5px rgba(59, 130, 246, 0.5))'
                          }}
                          name="Focus"
                          style={{
                            filter: 'drop-shadow(0 0 3px rgba(59, 130, 246, 0.3))'
                          }}
                        />
                      </>
                    )}
                    {selectedMetric === 'meditation' && (
                      <Line
                        type="monotone"
                        dataKey="meditation"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={{
                          r: 4,
                          fill: '#10b981',
                          filter: 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.4))'
                        }}
                        activeDot={{
                          r: 6,
                          filter: 'drop-shadow(0 0 5px rgba(16, 185, 129, 0.5))'
                        }}
                        name="Meditation"
                        style={{
                          filter: 'drop-shadow(0 0 3px rgba(16, 185, 129, 0.3))'
                        }}
                      />
                    )}
                    {selectedMetric === 'focus' && (
                      <Line
                        type="monotone"
                        dataKey="work"
                        stroke="#3b82f6"
                        strokeWidth={2.5}
                        dot={{
                          r: 4,
                          fill: '#3b82f6',
                          filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.4))'
                        }}
                        activeDot={{
                          r: 6,
                          filter: 'drop-shadow(0 0 5px rgba(59, 130, 246, 0.5))'
                        }}
                        name="Focus"
                        style={{
                          filter: 'drop-shadow(0 0 3px rgba(59, 130, 246, 0.3))'
                        }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredDailyActivity} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d, idx) => {
                        const date = new Date(d);
                        // Use index for label
                        const dayName = weekDayLabels[idx % 7];
                        return `${date.getDate()}\n${dayName}`;
                      }}
                      stroke="rgba(255,255,255,0.6)"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.6)"
                      fontSize={12}
                      tickFormatter={dailyYAxis.format}
                      width={36}
                      domain={[dailyYAxisDomain[0], dailyYAxisDomain[1]]}
                      ticks={dailyYAxisTicks}
                    />
                    {timeRange === '7d' ? (
                      <Tooltip content={<Custom7DayTooltip />} />
                    ) : (
                      <Tooltip formatter={(value: any) => dailyYAxis.isHours && value >= 60 ? `${Math.round(value / 60)}h` : `${Math.round(value)}m`} />
                    )}
                    {/* Render lines based on selected metric */}
                    {selectedMetric === 'both' && (
                      <>
                        <Line
                          type="monotone"
                          dataKey="meditation"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          dot={timeRange === '7d' || timeRange === 'last7d' ? {
                            r: 4,
                            fill: '#10b981',
                            filter: 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.4))'
                          } : false}
                          activeDot={timeRange === '7d' || timeRange === 'last7d' ? {
                            r: 6,
                            filter: 'drop-shadow(0 0 5px rgba(16, 185, 129, 0.5))'
                          } : false}
                          name="Meditation"
                          style={{
                            filter: 'drop-shadow(0 0 3px rgba(16, 185, 129, 0.3))'
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="work"
                          stroke="#3b82f6"
                          strokeWidth={2.5}
                          dot={timeRange === '7d' || timeRange === 'last7d' ? {
                            r: 4,
                            fill: '#3b82f6',
                            filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.4))'
                          } : false}
                          activeDot={timeRange === '7d' || timeRange === 'last7d' ? {
                            r: 6,
                            filter: 'drop-shadow(0 0 5px rgba(59, 130, 246, 0.5))'
                          } : false}
                          name="Focus"
                          style={{
                            filter: 'drop-shadow(0 0 3px rgba(59, 130, 246, 0.3))'
                          }}
                        />
                      </>
                    )}
                    {selectedMetric === 'meditation' && (
                      <Line
                        type="monotone"
                        dataKey="meditation"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={timeRange === '7d' || timeRange === 'last7d' ? {
                          r: 4,
                          fill: '#10b981',
                          filter: 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.4))'
                        } : false}
                        activeDot={timeRange === '7d' || timeRange === 'last7d' ? {
                          r: 6,
                          filter: 'drop-shadow(0 0 5px rgba(16, 185, 129, 0.5))'
                        } : false}
                        name="Meditation"
                        style={{
                          filter: 'drop-shadow(0 0 3px rgba(16, 185, 129, 0.3))'
                        }}
                      />
                    )}
                    {selectedMetric === 'focus' && (
                      <Line
                        type="monotone"
                        dataKey="work"
                        stroke="#3b82f6"
                        strokeWidth={2.5}
                        dot={timeRange === '7d' || timeRange === 'last7d' ? {
                          r: 4,
                          fill: '#3b82f6',
                          filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.4))'
                        } : false}
                        activeDot={timeRange === '7d' || timeRange === 'last7d' ? {
                          r: 6,
                          filter: 'drop-shadow(0 0 5px rgba(59, 130, 246, 0.5))'
                        } : false}
                        name="Focus"
                        style={{
                          filter: 'drop-shadow(0 0 3px rgba(59, 130, 246, 0.3))'
                        }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Additional Stats */}
        <div className="w-full space-y-3">
          <div className="bg-emerald-900/60 rounded-2xl p-3 border border-emerald-700">
            <div className="text-center">
              <div className="text-lg font-bold text-white mb-1">{stats.journalEntries}</div>
              <div className="text-xs text-white/70">Journal Entries</div>
            </div>
          </div>

          <div className="bg-emerald-900/60 rounded-2xl p-3 border border-emerald-700">
            <div className="text-center">
              <div className="text-lg font-bold text-white mb-1">{stats.goalCompletionRate}%</div>
              <div className="text-xs text-white/70">Goal Completion</div>
            </div>
          </div>
        </div>

        {/* Book Summaries Breakdown */}
        {getBookSummariesRead() > 0 && (
          <div className="w-full mt-6">
            <div className="bg-emerald-900/60 rounded-2xl p-3 border border-emerald-700">
              <h3 className="text-base font-bold text-white mb-2 text-center">Read Book Summaries</h3>
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
                          {book.summary && (
                            <div className="text-xs text-white/80 mt-1 line-clamp-3">
                              {renderSummaryWithBold(book.summary)}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-emerald-400">{s.timestamp ? new Date(s.timestamp).toLocaleDateString() : ''}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* Motivational Footer */}
        <div className="mt-8 text-center">
          <p className="text-white/60 text-xs">
            Progress, not perfection.
          </p>
        </div>
      </div>
    </div>
  );
}