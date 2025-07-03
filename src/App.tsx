import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  Target,
  Home,
  Timer,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Briefcase,
  Volume2,
  LogOut,
  User,
} from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import AuthForm from './components/AuthForm';
import GoalInputItem from './components/GoalInputItem';
import JournalEntry from './components/JournalEntry';
import {
  saveMeditationSession,
  saveWorkSession,
  saveJournalLog,
  saveGoal,
  updateGoal,
  getMeditationSessions,
  getWorkSessions,
  getJournalLogs,
  getGoals,
  getBookSummaries,
  getUserBookStatus,
  upsertUserBookStatus,
} from './lib/saveData';
import type {
  DisplayMeditationSession,
  DisplayGoal,
  DisplayJournalEntry,
  DisplayWorkSession,
  Goal as DatabaseGoal,
  BookSummary,
  UserBookStatus,
} from './types';

type Section = 'home' | 'meditation' | 'learn' | 'goals' | 'work' | 'progress' | 'account';

interface Milestone {
  date: string;
  duration: number;
  type: 'meditation' | 'work';
}

const wisdomQuotes = [
  'The present moment is the only time over which we have dominion.',
  'Wherever you are, be there totally.',
  'Peace comes from within. Do not seek it without.',
  'The mind is everything. What you think you become.',
  'In the midst of winter, I found there was, within me, an invincible summer.',
  'You have power over your mind - not outside events. Realize this, and you will find strength.',
  'Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.',
  'The only way to make sense out of change is to plunge into it, move with it, and join the dance.',
  'What we plant in the soil of contemplation, we shall reap in the harvest of action.',
  'The quieter you become, the more you are able to hear.',
];

const audioOptions = [
  {
    id: 'binaural',
    name: 'Binaural Beats',
    description: 'Focus enhancement',
  },
  { id: 'forest', name: 'Forest Sounds', description: 'Nature ambience' },
  { id: 'fireplace', name: 'Fireplace', description: 'Cozy warmth' },
  { id: 'rain', name: 'Rain', description: 'Gentle rainfall' },
  { id: 'cafe', name: 'Cafe Ambience', description: 'Coffee shop buzz' },
  { id: 'ocean', name: 'Ocean Waves', description: 'Calming waves' },
  { id: 'white-noise', name: 'White Noise', description: 'Pure focus' },
  { id: 'brown-noise', name: 'Brown Noise', description: 'Deep concentration' },
];

// Get daily wisdom quote that stays constant for the day
const getDailyWisdom = () => {
  const today = new Date().toDateString();
  const hash = today.split('').reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
  return wisdomQuotes[Math.abs(hash) % wisdomQuotes.length];
};

function App() {
  const { user, loading, signOut } = useAuth();
  const [currentSection, setCurrentSection] = useState<Section>('home');
  const [meditationTime, setMeditationTime] = useState(300); // 5 minutes default
  const [currentTime, setCurrentTime] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(0);
  const [sessions, setSessions] = useState<DisplayMeditationSession[]>([]);
  const [goals, setGoals] = useState<DisplayGoal[]>([]);
  const [databaseGoals, setDatabaseGoals] = useState<DatabaseGoal[]>([]);
  const [mindfulnessScore, setMindfulnessScore] = useState(72);
  const [breathingPhase, setBreathingPhase] = useState<
    'inhale' | 'hold' | 'exhale'
  >('inhale');
  const [breathingCycle, setBreathingCycle] = useState(0);
  const [goalIdCounter, setGoalIdCounter] = useState(1);
  const [journalEntries, setJournalEntries] = useState<DisplayJournalEntry[]>([]);
  const [isJournalExpanded, setIsJournalExpanded] = useState(false);
  const [todayJournalContent, setTodayJournalContent] = useState('');

  // Work timer states (now stopwatch)
  const [workCurrentTime, setWorkCurrentTime] = useState(0);
  const [isWorkActive, setIsWorkActive] = useState(false);
  const [workSessionStartTime, setWorkSessionStartTime] = useState(0);
  const [workSessions, setWorkSessions] = useState<DisplayWorkSession[]>([]);
  const [selectedAudio, setSelectedAudio] = useState('binaural');
  const [volume, setVolume] = useState(50);

  // Add local state for saving goals
  const [savingGoals, setSavingGoals] = useState<{ [id: string]: boolean }>({});

  const audioRef = useRef<HTMLAudioElement>(null);

  // Map audio option IDs to file names
  const audioFileMap: Record<string, string> = {
    'binaural': '/audio/binaural.mp3',
    'forest': '/audio/forest.mp3',
    'fireplace': '/audio/fireplace.mp3',
    'rain': '/audio/rain.mp3',
    'cafe': '/audio/cafe.mp3',
    'ocean': '/audio/ocean.mp3',
    'white-noise': '/audio/white-noise.mp3',
    'brown-noise': '/audio/brown-noise.mp3',
  };

  // Add phaseProgress state
  const [breathingPhaseProgress, setBreathingPhaseProgress] = useState(0);

  // Smooth gradient backgrounds
  const gradients = [
    'linear-gradient(135deg, #fef6e4 0%, #ffd6a5 100%)',
    'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)',
    'linear-gradient(135deg, #fffbe6 0%, #ffe082 100%)',
    'linear-gradient(135deg, #e0ffe6 0%, #b2f2d6 100%)',
    'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    'linear-gradient(135deg, #fceabb 0%, #f8b500 100%)',
    'linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)',
    'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
    'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)',
  ];
  // Helper to pick a gradient for a block (by id for consistency)
  const getGradient = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return gradients[Math.abs(hash) % gradients.length];
  };

  // Add dark mode state
  const [darkMode, setDarkMode] = useState(false);

  // Fetch all user data from Supabase after login
  useEffect(() => {
    if (!user) return;

    // Use functional update to avoid stale goalIdCounter
    setGoalIdCounter((prevGoalIdCounter) => {
      const fetchAllData = async (goalIdCounterValue: number) => {
        try {
          const [medSessions, workSess, journals, userGoals] = await Promise.all([
            getMeditationSessions(user.id),
            getWorkSessions(user.id),
            getJournalLogs(user.id),
            getGoals(user.id),
          ]);

          // Convert database sessions to display format
          const displayMedSessions: DisplayMeditationSession[] = medSessions.map(session => ({
            date: session.date,
            duration: session.length,
            completed: true,
            startTime: session.length,
          }));

          const displayWorkSessions: DisplayWorkSession[] = workSess.map(session => ({
            date: session.date,
            duration: session.length,
            audioType: 'binaural-40hz', // Default since we don't store this yet
          }));

          const displayJournalEntries: DisplayJournalEntry[] = journals.map(journal => ({
            date: journal.date,
            content: journal.log,
          }));

          setSessions(displayMedSessions);
          setWorkSessions(displayWorkSessions);
          setJournalEntries(displayJournalEntries);
          setDatabaseGoals(userGoals);

          // Convert database goals to display format and add placeholders
          const displayGoals: DisplayGoal[] = userGoals.map(goal => ({
            id: goal.id!.toString(),
            text: goal.goal,
            completed: goal.completed,
          }));

          // Add placeholder goals to ensure we have at least 3 active goals
          const activeGoals = displayGoals.filter(g => !g.completed);
          let tempCounter = goalIdCounterValue;

          while (activeGoals.length < 3) {
            activeGoals.push({
              id: `placeholder-${tempCounter}`,
              text: '',
              completed: false,
              placeholder: true,
            });
            tempCounter++;
          }

          // Combine all goals (active + placeholders + completed)
          const allGoals = [
            ...activeGoals,
            ...displayGoals.filter(g => g.completed)
          ];

          setGoals(allGoals);

          // Update mindfulness score based on sessions
          const totalSessions = medSessions.length + workSess.length;
          setMindfulnessScore(Math.min(100, 50 + totalSessions * 2));

          // Return the updated tempCounter for goalIdCounter
          return tempCounter;
        } catch (err) {
          console.error('Error fetching user data from Supabase:', err);
          return goalIdCounterValue; // fallback to previous value
        }
      };

      // Call the async function and update goalIdCounter when done
      fetchAllData(prevGoalIdCounter).then((newCounter) => {
        if (typeof newCounter === 'number' && newCounter !== prevGoalIdCounter) {
          setGoalIdCounter(newCounter);
        }
      });

      // Return prevGoalIdCounter immediately; actual update happens in .then
      return prevGoalIdCounter;
    });
  }, [user]);

  // Load today's journal entry on component mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayEntry = journalEntries.find((entry) => entry.date === today);
    if (todayEntry) {
      setTodayJournalContent(todayEntry.content);
    }
  }, [journalEntries]);

  // Smooth breathing animation cycle (4s inhale, 4s hold, 4s exhale) with smooth transitions using requestAnimationFrame
  useEffect(() => {
    if (!isActive) return;

    let startTimestamp: number | null = null;
    let animationFrameId: number;

    // Animation parameters
    const inhaleDuration = 4000; // 4 seconds
    const holdDuration = 3000;   // 3 seconds
    const exhaleDuration = 4000; // 4 seconds
    const totalCycle = inhaleDuration + holdDuration + exhaleDuration;

    function animateBreathing(timestamp: number) {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = (timestamp - startTimestamp) % totalCycle;

      let phase: 'inhale' | 'hold' | 'exhale';
      let phaseProgress = 0;

      if (elapsed < inhaleDuration) {
        phase = 'inhale';
        phaseProgress = elapsed / inhaleDuration;
      } else if (elapsed < inhaleDuration + holdDuration) {
        phase = 'hold';
        phaseProgress = 1;
      } else {
        phase = 'exhale';
        phaseProgress = 1 - ((elapsed - inhaleDuration - holdDuration) / exhaleDuration);
      }
      phaseProgress = Math.max(0, Math.min(1, phaseProgress));

      setBreathingPhase(phase);
      setBreathingCycle(Math.floor(elapsed / 1000));
      setBreathingPhaseProgress(phaseProgress);
      animationFrameId = requestAnimationFrame(animateBreathing);
    }

    animationFrameId = requestAnimationFrame(animateBreathing);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      startTimestamp = null;
    };
  }, [isActive]);

  // Meditation timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && currentTime > 0) {
      interval = setInterval(() => {
        setCurrentTime((currentTime) => currentTime - 1);
      }, 1000);
    } else if (currentTime === 0 && isActive) {
      setIsActive(false);
      // Add completed session
      const sessionDuration = meditationTime;
      const newSession: DisplayMeditationSession = {
        date: new Date().toISOString().split('T')[0],
        duration: sessionDuration,
        completed: true,
        startTime: sessionStartTime,
      };
      setSessions((prev) => [...prev, newSession]);
      setMindfulnessScore((prev) => Math.min(100, prev + 2));

      // Save to Supabase
      if (user) {
        saveMeditationSession({
          user_id: user.id,
          length: sessionDuration,
          date: new Date().toISOString().split('T')[0],
        }).catch(console.error);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, currentTime, meditationTime, sessionStartTime, user]);

  // Work stopwatch logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isWorkActive) {
      interval = setInterval(() => {
        setWorkCurrentTime((workCurrentTime) => workCurrentTime + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWorkActive]);

  // Handle audio playback for work timer
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = audioFileMap[selectedAudio];
    audio.volume = volume / 100;
    if (isWorkActive) {
      audio.play().catch(() => { });
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [isWorkActive, selectedAudio]);

  // Update volume in real time
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume / 100;
    }
  }, [volume]);

  // Show loading screen while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-25 via-orange-25 to-yellow-25 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-300 border-t-amber-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-amber-700 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth form if not authenticated
  if (!user) {
    return <AuthForm onAuthSuccess={() => { }} />;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const formatJournalDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const startStopTimer = () => {
    if (isActive) {
      // Stop the timer
      if (sessionStartTime > 0) {
        const elapsedTime = sessionStartTime - currentTime;
        // Only record if session was at least 30 seconds
        if (elapsedTime >= 30) {
          const newSession: DisplayMeditationSession = {
            date: new Date().toISOString().split('T')[0],
            duration: elapsedTime,
            completed: true,
            startTime: sessionStartTime,
          };
          setSessions((prev) => [...prev, newSession]);
          setMindfulnessScore((prev) => Math.min(100, prev + 1));

          // Save to Supabase
          if (user) {
            saveMeditationSession({
              user_id: user.id,
              length: elapsedTime,
              date: new Date().toISOString().split('T')[0],
            }).catch(console.error);
          }
        }
      }
      setIsActive(false);
      setCurrentTime(0);
      setSessionStartTime(0);
      // Reset breathing cycle to start with inhale
      setBreathingCycle(0);
      setBreathingPhase('inhale');
    } else {
      // Start the timer
      if (currentTime === 0) {
        setCurrentTime(meditationTime);
        setSessionStartTime(meditationTime);
      }
      setIsActive(true);
      // Reset breathing cycle to start with inhale
      setBreathingCycle(0);
      setBreathingPhase('inhale');
    }
  };

  const startStopWorkTimer = () => {
    if (isWorkActive) {
      // Stop the work stopwatch
      if (workCurrentTime >= 30) {
        // Only record if session was at least 30 seconds
        const newWorkSession: DisplayWorkSession = {
          date: new Date().toISOString().split('T')[0],
          duration: workCurrentTime,
          audioType: selectedAudio,
        };
        setWorkSessions((prev) => [...prev, newWorkSession]);

        // Save to Supabase
        if (user) {
          saveWorkSession({
            user_id: user.id,
            length: workCurrentTime,
            date: new Date().toISOString().split('T')[0],
          }).catch(console.error);
        }
      }
      setIsWorkActive(false);
      setWorkCurrentTime(0);
      setWorkSessionStartTime(0);
    } else {
      // Start the work stopwatch
      setWorkCurrentTime(0);
      setWorkSessionStartTime(Date.now());
      setIsWorkActive(true);
    }
  };

  const updateGoalText = async (id: string, text: string) => {
    const trimmedText = text.trim();
    const dbGoal = databaseGoals.find(g => g.id!.toString() === id);
    if (!trimmedText) {
      // Remove the goal and add a placeholder if needed
      setGoals(prev => {
        const filtered = prev.filter(g => g.id !== id);
        const activeGoals = filtered.filter(g => !g.completed);
        let updated = [...filtered];
        let tempCounter = goalIdCounter;
        if (activeGoals.length < 3) {
          updated.push({
            id: `placeholder-${tempCounter}`,
            text: '',
            completed: false,
            placeholder: true,
          });
          setGoalIdCounter(tempCounter + 1);
        }
        return updated;
      });
      // Delete from database if it exists
      if (dbGoal && user) {
        try {
          await updateGoal(dbGoal.id!, { goal: '', completed: true }); // Mark as completed/empty
          // Optionally, you could delete the goal from the DB if you have a deleteGoal function
        } catch (error) {
          console.error('Error deleting goal:', error);
        }
      }
      return;
    }
    // Update local state immediately
    setGoals((prev) =>
      prev.map((goal) => (goal.id === id ? { ...goal, text } : goal))
    );

    // Update in database
    if (dbGoal && user) {
      try {
        await updateGoal(dbGoal.id!, { goal: text });
        // Refresh database goals
        const updatedGoals = await getGoals(user.id);
        setDatabaseGoals(updatedGoals);
      } catch (error) {
        console.error('Error updating goal:', error);
      }
    }
  };

  const toggleGoal = async (id: string) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;

    const newCompleted = !goal.completed;

    // Update local state immediately
    setGoals((prev) => {
      const updatedGoals = prev.map((g) =>
        g.id === id ? { ...g, completed: newCompleted } : g
      );

      // If a goal was just completed, add a new empty goal to maintain 3 active goals
      const activeGoals = updatedGoals.filter((g) => !g.completed);
      if (activeGoals.length < 3) {
        const newGoal: DisplayGoal = {
          id: `placeholder-${goalIdCounter}`,
          text: '',
          completed: false,
          placeholder: true,
        };
        setGoalIdCounter((prev) => prev + 1);
        updatedGoals.push(newGoal);
      }

      return updatedGoals;
    });

    // Update in database
    const dbGoal = databaseGoals.find(g => g.id!.toString() === id);
    if (dbGoal && user) {
      try {
        await updateGoal(dbGoal.id!, { completed: newCompleted });
        // Refresh database goals
        const updatedGoals = await getGoals(user.id);
        setDatabaseGoals(updatedGoals);
      } catch (error) {
        console.error('Error updating goal:', error);
      }
    }
  };

  const handleSavePlaceholder = async (goal: DisplayGoal, text: string) => {
    if (!user || !text.trim()) {
      // Remove empty placeholder goal and immediately add a new one if needed
      setGoals(prev => {
        const filtered = prev.filter(g => g.id !== goal.id);
        const activeGoals = filtered.filter(g => !g.completed);
        let updated = [...filtered];
        let tempCounter = goalIdCounter;
        if (activeGoals.length < 3) {
          updated.push({
            id: `placeholder-${tempCounter}`,
            text: '',
            completed: false,
            placeholder: true,
          });
          setGoalIdCounter(tempCounter + 1);
        }
        return updated;
      });
      return;
    }

    setSavingGoals((prev) => ({ ...prev, [goal.id]: true }));

    try {
      await saveGoal({
        user_id: user.id,
        goal: text,
        completed: false,
        date_created: new Date().toISOString().split('T')[0],
      });

      // Refresh goals from database
      const updatedGoals = await getGoals(user.id);
      setDatabaseGoals(updatedGoals);

      // Convert to display format and add placeholders
      const displayGoals: DisplayGoal[] = updatedGoals.map(goal => ({
        id: goal.id!.toString(),
        text: goal.goal,
        completed: goal.completed,
      }));

      // Add placeholder goals to ensure we have at least 3 active goals
      const activeGoals = displayGoals.filter(g => !g.completed);
      let tempCounter = goalIdCounter;

      while (activeGoals.length < 3) {
        activeGoals.push({
          id: `placeholder-${tempCounter}`,
          text: '',
          completed: false,
          placeholder: true,
        });
        tempCounter++;
      }

      // Combine all goals (active + placeholders + completed)
      const allGoals = [
        ...activeGoals,
        ...displayGoals.filter(g => g.completed)
      ];

      setGoals(allGoals);
      setGoalIdCounter(tempCounter);

    } catch (error) {
      console.error('Error saving goal:', error);
    } finally {
      setSavingGoals((prev) => {
        const newState = { ...prev };
        delete newState[goal.id];
        return newState;
      });
    }
  };

  const handleJournalContentChange = (content: string) => {
    setTodayJournalContent(content);

    // Update journal entries state
    const today = new Date().toISOString().split('T')[0];
    setJournalEntries(prev => {
      const filtered = prev.filter(entry => entry.date !== today);
      if (content.trim()) {
        return [...filtered, { date: today, content }];
      }
      return filtered;
    });
  };

  const getStreak = () => {
    const recentSessions = sessions.filter((s) => s.completed);
    let streak = 0;
    let checkDate = new Date();

    while (streak < 30) {
      // Max check 30 days
      const dateStr = checkDate.toISOString().split('T')[0];
      const hasSession = recentSessions.some((s) => s.date === dateStr);
      if (hasSession) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const getBreathingText = () => {
    switch (breathingPhase) {
      case 'inhale':
        return 'Breathe in...';
      case 'hold':
        return 'Hold...';
      case 'exhale':
        return 'Breathe out...';
      default:
        return 'Breathe in...';
    }
  };

  // Update getCircleOpacityValue to interpolate opacity based on phaseProgress for new values
  const getCircleOpacityValue = () => {
    if (!isActive) {
      // Gentle pulsing when not active
      return breathingPhase === 'inhale' ? 0.8 : 0.4;
    }
    // Use phaseProgress for smooth interpolation
    if (breathingPhase === 'exhale') {
      // Exhale: 1.0 -> 0.6 -> 0.2 (fade out)
      const progress = 1 - breathingPhaseProgress; // invert so 0=start, 1=end
      if (progress < 0.5) {
        // First half: 1.0 -> 0.6
        return 1 - 0.4 * (progress / 0.5);
      } else {
        // Second half: 0.6 -> 0.2
        return 0.6 - 0.4 * ((progress - 0.5) / 0.5);
      }
    } else if (breathingPhase === 'inhale') {
      // Inhale: 0.2 -> 0.6 -> 1.0 (fade in)
      if (breathingPhaseProgress < 0.5) {
        // First half: 0.2 -> 0.6
        return 0.2 + 0.4 * (breathingPhaseProgress / 0.5);
      } else {
        // Second half: 0.6 -> 1.0
        return 0.6 + 0.4 * ((breathingPhaseProgress - 0.5) / 0.5);
      }
    } else if (breathingPhase === 'hold') {
      return 1;
    }
    return 0.8;
  };

  // Get meditation and work data for the past 7 days (including today) in 15-second blocks
  const getWeeklyProgressData = () => {
    const data = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

      // Meditation data
      const meditationSeconds = sessions
        .filter((s) => s.date === dateStr)
        .reduce((acc, s) => acc + s.duration, 0);
      const meditationBlocks = Math.floor(meditationSeconds / 15);

      // Work data
      const workSeconds = workSessions
        .filter((s) => s.date === dateStr)
        .reduce((acc, s) => acc + s.duration, 0);
      const workBlocks = Math.floor(workSeconds / 15);

      data.push({
        day: dayName,
        meditationBlocks: meditationBlocks,
        workBlocks: workBlocks,
        isToday: i === 0,
      });
    }

    return data;
  };

  // Get recent milestones (longest sessions) combining meditation and work
  const getRecentMilestones = (): Milestone[] => {
    const allMilestones: Milestone[] = [];

    // Group meditation sessions by date and find the longest session for each date
    const meditationSessionsByDate = sessions.reduce((acc, session) => {
      if (!acc[session.date] || session.duration > acc[session.date].duration) {
        acc[session.date] = session;
      }
      return acc;
    }, {} as Record<string, DisplayMeditationSession>);

    // Add meditation milestones
    Object.values(meditationSessionsByDate).forEach((session) => {
      allMilestones.push({
        date: session.date,
        duration: session.duration,
        type: 'meditation',
      });
    });

    // Group work sessions by date and find the longest session for each date
    const workSessionsByDate = workSessions.reduce((acc, session) => {
      if (!acc[session.date] || session.duration > acc[session.date].duration) {
        acc[session.date] = session;
      }
      return acc;
    }, {} as Record<string, DisplayWorkSession>);

    // Add work milestones
    Object.values(workSessionsByDate).forEach((session) => {
      allMilestones.push({
        date: session.date,
        duration: session.duration,
        type: 'work',
      });
    });

    // Sort by duration (longest first) and take top 3
    return allMilestones.sort((a, b) => b.duration - a.duration).slice(0, 3);
  };

  const weeklyData = getWeeklyProgressData();
  const maxBlocks = Math.max(
    ...weeklyData.map((d) => Math.max(d.meditationBlocks, d.workBlocks)),
    1
  );
  const recentMilestones = getRecentMilestones();

  const Navigation = () => (
    <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-amber-50 to-amber-25 border-t border-amber-200 px-4 py-2">
      <div className="flex justify-around max-w-md mx-auto">
        {[
          { id: 'home', icon: Home, label: 'Home' },
          { id: 'meditation', icon: Timer, label: 'Meditate' },
          { id: 'learn', icon: BookOpen, label: 'Learn' },
          { id: 'goals', icon: Target, label: 'Goals' },
          { id: 'work', icon: Briefcase, label: 'Work' },
          { id: 'progress', icon: TrendingUp, label: 'Progress' },
          { id: 'account', icon: User, label: 'Account' },
        ].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setCurrentSection(id as Section)}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 ${currentSection === id
              ? 'text-amber-800 bg-amber-100'
              : 'text-amber-600 hover:text-amber-800 hover:bg-amber-50'
              }`}
          >
            <Icon size={20} />
            <span className="text-xs mt-1 font-semibold">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );

  const HomeSection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-amber-900 mb-2">Zene</h1>
        <p
          className="text-amber-700 text-sm font-medium"
          style={{ fontFamily: 'Work Sans, sans-serif' }}
        >
          Great Minds don't wander. They Conquer
        </p>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
        <div className="text-center">
          <div className="text-4xl font-bold text-amber-800 mb-2">
            {mindfulnessScore}
          </div>
          <div className="text-sm text-amber-600 mb-4 font-semibold">
            Mindfulness Score
          </div>
          <div className="w-full bg-amber-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-amber-400 to-orange-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${mindfulnessScore}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Daily Journal Section */}
      <div className="bg-white rounded-xl border border-amber-200 shadow-sm">
        <button
          onClick={() => setIsJournalExpanded(!isJournalExpanded)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-amber-100 transition-colors duration-200 rounded-xl"
        >
          <div className="flex items-center space-x-3">
            <BookOpen size={20} className="text-amber-600" />
            <div>
              <h3 className="font-semibold text-lg text-amber-900">
                Daily Journal
              </h3>
              <p className="text-sm text-amber-600">Capture your thoughts</p>
            </div>
          </div>
          {isJournalExpanded ? (
            <ChevronUp className="text-amber-600" />
          ) : (
            <ChevronDown className="text-amber-600" />
          )}
        </button>

        {isJournalExpanded && (
          <div className="px-4 pb-4 space-y-4">
            {/* Today's Journal Entry */}
            <div className="bg-gradient-to-br from-amber-25 to-orange-25 rounded-lg p-4 border border-amber-100">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-amber-900">Today's Entry</h4>
                <span className="text-xs text-amber-600 font-semibold">
                  {formatJournalDate(new Date().toISOString().split('T')[0])}
                </span>
              </div>
              <JournalEntry
                userId={user.id}
                initialContent={todayJournalContent}
                onContentChange={handleJournalContentChange}
              />
            </div>

            {/* Previous Journal Entries */}
            {journalEntries.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-amber-900 text-sm">
                  Previous Entries
                </h4>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {journalEntries
                    .filter(
                      (entry) =>
                        entry.date !== new Date().toISOString().split('T')[0]
                    )
                    .sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                    )
                    .slice(0, 5)
                    .map((entry, index) => (
                      <div
                        key={entry.date}
                        className="bg-amber-50 rounded-lg p-3 border border-amber-100"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-amber-600 font-semibold">
                            {formatJournalDate(entry.date)}
                          </span>
                        </div>
                        <p
                          className="text-sm text-amber-700 leading-relaxed line-clamp-3"
                          style={{ fontFamily: 'Crimson Text, serif' }}
                        >
                          {entry.content}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 border border-amber-200">
        <h3 className="font-semibold text-lg text-amber-900 mb-3">
          Today's Wisdom
        </h3>
        <p className="text-amber-700 italic leading-relaxed">
          "{getDailyWisdom()}"
        </p>
      </div>
    </div>
  );

  const MeditationSection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-amber-900 mb-2">Meditation</h2>
        <p className="text-amber-700 text-sm font-semibold">
          Find your inner peace
        </p>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-8 border border-amber-200">
        <div className="text-center">
          <div className="text-6xl font-bold text-amber-800 mb-8">
            {formatTime(currentTime || meditationTime)}
          </div>

          {/* Breathing Exercise Circle - Fixed positioning */}
          <div className="mb-8 flex flex-col items-center">
            <div className="relative w-24 h-24 mb-4">
              <div
                className={"absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-400 rounded-full transition-opacity duration-1000 ease-in-out"}
                style={{ opacity: getCircleOpacityValue() }}
              ></div>
            </div>
            <p className="text-amber-700 text-sm font-semibold">
              {isActive ? getBreathingText() : 'Ready to begin'}
            </p>
          </div>

          <div className="flex justify-center items-center mb-6">
            <button
              onClick={startStopTimer}
              className="bg-amber-600 hover:bg-amber-700 text-white p-4 rounded-full transition-colors duration-200"
            >
              {isActive ? <Square size={24} /> : <Play size={24} />}
            </button>
          </div>

          <div className="flex justify-center flex-wrap gap-2">
            {[300, 600, 900, 1200, 1800, 3600].map((duration) => (
              <button
                key={duration}
                onClick={() => {
                  if (!isActive) {
                    setMeditationTime(duration);
                    setCurrentTime(0);
                  }
                }}
                disabled={isActive}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200 ${isActive
                  ? 'bg-amber-100 text-amber-400 cursor-not-allowed'
                  : meditationTime === duration
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  }`}
              >
                {duration >= 3600 ? `${duration / 3600}h` : `${duration / 60}m`}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const WorkSection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-amber-900 mb-2">Focus Work</h2>
        <p className="text-amber-700 text-sm font-semibold">
          Deep work with ambient sounds
        </p>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-8 border border-amber-200">
        <div className="text-center">
          <div className="text-6xl font-bold text-amber-800 mb-8">
            {formatTime(workCurrentTime)}
          </div>

          <div className="flex justify-center items-center mb-6">
            <button
              onClick={startStopWorkTimer}
              className="bg-amber-600 hover:bg-amber-700 text-white p-4 rounded-full transition-colors duration-200"
            >
              {isWorkActive ? <Square size={24} /> : <Play size={24} />}
            </button>
          </div>

          <p className="text-amber-700 text-sm font-semibold">
            {isWorkActive
              ? 'Focus session in progress...'
              : 'Ready to start your focus session'}
          </p>
        </div>
      </div>

      {/* Audio Options */}
      <div className="bg-white rounded-xl p-6 border border-amber-200">
        <h3 className="font-semibold text-lg text-amber-900 mb-4">
          Ambient Sounds
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {audioOptions.map((audio) => (
            <button
              key={audio.id}
              onClick={() => setSelectedAudio(audio.id)}
              className={`p-3 rounded-lg text-left transition-colors duration-200 ${selectedAudio === audio.id
                ? 'bg-amber-100 border-2 border-amber-300'
                : 'bg-amber-25 border border-amber-200 hover:bg-amber-50'
                }`}
            >
              <div className="font-semibold text-amber-900 text-sm">
                {audio.name}
              </div>
              <div className="text-xs text-amber-600">{audio.description}</div>
            </button>
          ))}
        </div>

        {/* Volume Control */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Volume2 size={18} className="text-amber-600" />
              <span className="text-sm font-semibold text-amber-900">
                Volume
              </span>
            </div>
            <span className="text-sm text-amber-600 font-semibold">
              {volume}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(parseInt(e.target.value))}
            className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${volume}%, #fde68a ${volume}%, #fde68a 100%)`,
            }}
          />
        </div>
      </div>
    </div>
  );

  const GoalsSection = () => {
    // Filter goals to show only active goals (including placeholders) for the main list
    const activeGoals = goals.filter(g => !g.completed);
    const completedGoals = goals.filter((goal) => goal.completed);
    const completedCount = completedGoals.length;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-amber-900 mb-2">
            Focused Goals
          </h2>
          <p className="text-amber-700 text-sm font-semibold">
            Focus on what matters most
          </p>
        </div>

        <div className="space-y-4">
          {activeGoals.map((goal, index) => (
            <GoalInputItem
              key={goal.id}
              goal={goal}
              index={index}
              isSaving={!!savingGoals[goal.id]}
              onToggle={toggleGoal}
              onUpdateText={updateGoalText}
              onSavePlaceholder={handleSavePlaceholder}
            />
          ))}
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
          <p className="text-amber-700 text-sm italic text-center font-semibold">
            "The journey of a thousand miles begins with one step"
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-amber-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-800">
              {completedCount}
            </div>
            <div className="text-sm text-amber-600 font-semibold">
              Goals Completed So Far
            </div>
          </div>
        </div>

        {completedGoals.length > 0 && (
          <div className="space-y-2">
            {completedGoals.map((goal) => (
              <div
                key={goal.id}
                className="bg-amber-50 rounded-xl p-4 border border-amber-100 opacity-60"
              >
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => toggleGoal(goal.id)}
                    className="w-6 h-6 rounded-full bg-amber-600 border-2 border-amber-600 text-white flex items-center justify-center transition-colors duration-200"
                  >
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </button>
                  <span className="flex-1 text-amber-700 font-semibold line-through">
                    {goal.text}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const ProgressSection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-amber-900 mb-2">Progress</h2>
        <p className="text-amber-700 text-sm font-semibold">
          Track your mindful journey
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4 border border-amber-200">
          <div className="text-2xl font-bold text-amber-800">
            {Math.floor(sessions.reduce((acc, s) => acc + s.duration, 0) / 60)}
          </div>
          <div className="text-sm text-amber-600 font-semibold">
            Minutes Meditated
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-amber-200">
          <div className="text-2xl font-bold text-amber-800">
            {Math.floor(
              workSessions.reduce((acc, s) => acc + s.duration, 0) / 60
            )}
          </div>
          <div className="text-sm text-amber-600 font-semibold">
            Minutes Focused Work
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
        <h3 className="font-semibold text-lg text-amber-900 mb-4">
          Weekly Progress
        </h3>
        <div className="flex items-end justify-between space-x-2 h-32 relative">
          {/* Horizontal line under the bars */}
          <div className="absolute bottom-14 left-0 right-0 h-px bg-amber-200"></div>

          {weeklyData.map((day, index) => (
            <div key={index} className="flex flex-col items-center flex-1">
              <div className="w-full flex justify-center items-end mb-2 space-x-1 h-20">
                {/* Meditation bar */}
                <div
                  className={`w-3 bg-gradient-to-t from-amber-300 to-amber-400 transition-all duration-500 rounded-t`}
                  style={{
                    height: `${Math.max(
                      (day.meditationBlocks / maxBlocks) * 80,
                      day.meditationBlocks > 0 ? 8 : 0
                    )}px`,
                  }}
                ></div>
                {/* Work bar */}
                <div
                  className={`w-3 bg-gradient-to-t from-orange-300 to-orange-400 transition-all duration-500 rounded-t`}
                  style={{
                    height: `${Math.max(
                      (day.workBlocks / maxBlocks) * 80,
                      day.workBlocks > 0 ? 8 : 0
                    )}px`,
                  }}
                ></div>
              </div>
              <span className="text-xs text-amber-700 font-semibold">
                {day.day}
              </span>
              <div className="text-xs text-amber-600 text-center">
                <div>M: {day.meditationBlocks * 15}s</div>
                <div>W: {day.workBlocks * 15}s</div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-4 space-x-4 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gradient-to-t from-amber-300 to-amber-400 rounded"></div>
            <span className="text-amber-700 font-semibold">Meditation</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gradient-to-t from-orange-300 to-orange-400 rounded"></div>
            <span className="text-amber-700 font-semibold">Work</span>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-amber-25 to-orange-25 rounded-xl p-6 border border-amber-100 opacity-80">
        <h3 className="font-semibold text-lg text-amber-900 mb-4">
          Recent Milestones
        </h3>
        {recentMilestones.length > 0 ? (
          <div className="space-y-3">
            {recentMilestones.map((milestone, index) => (
              <div
                key={`${milestone.date}-${milestone.type}`}
                className={`flex justify-between items-center py-2 border-b border-amber-100 last:border-b-0 ${index === 0 ? 'text-base' : 'text-sm'
                  }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-amber-700 font-semibold">
                    {formatDate(milestone.date)}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-semibold ${milestone.type === 'meditation'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-orange-100 text-orange-700'
                      }`}
                  >
                    {milestone.type === 'meditation' ? 'Meditation' : 'Work'}
                  </span>
                </div>
                <span className="text-amber-600 font-semibold">
                  {Math.floor(milestone.duration / 60)}m{' '}
                  {milestone.duration % 60}s
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-amber-600 text-sm italic font-semibold">
            Start your first session!
          </p>
        )}
      </div>
    </div>
  );

  const LearnSection = () => {
    const [summaries, setSummaries] = useState<BookSummary[]>([]);
    const [userStatus, setUserStatus] = useState<UserBookStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null); // book_summary_id being updated
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
      if (!user) return;
      setLoading(true);
      Promise.all([
        getBookSummaries(),
        getUserBookStatus(user.id),
      ]).then(([summaries, status]) => {
        setSummaries(summaries);
        setUserStatus(status);
        setLoading(false);
      });
    }, [user]);

    const getStatus = (book_summary_id: string) =>
      userStatus.find((s) => s.book_summary_id === book_summary_id);

    const handleMarkRead = async (book_summary_id: string) => {
      if (!user) return;
      setUpdating(book_summary_id);
      const today = new Date().toISOString().split('T')[0];
      await upsertUserBookStatus({
        user_id: user.id,
        book_summary_id,
        is_favourite: !!getStatus(book_summary_id)?.is_favourite,
        read_at: today,
      });
      // Refresh status
      const status = await getUserBookStatus(user.id);
      setUserStatus(status);
      setUpdating(null);
    };

    const handleToggleFavourite = async (book_summary_id: string) => {
      if (!user) return;
      setUpdating(book_summary_id);
      const status = getStatus(book_summary_id);
      const today = new Date().toISOString().split('T')[0];
      await upsertUserBookStatus({
        user_id: user.id,
        book_summary_id,
        is_favourite: !status?.is_favourite,
        read_at: status?.read_at || today,
      });
      // Refresh status
      const newStatus = await getUserBookStatus(user.id);
      setUserStatus(newStatus);
      setUpdating(null);
    };

    return (
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-amber-900 mb-2">Learn</h2>
          <p className="text-amber-700 text-sm font-semibold">
            Read summaries and key learnings from books
          </p>
        </div>
        {/* For You Section */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
          <h3 className="text-lg font-bold text-amber-900 mb-3 ml-2">For you</h3>
          {loading ? (
            <div className="text-amber-600 italic ml-2">Loading...</div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 px-2" style={{ WebkitOverflowScrolling: 'touch' }}>
              {summaries.filter(book => !getStatus(book.id)).length === 0 ? (
                <div className="text-amber-600 italic">No unread summaries.</div>
              ) : (
                summaries.filter(book => !getStatus(book.id)).map((book) => {
                  const isFavourite = !!getStatus(book.id)?.is_favourite;
                  const isExpanded = expandedId === book.id;
                  return (
                    <div key={book.id} className="relative flex-shrink-0 w-64 aspect-square">
                      <button
                        className={`w-full h-full border border-amber-300 shadow-sm rounded-2xl flex flex-col items-start justify-between p-4 transition-all duration-200 focus:outline-none hover:brightness-105 ${isExpanded ? 'ring-2 ring-amber-400' : ''}`}
                        style={{ background: getGradient(book.id) }}
                        onClick={() => setExpandedId(book.id)}
                        aria-expanded={isExpanded}
                        disabled={isExpanded}
                      >
                        <div className="w-full">
                          <div className="font-bold text-amber-900 text-base leading-tight line-clamp-5 mb-2 min-h-[3.5em]">{book.title}</div>
                          {book.category && (
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${book.category.toLowerCase() === 'work'
                              ? 'bg-orange-100 text-orange-700'
                              : book.category.toLowerCase() === 'meditation' || book.category.toLowerCase() === 'mindful' || book.category.toLowerCase() === 'mindfull'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-amber-50 text-amber-700'
                              }`}>
                              {book.category.charAt(0).toUpperCase() + book.category.slice(1)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-auto">
                          {isFavourite && <span className="text-yellow-400 text-lg">★</span>}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-2 sm:mx-4 flex flex-col h-[90vh] relative">
                            {/* Back button only */}
                            <button
                              className="absolute top-4 left-4 text-amber-400 hover:text-amber-600 text-2xl font-bold focus:outline-none"
                              onClick={() => setExpandedId(null)}
                              aria-label="Back"
                            >
                              ←
                            </button>
                            <h3 className="text-2xl font-bold text-amber-900 mb-2 text-center mt-12">{book.title}</h3>
                            <hr className="border-amber-100 mb-2" />
                            <div className="flex-1 overflow-y-auto px-2 pb-32">
                              <p className="text-amber-700 whitespace-pre-line text-base leading-relaxed">{book.summary}</p>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-amber-100 p-4 flex flex-col gap-3 rounded-b-2xl">
                              <button
                                onClick={() => handleToggleFavourite(book.id)}
                                className={`text-lg font-semibold flex items-center justify-center gap-2 px-4 py-2 rounded transition-colors ${isFavourite ? 'bg-yellow-100 text-yellow-600' : 'bg-amber-100 text-amber-700 hover:bg-yellow-50'}`}
                                title={isFavourite ? 'Unfavourite' : 'Favourite'}
                                disabled={updating === book.id}
                              >
                                {isFavourite ? '★' : '☆'} Favourite
                              </button>
                              <button
                                onClick={() => handleMarkRead(book.id)}
                                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded font-semibold text-base transition-colors duration-200"
                                disabled={updating === book.id}
                              >
                                Mark as Read
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
        {/* Read Section */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
          <h3 className="text-lg font-bold text-amber-900 mb-3 ml-2">Read</h3>
          {loading ? (
            <div className="text-amber-600 italic ml-2">Loading...</div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 px-2" style={{ WebkitOverflowScrolling: 'touch' }}>
              {summaries.filter(book => !!getStatus(book.id)).length === 0 ? (
                <div className="text-amber-600 italic">No read summaries yet.</div>
              ) : (
                summaries.filter(book => !!getStatus(book.id)).map((book) => {
                  const isFavourite = !!getStatus(book.id)?.is_favourite;
                  const isExpanded = expandedId === book.id;
                  return (
                    <div key={book.id} className="relative flex-shrink-0 w-64 aspect-square">
                      <button
                        className={`w-full h-full border border-amber-300 shadow-sm rounded-2xl flex flex-col items-start justify-between p-4 transition-all duration-200 focus:outline-none hover:brightness-105 ${isExpanded ? 'ring-2 ring-amber-400' : ''}`}
                        style={{ background: getGradient(book.id) }}
                        onClick={() => setExpandedId(book.id)}
                        aria-expanded={isExpanded}
                        disabled={isExpanded}
                      >
                        <div className="w-full">
                          <div className="font-bold text-amber-900 text-base leading-tight line-clamp-5 mb-2 min-h-[3.5em]">{book.title}</div>
                          {book.category && (
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${book.category.toLowerCase() === 'work'
                              ? 'bg-orange-100 text-orange-700'
                              : book.category.toLowerCase() === 'meditation' || book.category.toLowerCase() === 'mindful' || book.category.toLowerCase() === 'mindfull'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-amber-50 text-amber-700'
                              }`}>
                              {book.category.charAt(0).toUpperCase() + book.category.slice(1)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-auto">
                          {isFavourite && <span className="text-yellow-400 text-lg">★</span>}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-2 sm:mx-4 flex flex-col h-[90vh] relative">
                            {/* Back button only */}
                            <button
                              className="absolute top-4 left-4 text-amber-400 hover:text-amber-600 text-2xl font-bold focus:outline-none"
                              onClick={() => setExpandedId(null)}
                              aria-label="Back"
                            >
                              ←
                            </button>
                            <h3 className="text-2xl font-bold text-amber-900 mb-2 text-center mt-12">{book.title}</h3>
                            <hr className="border-amber-100 mb-2" />
                            <div className="flex-1 overflow-y-auto px-2 pb-32">
                              <p className="text-amber-700 whitespace-pre-line text-base leading-relaxed">{book.summary}</p>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-amber-100 p-4 flex flex-col gap-3 rounded-b-2xl">
                              <button
                                onClick={() => handleToggleFavourite(book.id)}
                                className={`text-lg font-semibold flex items-center justify-center gap-2 px-4 py-2 rounded transition-colors ${isFavourite ? 'bg-yellow-100 text-yellow-600' : 'bg-amber-100 text-amber-700 hover:bg-yellow-50'}`}
                                title={isFavourite ? 'Unfavourite' : 'Favourite'}
                                disabled={updating === book.id}
                              >
                                {isFavourite ? '★' : '☆'} Favourite
                              </button>
                              <span className="text-green-600 font-semibold flex items-center justify-center gap-1"><span>✓</span>Read</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const AccountSection = () => (
    <div className="max-w-md mx-auto mt-8 space-y-8">
      <div className="flex items-center space-x-3">
        <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-400 rounded-full flex items-center justify-center">
          <User size={32} className="text-white" />
        </div>
        <div>
          <p className="text-amber-900 font-bold text-lg">
            {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
          </p>
          <p className="text-amber-600 text-sm">{user?.email}</p>
        </div>
      </div>
      <div>
        <button
          onClick={signOut}
          className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
        >
          <LogOut size={20} /> Sign Out
        </button>
      </div>
      <div className="flex items-center justify-between bg-amber-50 rounded-lg p-4 border border-amber-200">
        <span className="text-amber-800 font-semibold">Dark Mode</span>
        <button
          onClick={() => setDarkMode((d) => !d)}
          className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${darkMode ? 'bg-amber-700' : 'bg-amber-200'}`}
          aria-label="Toggle dark mode"
        >
          <span
            className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ${darkMode ? 'translate-x-6' : ''}`}
          ></span>
        </button>
      </div>
      <div className="text-xs text-amber-400 text-center pt-8">Zene v1.0</div>
    </div>
  );

  const renderSection = () => {
    switch (currentSection) {
      case 'home':
        return <HomeSection />;
      case 'meditation':
        return <MeditationSection />;
      case 'learn':
        return <LearnSection />;
      case 'goals':
        return <GoalsSection />;
      case 'work':
        return <WorkSection />;
      case 'progress':
        return <ProgressSection />;
      case 'account':
        return <AccountSection />;
      default:
        return <HomeSection />;
    }
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gradient-to-br from-amber-25 via-orange-25 to-yellow-25">
        <div className="max-w-md mx-auto px-4 py-6 pb-20">{renderSection()}</div>
        <Navigation />
        <audio
          ref={audioRef}
          src={audioFileMap[selectedAudio]}
          loop
          preload="auto"
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}

export default App;