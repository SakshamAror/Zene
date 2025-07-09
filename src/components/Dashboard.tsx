import React, { useState, useEffect, useRef } from 'react';
import { Clock, Target, PenTool, TrendingUp, Calendar, Award, ChevronRight, Play, Sparkles, Zap, Heart, Star, Coffee, Sunrise, Moon } from 'lucide-react';
import { getMeditationSessions, getWorkSessions, getJournalLogs, getGoals, getUserPrefs } from '../lib/saveData';
import type { MeditationSession, WorkSession, JournalLog, Goal } from '../types';

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
  const [loading, setLoading] = useState(true);
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

  if (loading || prefsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-900 to-emerald-700 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 loading-spinner mx-auto mb-4"></div>
          <p className="text-white/80 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-900 to-emerald-700 flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-xs">
          <div className="text-6xl mb-6">📡</div>
          <h2 className="text-2xl font-bold text-white mb-4">You're offline</h2>
          <p className="text-white/80 text-center">Reconnect to the internet to see your latest stats, streak, and progress.</p>
        </div>
      </div>
    );
  }

  const userName = getUserName();

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 to-emerald-700 flex flex-col items-center justify-center px-6 py-10">
      {/* Welcome Section */}
      <div className="text-center mb-12">
        <div className="text-6xl mb-6 animate-float">👋</div>
        <h1 className="text-3xl font-bold text-white mb-3" style={{ letterSpacing: '-0.03em' }}>
          {userName ? `Welcome back, ${userName}!` : 'Welcome back!'}
        </h1>
        <p className="text-white/80 text-lg max-w-sm mx-auto">
          Ready to continue your mindful journey?
        </p>
      </div>

      {/* Today's Progress */}
      <div className="w-full max-w-sm space-y-6 mb-12">
        {/* Meditation Progress */}
        <div 
          className="text-center cursor-pointer transition-transform hover:scale-105"
          onClick={() => setCurrentView('timers')}
        >
          <div className="relative w-24 h-24 mx-auto mb-4">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="32"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="4"
                fill="none"
              />
              <circle
                cx="40"
                cy="40"
                r="32"
                stroke="#a7f3d0"
                strokeWidth="4"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 32}`}
                strokeDashoffset={`${2 * Math.PI * 32 * (1 - Math.min(stats.todayMeditation / meditationGoal, 1))}`}
                className="transition-all duration-1000 ease-out"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-white">{stats.todayMeditation}m</span>
            </div>
          </div>
          <h3 className="text-xl font-bold text-white mb-1">Meditation</h3>
          <p className="text-white/70 text-sm">Goal: {meditationGoal}m</p>
        </div>

        {/* Focus Progress */}
        <div 
          className="text-center cursor-pointer transition-transform hover:scale-105"
          onClick={() => setCurrentView('timers')}
        >
          <div className="relative w-24 h-24 mx-auto mb-4">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="32"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="4"
                fill="none"
              />
              <circle
                cx="40"
                cy="40"
                r="32"
                stroke="#60a5fa"
                strokeWidth="4"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 32}`}
                strokeDashoffset={`${2 * Math.PI * 32 * (1 - Math.min(stats.todayWork / focusGoal, 1))}`}
                className="transition-all duration-1000 ease-out"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-white">{stats.todayWork}m</span>
            </div>
          </div>
          <h3 className="text-xl font-bold text-white mb-1">Focus</h3>
          <p className="text-white/70 text-sm">Goal: {focusGoal}m</p>
        </div>

        {/* Streak Display */}
        <div className="text-center">
          <div
            className="relative w-24 h-24 mx-auto mb-4 cursor-pointer"
            ref={streakRef}
            onClick={() => setShowStreakInfo(!showStreakInfo)}
          >
            {/* Flame effects */}
            <div className="absolute inset-0" style={{ zIndex: 1 }}>
              {(() => {
                const maxFlames = 35;
                const minSize = 20;
                const maxSize = 62;
                const minGlow = 0.5;
                const maxGlow = 1.0;
                const k = 12;
                const progress = 1 - Math.exp(-Math.max(0, stats.streak) / k);
                const flameCount = Math.round(maxFlames * progress);
                const flames = [];
                let placed = 0;
                let attempts = 0;
                const minAngle = -225 * Math.PI / 180;
                const maxAngle = 45 * Math.PI / 180;
                while (placed < flameCount && attempts < flameCount * 3) {
                  const rand = Math.random();
                  const angle = minAngle + rand * (maxAngle - minAngle);
                  if (angle >= minAngle && angle <= maxAngle) {
                    const radius = 48;
                    const x = 40 + radius * Math.cos(angle);
                    const y = 40 + radius * Math.sin(angle);
                    const size = minSize + (maxSize - minSize) * progress;
                    const vertical = Math.sin(angle);
                    const glow = minGlow + (maxGlow - minGlow) * progress * (1 - 0.5 * (vertical > 0.3 ? vertical : 0));
                    const opacity = vertical > 0.3 ? 0.5 : 1;
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
            <div className="w-24 h-24 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full flex items-center justify-center border border-orange-500/30 relative" style={{ zIndex: 2 }}>
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
              <span className="text-2xl font-bold text-orange-400 z-10" style={{ position: 'relative', zIndex: 3, textShadow: '0 2px 8px #000, 0 0px 2px #000' }}>
                {stats.streak}
              </span>
              {showStreakInfo && (
                <div
                  className="absolute left-1/2 top-full mt-2 w-56 bg-black text-white text-xs rounded-lg px-3 py-2 shadow-lg z-50 -translate-x-1/2"
                  style={{ whiteSpace: 'normal' }}
                >
                  Your streak continues only if you complete at least one goal (meditation or focus) each day.
                </div>
              )}
            </div>
          </div>
          <h3 className="text-xl font-bold text-white mb-1">Streak</h3>
          <p className="text-white/70 text-sm">Days active</p>
          {(() => {
            const todayStr = new Date().toISOString().split('T')[0];
            const hasGoalToday = stats.todayMeditation > 0 || stats.todayWork > 0;
            if (!hasGoalToday && stats.streak > 0) {
              return (
                <p className="text-orange-400 text-sm font-semibold animate-pulse mt-2">
                  Streak at risk!
                </p>
              );
            }
            return null;
          })()}
        </div>

        {/* Journal Status */}
        <div 
          className="text-center cursor-pointer transition-transform hover:scale-105"
          onClick={() => setCurrentView('journal')}
        >
          <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-full flex items-center justify-center border border-purple-500/30">
            <span className={`text-3xl ${stats.journalToday ? 'text-purple-400' : 'text-white/40'}`}>
              {stats.journalToday ? '✓' : '📝'}
            </span>
          </div>
          <h3 className="text-xl font-bold text-white mb-1">Journal</h3>
          <p className="text-white/70 text-sm">
            {stats.journalToday ? 'Complete' : 'Write today'}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={() => setCurrentView('timers')}
          className="w-full py-4 px-6 bg-emerald-400 text-emerald-900 font-bold text-lg rounded-2xl shadow-lg active:bg-emerald-300 transition flex items-center justify-center space-x-2"
        >
          <Play size={20} />
          <span>Start Session</span>
        </button>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setCurrentView('goals')}
            className="py-3 px-4 bg-emerald-900/60 text-emerald-200 font-semibold rounded-xl border border-emerald-700 active:bg-emerald-800 transition flex flex-col items-center space-y-1"
          >
            <Target size={20} />
            <span className="text-sm">Goals</span>
          </button>
          <button
            onClick={() => setCurrentView('learn')}
            className="py-3 px-4 bg-emerald-900/60 text-emerald-200 font-semibold rounded-xl border border-emerald-700 active:bg-emerald-800 transition flex flex-col items-center space-y-1"
          >
            <Star size={20} />
            <span className="text-sm">Learn</span>
          </button>
        </div>
      </div>

      {/* Motivational Footer */}
      <div className="mt-12 text-center">
        <p className="text-white/60 text-sm">
          Great minds don't wander, they conquer.
        </p>
      </div>
    </div>
  );
}