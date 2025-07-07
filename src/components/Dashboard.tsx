import React, { useState, useEffect, useRef } from 'react';
import { Clock, Target, PenTool, TrendingUp, Calendar, Award, ChevronRight, Play, Sparkles, Zap, Heart, Star, Coffee, Sunrise, Moon } from 'lucide-react';
import { getMeditationSessions, getWorkSessions, getJournalLogs, getGoals, getUserPrefs } from '../lib/saveData';
import type { MeditationSession, WorkSession, JournalLog, Goal } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import Analytics from './Analytics';

interface DashboardProps {
  userId: string;
  user?: any;
  setCurrentView: (view: 'dashboard' | 'timers' | 'goals' | 'journal' | 'learn' | 'analytics') => void;
}

export default function Dashboard({ userId, user, setCurrentView }: DashboardProps) {
  const [stats, setStats] = useState({
    totalMeditation: 0,
    totalWork: 0,
    journalEntries: 0,
    completedGoals: 0,
    streak: 0,
    todayMeditation: 0,
    todayWork: 0,
    journalToday: false,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState({
    meditations: [] as MeditationSession[],
    workSessions: [] as WorkSession[],
    journals: [] as JournalLog[],
    goals: [] as Goal[],
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [showConfetti, setShowConfetti] = useState(false);
  const [meditationGoal, setMeditationGoal] = useState(30);
  const [focusGoal, setFocusGoal] = useState(120);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [showStreakInfo, setShowStreakInfo] = useState(false);
  const streakRef = useRef<HTMLDivElement>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    async function fetchPrefs() {
      setPrefsLoading(true);
      try {
        const prefs = await getUserPrefs(userId);
        if (prefs) {
          setMeditationGoal(prefs.meditation_goal || 30);
          setFocusGoal(prefs.focus_goal || 120);
        } else {
          setMeditationGoal(30);
          setFocusGoal(120);
        }
      } catch {
        setMeditationGoal(30);
        setFocusGoal(120);
      } finally {
        setPrefsLoading(false);
      }
    }
    fetchPrefs();
  }, [userId]);

  useEffect(() => {
    loadDashboardData();
    loadAnalyticsData();
  }, [userId]);

  useEffect(() => {
    if (!showStreakInfo) return;
    function handleClickOutside(event: MouseEvent) {
      if (streakRef.current && !streakRef.current.contains(event.target as Node)) {
        setShowStreakInfo(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showStreakInfo]);

  useEffect(() => {
    function handleOnline() { setIsOnline(true); }
    function handleOffline() { setIsOnline(false); }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getMotivationalMessage = () => {
    const messages = [
      "Every moment is a fresh beginning.",
      "You're doing amazing things.",
      "Small steps, big impact.",
      "Your potential is limitless.",
      "Today is your day to shine.",
      "You've got this!",
      "Keep going, you're unstoppable.",
      "Your future self thanks you.",
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const getQuickActionRecommendation = () => {
    if (stats.todayMeditation < 10) return 'meditation';
    if (stats.todayWork < 30) return 'focus';
    if (!stats.journalToday) return 'journal';
    return 'learn';
  };

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
      const newStreak = calculateStreak(meditations, workSessions, journals);

      const todayStr = new Date().toISOString().split('T')[0];
      setStats({
        totalMeditation: Math.round(totalMeditation / 60),
        totalWork: Math.round(totalWork / 60),
        journalEntries: journals.length,
        completedGoals,
        streak: newStreak,
        todayMeditation: Math.round(meditations.filter(m => m.date === todayStr).reduce((sum, session) => sum + session.length, 0) / 60),
        todayWork: Math.round(workSessions.filter(w => w.date === todayStr).reduce((sum, session) => sum + session.length, 0) / 60),
        journalToday: journals.some(j => j.date === todayStr),
      });

      // Show confetti for milestone streaks
      if (newStreak > 0 && (newStreak % 7 === 0 || newStreak % 30 === 0)) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }

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

  const loadAnalyticsData = async () => {
    setAnalyticsLoading(true);
    try {
      const [meditations, workSessions, journals, goals] = await Promise.all([
        getMeditationSessions(userId),
        getWorkSessions(userId),
        getJournalLogs(userId),
        getGoals(userId),
      ]);
      setAnalyticsData({ meditations, workSessions, journals, goals });
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const calculateStreak = (meditations: MeditationSession[], workSessions: WorkSession[], journals: JournalLog[]) => {
    const today = new Date();
    let streak = 0;

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Only count streak if at least one goal (meditation or focus) is reached
      const hasGoal = meditations.some(m => m.date === dateStr && m.length > 0) ||
        workSessions.some(w => w.date === dateStr && w.length > 0);

      if (hasGoal) {
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

  const getFilteredData = () => {
    const now = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return {
      meditations: analyticsData.meditations.filter(m => m.date >= cutoffStr),
      workSessions: analyticsData.workSessions.filter(w => w.date >= cutoffStr),
      journals: analyticsData.journals.filter(j => j.date >= cutoffStr),
      goals: analyticsData.goals.filter(g => g.date_created >= cutoffStr),
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

  const dailyActivity = getDailyActivity();
  const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
  const gridColor = isDark ? '#334155' : '#e2e8f0';

  if (loading || prefsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 loading-spinner"></div>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="min-h-screen opal-bg flex flex-col items-center justify-center">
        <div className="w-full bg-red-500 text-white text-center py-3 font-semibold">
          No internet connection. Please enable WiFi to view your stats and progress.
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <span className="text-4xl mb-4">📡</span>
          <h2 className="text-xl font-bold mb-2">You're offline</h2>
          <p className="text-secondary text-center max-w-xs">Reconnect to the internet to see your latest stats, streak, and progress.</p>
        </div>
      </div>
    );
  }

  const recommendation = getQuickActionRecommendation();

  return (
    <div className="min-h-screen opal-bg">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 2}s`,
              }}
            >
              <Sparkles size={12} className="text-yellow-400" />
            </div>
          ))}
        </div>
      )}

      {/* Hero Section */}
      <div className="px-6 py-8">
        {/* Greeting */}
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Make the most of your day
          </h1>
          <p className="text-emerald-300 text-lg font-medium animate-pulse">
            Great minds don't wander, they conquer
          </p>
        </div>
      </div>

      {/* Smart Recommendation */}
      <div className="px-6 mb-8">
        <div className="opal-card rounded-xl p-6 border-l-4 border-emerald-500/50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Heart className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold mb-2">Smart Suggestion</h3>
              <p className="text-gray-300 mb-3">
                {recommendation === 'meditation' && "Start your day with a calming meditation session to set the right tone."}
                {recommendation === 'focus' && "Ready to tackle your most important tasks? Start a focused work session."}
                {recommendation === 'journal' && "Take a moment to reflect on your day and capture your thoughts."}
                {recommendation === 'learn' && "Expand your mind with some new insights and knowledge."}
              </p>
              <button
                onClick={() => setCurrentView(recommendation === 'meditation' || recommendation === 'focus' ? 'timers' : recommendation)}
                className="inline-flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-4 py-2 rounded-lg transition-colors"
              >
                <Play className="w-4 h-4" />
                Get Started
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Progress Rings */}
      <div className="px-6 mb-8">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          Today's Progress
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Meditation Progress Ring (pressable) */}
          <div
            className="text-center cursor-pointer transition-transform hover:scale-105"
            onClick={() => setCurrentView('timers')}
            title="Go to Meditation"
          >
            <div className="relative w-20 h-20 mx-auto mb-3">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="rgba(16, 185, 129, 0.2)"
                  strokeWidth="4"
                  fill="none"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="#10b981"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 32}`}
                  strokeDashoffset={`${2 * Math.PI * 32 * (1 - Math.min(stats.todayMeditation / meditationGoal, 1))}`}
                  className="transition-all duration-1000 ease-out"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-emerald-400">{stats.todayMeditation}m</span>
              </div>
            </div>
            <p className="text-white font-medium text-sm">Meditation</p>
            <p className="text-emerald-300 text-xs">Goal: {meditationGoal}m</p>
          </div>

          {/* Streak Display (move here, second) */}
          <div className="text-center">
            <div
              className="relative w-20 h-20 mx-auto mb-3 cursor-pointer focus:outline-none"
              ref={streakRef}
              tabIndex={0}
              onClick={() => setShowStreakInfo((prev) => !prev)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setShowStreakInfo(true); }}
            >
              {/* Flames behind */}
              <div className="absolute inset-0" style={{ zIndex: 1 }}>
                {(() => {
                  const maxFlames = 35;
                  const flameCount = Math.min(maxFlames, Math.max(0, stats.streak));
                  const flames = [];
                  function seededRandom(seed: number) {
                    let x = Math.sin(seed) * 10000;
                    return x - Math.floor(x);
                  }
                  let placed = 0;
                  let attempts = 0;
                  const minAngle = -225 * Math.PI / 180;
                  const maxAngle = 45 * Math.PI / 180;
                  while (placed < flameCount && attempts < flameCount * 3) {
                    const rand = seededRandom(stats.streak * 100 + placed * 31 + attempts * 17);
                    // angle from -125deg to +125deg
                    const angle = minAngle + rand * (maxAngle - minAngle);
                    if (angle >= minAngle && angle <= maxAngle) {
                      const radius = 48;
                      const x = 40 + radius * Math.cos(angle);
                      const y = 40 + radius * Math.sin(angle);
                      const size = 20 + Math.min(stats.streak, maxFlames) * 1.2;
                      // Lower flames: less bright and more transparent
                      const vertical = Math.sin(angle); // -1 (top) to +1 (bottom)
                      const glow = 0.5 + 0.5 * (stats.streak / maxFlames) * (1 - 0.5 * (vertical > 0.3 ? vertical : 0));
                      const opacity = vertical > 0.3 ? 0.5 : 1; // dimmer if lower
                      flames.push(
                        <span
                          key={placed}
                          style={{
                            position: 'absolute',
                            left: `${x - size / 2}px`,
                            top: `${y - size / 2}px`,
                            width: `${size}px`,
                            height: `${size}px`,
                            filter: `drop-shadow(0 0 ${6 + size / 2}px rgba(255,140,0,${glow}))`,
                            opacity,
                            pointerEvents: 'none',
                            zIndex: 1,
                            animation: `flame-flicker 1.2s infinite ${placed * 0.15}s`,
                          }}
                        >
                          <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
                            <path d="M16 30c6-4 8-8 8-12 0-6-4-10-8-14-4 4-8 8-8 14 0 4 2 8 8 12z" fill="url(#fireGradient)" />
                            <defs>
                              <radialGradient id="fireGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                                <stop offset="0%" stopColor="#fffbe6" />
                                <stop offset="60%" stopColor="#ffb300" />
                                <stop offset="100%" stopColor="#ff5722" />
                              </radialGradient>
                            </defs>
                          </svg>
                        </span>
                      );
                      placed++;
                    }
                    attempts++;
                  }
                  return flames;
                })()}
              </div>
              {/* Streak circle and text above flames */}
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full flex items-center justify-center border border-orange-500/30 relative" style={{ zIndex: 2 }}>
                {/* Center overlay for readability */}
                <div style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '60%',
                  height: '60%',
                  borderRadius: '50%',
                  background: 'rgba(20,20,20,0.85)',
                  zIndex: 2,
                  pointerEvents: 'none',
                  boxShadow: '0 0 16px 8px rgba(0,0,0,0.25)'
                }} />
                <span className="text-2xl font-bold text-orange-400 z-10" style={{ position: 'relative', zIndex: 3, textShadow: '0 2px 8px #000, 0 0px 2px #000' }}> {stats.streak} </span>
                {/* Info icon and popup logic */}
                <span
                  className="absolute top-2 right-2 z-10"
                  tabIndex={-1}
                  aria-label="Streak info"
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" className="text-orange-300">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                    <text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor">i</text>
                  </svg>
                </span>
                {/* Info popup: visible on click/tap or hover (desktop) */}
                {/* Mobile: show if showStreakInfo; Desktop: show on hover or showStreakInfo */}
                <div
                  className={`absolute left-1/2 top-full mt-2 w-56 bg-black text-white text-xs rounded-lg px-3 py-2 shadow-lg z-50 -translate-x-1/2 transition-opacity
                    ${showStreakInfo ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
                    sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto`
                  }
                  style={{ whiteSpace: 'normal' }}
                  role="tooltip"
                >
                  Your streak continues only if you complete at least one goal (meditation or focus) each day.
                </div>
              </div>
            </div>
            <p className="text-white font-medium text-sm">Streak</p>
            <p className="text-orange-300 text-xs">Days active</p>
            {/* Streak warning if no activity today */}
            {(() => {
              // Check if user has done any activity today
              const todayStr = new Date().toISOString().split('T')[0];
              const hasGoalToday = stats.todayMeditation > 0 || stats.todayWork > 0;
              if (!hasGoalToday && stats.streak > 0) {
                return (
                  <div className="flex items-center justify-center gap-1 mt-2">
                    <span className="text-orange-500 text-lg animate-pulse" title="Streak at risk!">🔥</span>
                    <span className="text-xs font-semibold text-orange-500">Don't lose your streak!</span>
                  </div>
                );
              }
              return null;
            })()}
          </div>

          {/* Focus Progress Ring (pressable) */}
          <div
            className="text-center cursor-pointer transition-transform hover:scale-105"
            onClick={() => setCurrentView('timers')}
            title="Go to Focus"
          >
            <div className="relative w-20 h-20 mx-auto mb-3">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="rgba(59, 130, 246, 0.2)"
                  strokeWidth="4"
                  fill="none"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="#3b82f6"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 32}`}
                  strokeDashoffset={`${2 * Math.PI * 32 * (1 - Math.min(stats.todayWork / focusGoal, 1))}`}
                  className="transition-all duration-1000 ease-out"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-blue-400">{stats.todayWork}m</span>
              </div>
            </div>
            <p className="text-white font-medium text-sm">Focus</p>
            <p className="text-blue-300 text-xs">Goal: {focusGoal}m</p>
          </div>

          {/* Journal Progress Ring (pressable) */}
          <div
            className="text-center cursor-pointer transition-transform hover:scale-105"
            onClick={() => setCurrentView('journal')}
            title="Go to Journal"
          >
            <div className="relative w-20 h-20 mx-auto mb-3">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke={stats.journalToday ? "rgba(147, 51, 234, 0.2)" : "rgba(100, 116, 139, 0.2)"}
                  strokeWidth="4"
                  fill="none"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke={stats.journalToday ? "#9333ea" : "#64748b"}
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 32}`}
                  strokeDashoffset={stats.journalToday ? "0" : `${2 * Math.PI * 32}`}
                  className="transition-all duration-1000 ease-out"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-lg font-bold ${stats.journalToday ? 'text-purple-400' : 'text-gray-400'}`}>
                  {stats.journalToday ? '✓' : '—'}
                </span>
              </div>
            </div>
            <p className="text-white font-medium text-sm">Journal</p>
            <p className="text-purple-300 text-xs">Daily entry</p>
          </div>
        </div>
      </div>

      {/* Full Analytics Section */}
      <div className="px-6">
        <Analytics userId={userId} />
      </div>
    </div>
  );
}