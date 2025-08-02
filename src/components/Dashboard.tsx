import React, { useState, useEffect, useRef } from 'react';
import { Clock, Target, PenTool, TrendingUp, Calendar, Award, ChevronRight, Play, Sparkles, Zap, Heart, Star, Coffee, Sunrise, Moon } from 'lucide-react';
import { getMeditationSessions, getWorkSessions, getJournalLogs, getGoals, getUserPrefs, upsertUserPrefs } from '../lib/saveData';
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
  const [userStreak, setUserStreak] = useState<{ current_streak: number; longest_streak: number } | null>(null);

  // Simple streak calculation function
  const calculateStreak = (meditations: MeditationSession[], workSessions: WorkSession[], meditationGoal: number, focusGoal: number) => {
    const today = new Date();
    let streak = 0;
    let consecutiveMissedDays = 0;

    // Go back up to 1825 days (5 years)
    for (let i = 0; i < 1825; i++) {
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
        consecutiveMissedDays = 0;
      } else {
        consecutiveMissedDays++;

        // Break streak if we have 2 or more consecutive missed days
        if (consecutiveMissedDays >= 2) {
          break;
        }
      }
    }

    return streak;
  };

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

      const todayStr = new Date().toISOString().split('T')[0];
      const todayMeditationRaw = meditations.filter(m => m.timestamp && m.timestamp.split('T')[0] === todayStr).reduce((sum, session) => sum + session.length, 0) / 60;
      const todayWorkRaw = workSessions.filter(w => w.timestamp && w.timestamp.split('T')[0] === todayStr).reduce((sum, session) => sum + session.length, 0) / 60;

      // Calculate streak using simple function
      const currentStreak = calculateStreak(meditations, workSessions, currentMeditationGoal, currentFocusGoal);

      setStats({
        totalMeditation: Math.round(totalMeditation / 60),
        totalWork: Math.round(totalWork / 60),
        journalEntries: journals.length,
        completedGoals,
        streak: currentStreak,
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
    <div className="min-h-screen flex flex-col items-center px-4 md:px-12 lg:px-24 py-10">
      {/* Welcome Section */}
      <div className="text-center mb-8 w-full max-w-2xl pt-8">
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

      {/* Main Tasks - Duolingo Style */}
      <div className="w-full max-w-sm mx-auto space-y-6 mb-8 flex-1 flex flex-col justify-center">
        {/* Meditation Task */}
        <div
          className="duolingo-task-card cursor-pointer"
          onClick={() => setCurrentView('timers')}
        >
          <div className="relative">
            {/* Progress Ring */}
            <div className="relative w-20 h-20 mx-auto mb-4">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="#10b981"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 32}`}
                  strokeDashoffset={`${2 * Math.PI * 32 * (1 - Math.min(todayMeditationSecondsRounded / (meditationGoal * 60), 1))}`}
                  className="transition-all duration-1000 ease-out"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                  <Emoji emoji="🧘" png="mindfulness.png" alt="meditation" size="md" />
                </div>
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-1 text-center">Meditation</h3>
            <p className="text-white/70 text-sm text-center">
              {Math.floor(stats.todayMeditation)}m / {meditationGoal}m today
            </p>
          </div>
        </div>

        {/* Focus Task */}
        <div
          className="duolingo-task-card cursor-pointer"
          onClick={() => setCurrentView('timers')}
        >
          <div className="relative">
            {/* Progress Ring */}
            <div className="relative w-20 h-20 mx-auto mb-4">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="#3b82f6"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 32}`}
                  strokeDashoffset={`${2 * Math.PI * 32 * (1 - Math.min(todayWorkSecondsRounded / (focusGoal * 60), 1))}`}
                  className="transition-all duration-1000 ease-out"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                  <Emoji emoji="🎯" png="goal.png" alt="focus" size="md" />
                </div>
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-1 text-center">Focus</h3>
            <p className="text-white/70 text-sm text-center">
              {Math.floor(stats.todayWork)}m / {focusGoal}m today
            </p>
          </div>
        </div>

        {/* Journal Task */}
        <div
          className="duolingo-task-card cursor-pointer"
          onClick={() => setCurrentView('journal')}
        >
          <div className="relative">
            {/* Status Ring */}
            <div className="relative w-20 h-20 mx-auto mb-4">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth="6"
                  fill="none"
                />
                {stats.journalToday && (
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    stroke="#8b5cf6"
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 32}`}
                    strokeDashoffset="0"
                    className="transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${
                  stats.journalToday ? 'bg-purple-500' : 'bg-gray-500'
                }`}>
                  <Emoji emoji="📝" png="notebook.png" alt="journal" size="md" />
                </div>
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-1 text-center">Journal</h3>
            <p className="text-white/70 text-sm text-center">
              {stats.journalToday ? 'Complete for today' : 'Write today'}
            </p>
          </div>
        </div>
      </div>

      {/* Streak & Analytics Section */}
      <div className="w-full max-w-sm mx-auto mb-8">
        <div className="flex items-center justify-between">
          {/* Streak Display */}
          <div className="text-center">
            <div
              className="relative w-16 h-16 mx-auto mb-2 cursor-pointer"
              ref={streakRef}
              onClick={() => setShowStreakInfo(!showStreakInfo)}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500/30 to-red-500/30 rounded-full flex items-center justify-center border-2 border-orange-400/50">
                <span className="text-lg font-bold text-orange-400">
                  {stats.streak}
                </span>
              </div>
              {showStreakInfo && (
                <div className="absolute left-1/2 top-full mt-2 w-48 bg-black/90 text-white text-xs rounded-lg px-3 py-2 shadow-lg z-50 -translate-x-1/2">
                  Your streak continues if you meet at least one goal each day.
                </div>
              )}
            </div>
            <p className="text-white/70 text-xs">Streak</p>
          </div>

          {/* Analytics Button */}
          <div className="text-center">
            <button
              onClick={() => setCurrentView('analytics')}
              className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center border-2 border-emerald-400/50 mb-2"
            >
              <BarChart3 size={20} className="text-emerald-400" />
            </button>
            <p className="text-white/70 text-xs">Stats</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="w-full max-w-sm mx-auto space-y-4 mb-8">
        <button
          onClick={() => setCurrentView('timers')}
          className="w-full py-4 px-6 bg-emerald-400 text-emerald-900 font-bold text-lg rounded-2xl shadow-lg active:bg-emerald-300 transition-all duration-200 flex items-center justify-center space-x-2"
        >
          <Play size={20} />
          <span>Start Session</span>
        </button>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setCurrentView('goals')}
            className="py-3 px-4 bg-emerald-900/40 text-emerald-200 font-semibold rounded-xl border border-emerald-700/50 active:bg-emerald-800/60 transition-all duration-200 flex flex-col items-center space-y-1"
          >
            <Target size={20} />
            <span className="text-sm">Goals</span>
          </button>
          <button
            onClick={() => setCurrentView('learn')}
            className="py-3 px-4 bg-emerald-900/40 text-emerald-200 font-semibold rounded-xl border border-emerald-700/50 active:bg-emerald-800/60 transition-all duration-200 flex flex-col items-center space-y-1"
          >
            <Star size={20} />
            <span className="text-sm">Learn</span>
          </button>
        </div>
      </div>

      {/* Motivational Footer */}
      <div className="text-center w-full max-w-sm mx-auto">
        <p className="text-white/60 text-sm">
          Great minds don't wander, they conquer.
        </p>
      </div>
    </div>
  );
}