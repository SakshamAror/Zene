import React, { useState, useEffect, useRef } from 'react';
import { Clock, Target, PenTool, TrendingUp, Calendar, Award, ChevronRight, Play, Sparkles, Zap, Heart, Star, Coffee, Sunrise, Moon } from 'lucide-react';
import { getMeditationSessions, getWorkSessions, getJournalLogs, getGoals, getUserPrefs } from '../lib/saveData';
import type { MeditationSession, WorkSession, JournalLog, Goal } from '../types';
import { LineChart, Line, XAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Emoji } from './Emoji';
import { isAppleDevice } from './Emoji';

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
  const [meditationGoal, setMeditationGoal] = useState(2);
  const [focusGoal, setFocusGoal] = useState(120);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [showStreakInfo, setShowStreakInfo] = useState(false);
  const streakRef = useRef<HTMLDivElement>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [meditations, setMeditations] = useState<MeditationSession[]>([]);
  const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);
  const [mainGoal, setMainGoal] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPrefs() {
      setPrefsLoading(true);
      try {
        const prefs = await getUserPrefs(userId);
        if (prefs) {
          setMeditationGoal(prefs.meditation_goal || 2);
          setFocusGoal(prefs.focus_goal || 120);
          setMainGoal(prefs.main_goal || null);
        } else {
          // Use defaults if no prefs found
          setMeditationGoal(2);
          setFocusGoal(120);
          setMainGoal(null);
        }
        // Load dashboard data with the preferences we just loaded
        loadDashboardData(prefs);
      } catch (error) {
        // Use defaults if error fetching prefs
        setMeditationGoal(2);
        setFocusGoal(120);
        setMainGoal(null);
        // Load dashboard data with fallback values
        loadDashboardData(null);
      } finally {
        setPrefsLoading(false);
      }
    }
    fetchPrefs();
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

  useEffect(() => {
    getMeditationSessions(userId).then(setMeditations);
    getWorkSessions(userId).then(setWorkSessions);
  }, [userId]);

  const loadDashboardData = async (userPrefs?: any) => {
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

      // Use passed preferences or current state
      const currentMeditationGoal = userPrefs?.meditation_goal || 2;
      const currentFocusGoal = userPrefs?.focus_goal || 120;

      const newStreak = calculateStreak(meditations, workSessions, journals, currentMeditationGoal, currentFocusGoal);

      const todayStr = new Date().toISOString().split('T')[0];
      const todayMeditationRaw = meditations.filter(m => m.timestamp && m.timestamp.split('T')[0] === todayStr).reduce((sum, session) => sum + session.length, 0) / 60;
      const todayWorkRaw = workSessions.filter(w => w.timestamp && w.timestamp.split('T')[0] === todayStr).reduce((sum, session) => sum + session.length, 0) / 60;
      setStats({
        totalMeditation: Math.round(totalMeditation / 60),
        totalWork: Math.round(totalWork / 60),
        journalEntries: journals.length,
        completedGoals,
        streak: newStreak,
        todayMeditation: todayMeditationRaw,
        todayWork: todayWorkRaw,
        journalToday: journals.some(j => j.timestamp && j.timestamp.split('T')[0] === todayStr),
      });
    } catch (error) {
      // console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Updated streak logic: streak resets only if more than 2 missed days in a rolling 7-day window
  const calculateStreak = (
    meditations: MeditationSession[],
    workSessions: WorkSession[],
    journals: JournalLog[],
    meditationGoal: number,
    focusGoal: number
  ) => {
    const today = new Date();
    let streak = 0;
    let missedDaysInWeek = 0;
    let consecutiveDays = 0;
    let lastMissedDay = null;
    // Go back up to 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const meditationSeconds = meditations
        .filter(m => m.timestamp && m.timestamp.split('T')[0] === dateStr)
        .reduce((sum, m) => sum + m.length, 0);
      const workSeconds = workSessions
        .filter(w => w.timestamp && w.timestamp.split('T')[0] === dateStr)
        .reduce((sum, w) => sum + w.length, 0);
      const reachedMeditationGoal = meditationSeconds >= (meditationGoal * 60);
      const reachedFocusGoal = workSeconds >= (focusGoal * 60);
      const hasGoal = reachedMeditationGoal || reachedFocusGoal;
      if (hasGoal) {
        streak++;
        consecutiveDays++;
      } else {
        missedDaysInWeek++;
        // If more than 2 missed days in the last 7 days, reset streak
        if (missedDaysInWeek > 2 && i < 7) {
          break;
        }
        // If more than 2 missed days in any rolling 7-day window, reset streak
        if (i >= 6) {
          // Count missed days in the last 7 days
          let missedInWindow = 0;
          for (let j = i - 6; j <= i; j++) {
            const windowDate = new Date(today);
            windowDate.setDate(windowDate.getDate() - j);
            const windowDateStr = windowDate.toISOString().split('T')[0];
            const meditationSecondsW = meditations
              .filter(m => m.timestamp && m.timestamp.split('T')[0] === windowDateStr)
              .reduce((sum, m) => sum + m.length, 0);
            const workSecondsW = workSessions
              .filter(w => w.timestamp && w.timestamp.split('T')[0] === windowDateStr)
              .reduce((sum, w) => sum + w.length, 0);
            const reachedMeditationGoalW = meditationSecondsW >= (meditationGoal * 60);
            const reachedFocusGoalW = workSecondsW >= (focusGoal * 60);
            if (!(reachedMeditationGoalW || reachedFocusGoalW)) {
              missedInWindow++;
            }
          }
          if (missedInWindow > 2) {
            break;
          }
        }
        // Don't increment streak for missed days, but don't break unless above
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

  // Helper to get last 7 days of meditation/focus data
  const getLast7DaysData = () => {
    const days = 7;
    const dailyData = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayMeditations = meditations.filter(m => m.timestamp && m.timestamp.split('T')[0] === dateStr);
      const dayWork = workSessions.filter(w => w.timestamp && w.timestamp.split('T')[0] === dateStr);
      dailyData.push({
        date: dateStr,
        meditation: dayMeditations.reduce((sum, m) => sum + m.length, 0) / 60,
        work: dayWork.reduce((sum, w) => sum + w.length, 0) / 60,
      });
    }
    return dailyData;
  };

  // QUOTE LOGIC
  const quotes = {
    focus: [
      "Focus is the gateway to all thinking.",
      "Concentrate all your thoughts upon the work at hand.",
      "The successful warrior is the average man, with laser-like focus. — Bruce Lee",
      "Where focus goes, energy flows. — Tony Robbins",
      "You can’t depend on your eyes when your imagination is out of focus. — Mark Twain",
      "The difference between successful people and very successful people is that very successful people say 'no' to almost everything. — Warren Buffett",
      "It is those who concentrate on but one thing at a time who advance in this world. — Og Mandino",
      "Success in anything will always come down to this: focus and effort. — Dwayne Johnson",
      "The sun’s rays do not burn until brought to a focus. — Alexander Graham Bell",
      "Lack of direction, not lack of time, is the problem. We all have twenty-four hour days. — Zig Ziglar",
      "My success, part of it certainly, is that I have focused in on a few things. — Bill Gates",
      "The key to success is to focus our conscious mind on things we desire not things we fear. — Brian Tracy",
      "You get what you focus on, so focus on what you want. — Anonymous",
      "Starve your distractions, feed your focus. — Anonymous",
      "Focus on being productive instead of busy. — Tim Ferriss",
      "The successful man is the one who finds out what is the matter with his business before his competitors do. — Roy L. Smith",
      "Don’t watch the clock; do what it does. Keep going. — Sam Levenson",
      "The main thing is to keep the main thing the main thing. — Stephen Covey",
      "Focus means eliminating distractions, not just from other people, but the things we do to distract ourselves. — Anonymous",
      "You will never reach your destination if you stop and throw stones at every dog that barks. — Winston Churchill"
    ],
    mindfulness: [
      "Mindfulness is the aware, balanced acceptance of the present experience.",
      "The present moment is filled with joy and happiness. — Thich Nhat Hanh",
      "Feelings come and go like clouds in a windy sky. Conscious breathing is my anchor. — Thich Nhat Hanh",
      "Mindfulness isn’t difficult, we just need to remember to do it. — Sharon Salzberg",
      "The best way to capture moments is to pay attention. This is how we cultivate mindfulness. — Jon Kabat-Zinn",
      "Mindfulness is a way of befriending ourselves and our experience. — Jon Kabat-Zinn",
      "Do every act of your life as though it were the very last act of your life. — Marcus Aurelius",
      "The mind is everything. What you think you become. — Buddha",
      "Mindfulness is simply being aware of what is happening right now without wishing it were different. — James Baraz",
      "Walk as if you are kissing the Earth with your feet. — Thich Nhat Hanh",
      "Drink your tea slowly and reverently, as if it is the axis on which the world earth revolves. — Thich Nhat Hanh",
      "Each morning we are born again. What we do today is what matters most. — Buddha",
      "Suffering usually relates to wanting things to be different than they are. — Allan Lokos",
      "Mindfulness is the key to a happy and peaceful life. — Dalai Lama",
      "The only way to live is by accepting each minute as an unrepeatable miracle. — Tara Brach",
      "Be happy in the moment, that’s enough. Each moment is all we need, not more. — Mother Teresa",
      "Mindfulness is the miracle by which we master and restore ourselves. — Thich Nhat Hanh",
      "Let go of your attachment to being right, and suddenly your mind is more open. — Ralph Marston",
      "The present moment is the only time over which we have dominion. — Thich Nhat Hanh",
      "Mindfulness is the path to the deathless. — Buddha"
    ],
    learn: [
      "Learning never exhausts the mind. — Leonardo da Vinci",
      "Live as if you were to die tomorrow. Learn as if you were to live forever. — Mahatma Gandhi",
      "The beautiful thing about learning is nobody can take it away from you. — B.B. King",
      "Curiosity is the wick in the candle of learning. — William Arthur Ward",
      "Education is the most powerful weapon which you can use to change the world. — Nelson Mandela",
      "Tell me and I forget, teach me and I may remember, involve me and I learn. — Benjamin Franklin",
      "The more that you read, the more things you will know. The more that you learn, the more places you’ll go. — Dr. Seuss",
      "Wisdom is not a product of schooling but of the lifelong attempt to acquire it. — Albert Einstein",
      "Change is the end result of all true learning. — Leo Buscaglia",
      "Learning is a treasure that will follow its owner everywhere. — Chinese Proverb",
      "Anyone who stops learning is old, whether at twenty or eighty. — Henry Ford",
      "The expert in anything was once a beginner. — Helen Hayes",
      "Learning is not attained by chance, it must be sought for with ardor and attended to with diligence. — Abigail Adams",
      "A wise man can learn more from a foolish question than a fool can learn from a wise answer. — Bruce Lee",
      "Develop a passion for learning. If you do, you will never cease to grow. — Anthony J. D’Angelo",
      "Learning is a journey, not a destination. — Anonymous",
      "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice. — Brian Herbert",
      "Learning without thought is labor lost; thought without learning is perilous. — Confucius",
      "The roots of education are bitter, but the fruit is sweet. — Aristotle",
      "The mind is not a vessel to be filled, but a fire to be kindled. — Plutarch"
    ],
    relax: [
      "Sometimes the most productive thing you can do is relax. — Mark Black",
      "Relaxation means releasing all concern and tension. — Don Miguel Ruiz",
      "Your mind will answer most questions if you learn to relax and wait for the answer. — William S. Burroughs",
      "Take rest; a field that has rested gives a bountiful crop. — Ovid",
      "It’s a good idea always to do something relaxing prior to making an important decision in your life. — Paulo Coelho",
      "There is more to life than increasing its speed. — Mahatma Gandhi",
      "Sometimes the most important thing in a whole day is the rest we take between two deep breaths. — Etty Hillesum",
      "Rest and be thankful. — William Wordsworth",
      "Almost everything will work again if you unplug it for a few minutes, including you. — Anne Lamott",
      "Tension is who you think you should be. Relaxation is who you are. — Chinese Proverb",
      "Slow down and everything you are chasing will come around and catch you. — John De Paola",
      "The time to relax is when you don’t have time for it. — Sydney J. Harris",
      "A little nonsense now and then, is cherished by the wisest men. — Roald Dahl",
      "Sometimes letting things go is an act of far greater power than defending or hanging on. — Eckhart Tolle",
      "There is virtue in work and there is virtue in rest. Use both and overlook neither. — Alan Cohen",
      "Rest is not idleness, and to lie sometimes on the grass under trees on a summer’s day, listening to the murmur of water, or watching the clouds float across the sky, is by no means a waste of time. — John Lubbock",
      "To relax is to renew. — Lailah Gifty Akita",
      "The ability to relax and be mindfully present in the moment comes naturally when we are grateful. — Louise Hay",
      "Sometimes you just need to take a nap and get over it. — Anonymous",
      "A calm mind brings inner strength and self-confidence. — Dalai Lama"
    ]
  };
  const goalKeyMap: Record<string, keyof typeof quotes> = {
    focus: 'focus',
    mindfulness: 'mindfulness',
    learn: 'learn',
    relax: 'relax',
    focus_better: 'focus',
    be_mindful: 'mindfulness',
    learn_grow: 'learn',
    relax_more: 'relax',
  };
  function getDailyQuote(mainGoal: string | null) {
    // Use today's local date as a seed (YYYY-MM-DD)
    const today = new Date();
    const localDateStr = today.getFullYear() + '-' +
      String(today.getMonth() + 1).padStart(2, '0') + '-' +
      String(today.getDate()).padStart(2, '0');
    const seed = localDateStr + (mainGoal || '');
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }
    // 0-1 float
    const rand = Math.abs(hash) / 2147483647;
    // Pick main goal 50% of the time
    const mappedKey = mainGoal && goalKeyMap[mainGoal] ? goalKeyMap[mainGoal] : null;
    let useMain = rand < 0.5 && mappedKey;
    let mainList = mappedKey ? quotes[mappedKey] : null;
    let otherKeys = Object.keys(quotes).filter(k => k !== mappedKey);
    let list: string[];
    if (useMain && mainList) {
      list = mainList;
    } else {
      // Pick from other lists
      const otherIdx = Math.floor(rand * otherKeys.length) % otherKeys.length;
      list = quotes[otherKeys[otherIdx] as keyof typeof quotes];
    }
    // Pick quote index
    const quoteIdx = Math.floor(rand * list.length) % list.length;
    return list[quoteIdx];
  }
  const dailyQuote = getDailyQuote(mainGoal);

  // After todayStr is defined in the component (before return)
  const todayStr = new Date().toISOString().split('T')[0];
  const todayMeditationSeconds = Math.floor(meditations.filter(m => m.timestamp && m.timestamp.split('T')[0] === todayStr).reduce((sum, session) => sum + session.length, 0));
  const todayWorkSeconds = Math.floor(workSessions.filter(w => w.timestamp && w.timestamp.split('T')[0] === todayStr).reduce((sum, session) => sum + session.length, 0));
  const todayMeditationSecondsRounded = todayMeditationSeconds - (todayMeditationSeconds % 10);
  const todayWorkSecondsRounded = todayWorkSeconds - (todayWorkSeconds % 10);

  // Define hasGoalToday before return so it can be used in JSX
  const reachedMeditationGoalToday = stats.todayMeditation >= meditationGoal;
  const reachedFocusGoalToday = stats.todayWork >= focusGoal;
  const hasGoalToday = reachedMeditationGoalToday || reachedFocusGoalToday;

  if (loading || prefsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 loading-spinner mx-auto mb-4"></div>
          <p className="text-white/80 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 md:px-12 lg:px-24 py-10">
      {/* Welcome Section */}
      <div className="text-center mb-12 w-full max-w-2xl">
        <div className="w-16 h-16 mb-6 flex items-center justify-center mx-auto animate-float">
          <Emoji emoji="👋" png="wave-hand.png" alt="wave" size="2xl" style={!isAppleDevice() ? { transform: 'rotate(-40deg)' } : {}} />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3" style={{ letterSpacing: '-0.03em' }}>
          {userName ? `Welcome back, ${userName}!` : 'Welcome back!'}
        </h1>
        <p className="text-white/80 text-base italic">
          {dailyQuote}
        </p>
      </div>

      {/* Responsive Main Content Grid */}
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Left: Streak & Chart */}
        <div className="flex flex-col items-center space-y-8">
          {/* Streak Display */}
          <div className="text-center w-full">
            <div
              className="relative w-24 h-24 mx-auto mb-4 cursor-pointer"
              ref={streakRef}
              onClick={() => setShowStreakInfo(!showStreakInfo)}
            >
              {/* Streak At Risk background text */}
              {(!hasGoalToday && stats.streak >= 1) && (
                <div
                  className="animate-pulse absolute inset-0 flex items-center justify-center pointer-events-none select-none"
                  style={{
                    zIndex: 0,
                    fontSize: '3rem',
                    fontWeight: 900,
                    color: 'rgba(255, 115, 0, 0.4)',
                    letterSpacing: '-0.04em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                >
                  STREAK AT RISK
                </div>
              )}
              {/* Flame effects */}
              <div className="absolute inset-0" style={{ zIndex: 1 }}>
                {(() => {
                  const maxFlames = 32; // Increased from 20 to 32 for more flames
                  const minSize = 20;
                  const maxSize = 62;
                  const minGlow = 0.5;
                  const maxGlow = 1.0;
                  const k = 12;
                  const progress = 1 - Math.exp(-Math.max(0, stats.streak) / k);
                  const flameCount = Math.round(maxFlames * progress);
                  const minAngle = -225 * Math.PI / 180;
                  const maxAngle = 45 * Math.PI / 180;
                  // Center and radius for flame placement
                  const centerX = 48; // match the actual center of the 96x96 div
                  const centerY = 48;
                  const baseRadius = 38; // slightly less than before to keep flames closer
                  const flames = [];
                  if (flameCount > 0) {
                    // Precompute all base angles for uniform distribution
                    const baseAngles = [];
                    for (let i = 0; i < flameCount; i++) {
                      baseAngles.push(minAngle + (i / (flameCount - 1 || 1)) * (maxAngle - minAngle));
                    }
                    // Shuffle the baseAngles array for random order
                    for (let i = baseAngles.length - 1; i > 0; i--) {
                      const j = Math.floor(Math.random() * (i + 1));
                      [baseAngles[i], baseAngles[j]] = [baseAngles[j], baseAngles[i]];
                    }
                    for (let i = 0; i < flameCount; i++) {
                      const baseAngle = baseAngles[i];
                      const angleJitter = (Math.random() - 0.5) * (Math.PI / 32); // up to ~5.6 degrees of jitter
                      const angle = baseAngle + angleJitter;
                      const size = minSize + (maxSize - minSize) * progress;
                      const radiusJitter = (Math.random() - 0.5) * 4; // up to +/-2px radius jitter
                      const radius = baseRadius + radiusJitter;
                      const x = centerX + radius * Math.cos(angle) - size / 2;
                      const y = centerY + radius * Math.sin(angle) - size / 2;
                      const vertical = Math.sin(angle);
                      const glow = minGlow + (maxGlow - minGlow) * progress * (1 - 0.5 * (vertical > 0.3 ? vertical : 0));
                      const opacity = 1;
                      flames.push(
                        <span
                          key={i}
                          style={{
                            position: 'absolute',
                            left: `${x}px`,
                            top: `${y}px`,
                            width: `${size}px`,
                            height: `${size}px`,
                            filter: `drop-shadow(0 0 ${6 + size / 2}px rgba(255,140,0,${glow}))`,
                            opacity,
                            pointerEvents: 'none',
                            zIndex: 1,
                            animation: `flame-flicker 1.2s infinite ${i * 0.15}s`,
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
                    }
                  }
                  return flames;
                })()}
              </div>
              <div
                className="w-24 h-24 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full flex items-center justify-center border border-orange-500/30 relative"
                style={{
                  zIndex: 2,
                  boxShadow: (!hasGoalToday && stats.streak >= 1) ? '0 0 40px 12px rgba(0,0,0,0.45)' : undefined
                }}
              >
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
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)'
                }} />
                <span className="text-2xl font-bold text-orange-400 z-10" style={{ position: 'relative', zIndex: 3, textShadow: '0 2px 8px #000, 0 0px 2px #000' }}>
                  {stats.streak}
                </span>
                {/* Info icon in top-right corner */}
                <span
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 8,
                    zIndex: 4,
                    background: 'rgba(0,0,0,0.6)',
                    borderRadius: '50%',
                    width: 18,
                    height: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    color: '#fff',
                    pointerEvents: 'none',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.18)'
                  }}
                  aria-label="Info"
                >
                  i
                </span>
                {showStreakInfo && (
                  <div
                    className="absolute left-1/2 top-full mt-2 w-56 bg-black text-white text-xs rounded-lg px-3 py-2 shadow-lg z-50 -translate-x-1/2"
                    style={{ whiteSpace: 'normal' }}
                  >
                    Your streak continues if you meet at least one goal (focus or meditation) each day. You have a few grace days if you miss.
                  </div>
                )}
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Streak</h3>
            <p className="text-white/70 text-sm">Days active</p>
          </div>

          {/* Mini 7-day Chart */}
          <div className="w-full cursor-pointer" onClick={() => setCurrentView('analytics')}>
            <div className="bg-emerald-900/60 rounded-2xl p-3 border border-emerald-700">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs text-emerald-300 font-semibold">7 Day Activity</span>
                <span className="text-xs text-white/40">Tap to expand</span>
              </div>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={getLast7DaysData()} margin={{ top: 5, right: 8, left: 8, bottom: 0 }}>
                  <XAxis dataKey="date" tickFormatter={d => new Date(d).getDate().toString()} stroke="rgba(255,255,255,0.4)" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'rgba(20,30,30,0.95)', borderRadius: 12, border: 'none', color: '#fff', fontSize: 12 }} />
                  <Line type="monotone" dataKey="meditation" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} name="Meditation" />
                  <Line type="monotone" dataKey="work" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 5 }} name="Focus" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right: Progress & Journal */}
        <div className="flex flex-col items-center space-y-8">
          {/* Meditation Progress */}
          <div
            className="text-center cursor-pointer transition-transform hover:scale-105 w-full"
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
                  strokeDashoffset={`${2 * Math.PI * 32 * (1 - Math.min(todayMeditationSecondsRounded / (meditationGoal * 60), 1))}`}
                  className="transition-all duration-1000 ease-out"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-white">{Math.floor(stats.todayMeditation)}m</span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Meditation</h3>
            <p className="text-white/70 text-sm">Goal: {meditationGoal}m</p>
          </div>

          {/* Focus Progress */}
          <div
            className="text-center cursor-pointer transition-transform hover:scale-105 w-full"
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
                  strokeDashoffset={`${2 * Math.PI * 32 * (1 - Math.min(todayWorkSecondsRounded / (focusGoal * 60), 1))}`}
                  className="transition-all duration-1000 ease-out"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-white">{Math.floor(stats.todayWork)}m</span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Focus</h3>
            <p className="text-white/70 text-sm">Goal: {focusGoal}m</p>
          </div>

          {/* Journal Status */}
          <div
            className="text-center cursor-pointer transition-transform hover:scale-105 w-full"
            onClick={() => setCurrentView('journal')}
          >
            <div className="w-24 h-24 mx-auto mb-4 bg-purple-800/40 rounded-full flex items-center justify-center border border-purple-500/50">
              {stats.journalToday ? (
                <Emoji emoji="✓" png="check.png" alt="check" size="3xl" className="text-purple-400" />
              ) : (
                <Emoji emoji="📝" png="notebook.png" alt="journal" size="2xl" />
              )}
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Journal</h3>
            <p className="text-white/70 text-sm">
              {stats.journalToday ? 'Complete' : 'Write today'}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="w-full max-w-2xl space-y-4">
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
      <div className="mt-12 text-center w-full max-w-2xl">
        <p className="text-white/60 text-sm">
          Great minds don't wander, they conquer.
        </p>
      </div>
    </div>
  );
}