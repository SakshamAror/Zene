import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import AuthForm from './components/AuthForm.tsx';
import Dashboard from './components/Dashboard.tsx';
import Timers from './components/Timers.tsx';
import Goals from './components/Goals.tsx';
import Journal from './components/Journal.tsx';
import Learn from './components/Learn.tsx';
import Analytics from './components/Analytics.tsx';
import { Home, Clock, Target, BookOpen, PenTool, BarChart3, Settings as SettingsIcon, ArrowLeft } from 'lucide-react';
import Settings from './components/Settings';
import Onboarding from './components/Onboarding';
import { getUserPrefs, upsertUserPrefs, saveMeditationSession, getMeditationSessions, getWorkSessions, getFriendNotifications } from './lib/saveData';
import type { MeditationSession, WorkSession } from './types';
import { supabase } from './lib/supabase';

export type View = 'dashboard' | 'timers' | 'goals' | 'journal' | 'learn' | 'analytics' | 'settings';

function upsertProfileIfNeeded(user: any) {
  if (!user || !user.id) return;
  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || (user.email ? user.email.split('@')[0] : '');
  supabase
    .from('profiles')
    .select('user_id')
    .eq('user_id', user.id)
    .then(({ data, error }) => {
      if (!data || data.length === 0) {
        supabase.from('profiles').insert({ user_id: user.id, full_name: fullName }).then(() => { });
      }
    });
}

function App() {
  const { user, loading, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [darkMode, setDarkMode] = useState(true); // Default to dark mode for Opal style
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [bookPopupOpen, setBookPopupOpen] = useState(false);
  const [needsInitialGoals, setNeedsInitialGoals] = useState(false);
  const [hasFriendNotifications, setHasFriendNotifications] = useState(false);
  const [timerActive, setTimerActive] = useState(false); // NEW STATE
  const [voicePopupOpen, setVoicePopupOpen] = useState(false);

  // Expose a refresh function for instant notification updates
  const refreshFriendNotifications = async () => {
    if (user?.id) {
      try {
        const { hasNotifications } = await getFriendNotifications(user.id);
        setHasFriendNotifications(hasNotifications);
      } catch {
        setHasFriendNotifications(false);
      }
    } else {
      setHasFriendNotifications(false);
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    } else {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    if (user) {
      getUserPrefs(user.id).then(prefs => {
        setShowOnboarding(!prefs || prefs.onboarded !== true);
      }).catch((e) => {
        setShowOnboarding(false);
      });
    } else {
      setShowOnboarding(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      upsertProfileIfNeeded(user);
    }
  }, [user]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    refreshFriendNotifications();
    interval = setInterval(refreshFriendNotifications, 30000);
    return () => { if (interval) clearInterval(interval); };
  }, [user?.id]);

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [currentView]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Copy of calculateStreak from Dashboard
  function calculateStreak(meditations: MeditationSession[], workSessions: WorkSession[]): number {
    const today = new Date();
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const hasGoal = meditations.some(m => m.timestamp && m.timestamp.split('T')[0] === dateStr && m.length > 0) ||
        workSessions.some(w => w.timestamp && w.timestamp.split('T')[0] === dateStr && w.length > 0);
      if (hasGoal) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return streak;
  }

  interface OnboardingGoals {
    meditation: number;
    focus: number;
    mainGoal: string;
  }
  const handleOnboardingComplete = async (goals: OnboardingGoals) => {
    if (user) {
      await upsertUserPrefs({ user_id: user.id, onboarded: true });
      // Check if meditation goal is 2
      if (goals.meditation === 2) {
        const [meditations, workSessions] = await Promise.all([
          getMeditationSessions(user.id),
          getWorkSessions(user.id)
        ]);
        const streak = calculateStreak(meditations, workSessions);
        if (streak === 0) {
          // Upload a 2-min meditation session for today
          await saveMeditationSession({
            user_id: user.id,
            length: 120,
            timestamp: new Date().toISOString(),
          });
        }
      }
      setNeedsInitialGoals(true);
      setCurrentView('goals');
      setShowOnboarding(false);
    }
  };

  const handleSetCurrentView = (view: View) => {
    if ((currentView === 'dashboard' && view === 'analytics') || (currentView === 'analytics' && view === 'dashboard')) {
      setTransitioning(true);
      setTimeout(() => {
        setCurrentView(view);
        setTransitioning(false);
      }, 250);
    } else {
      setCurrentView(view);
    }
  };

  if (loading || showOnboarding === null) {
    return (
      <div className="min-h-screen opal-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 loading-spinner mx-auto mb-4"></div>
          <p className="text-secondary font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm onAuthSuccess={() => { }} />;
  }

  if (showOnboarding) {
    return <Onboarding userId={user.id} onComplete={handleOnboardingComplete} />;
  }

  const navigationItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'timers', label: 'Focus', icon: Clock },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'journal', label: 'Journal', icon: PenTool },
    { id: 'learn', label: 'Learn', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const renderCurrentView = () => {
    if (currentView === 'analytics') {
      return (
        <div className={`min-h-screen z-40 bg-gradient-to-b from-emerald-900 to-emerald-700 transition-all duration-300 ease-in-out ${transitioning ? 'opacity-0 translate-y-8 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
          <div className="absolute top-0 left-0 p-4 z-50">
            <button
              className="bg-emerald-900/80 rounded-full p-2 shadow-md border border-emerald-700 text-emerald-200 hover:bg-emerald-800/90 transition"
              onClick={() => handleSetCurrentView('dashboard')}
              aria-label="Back to Dashboard"
            >
              <ArrowLeft size={22} />
            </button>
          </div>
          <Analytics userId={user.id} />
        </div>
      );
    }
    if (currentView === 'dashboard') {
      return (
        <div className={`transition-all duration-300 ease-in-out ${transitioning ? 'opacity-0 -translate-y-8 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
          <Dashboard userId={user.id} user={user} setCurrentView={handleSetCurrentView} />
        </div>
      );
    }
    switch (currentView) {
      case 'timers':
        return <Timers userId={user.id} setCurrentView={handleSetCurrentView} onTimerActiveChange={setTimerActive} />;
      case 'goals':
        return <Goals userId={user.id} needsInitialGoals={needsInitialGoals} onFirstGoal={() => setNeedsInitialGoals(false)} />;
      case 'journal':
        return <Journal userId={user.id} voicePopupOpen={voicePopupOpen} setVoicePopupOpen={setVoicePopupOpen} />;
      case 'learn':
        return <Learn userId={user.id} onBookOpen={() => setBookPopupOpen(true)} onBookClose={() => setBookPopupOpen(false)} />;
      case 'settings':
        return <Settings user={user} signOut={signOut} refreshFriendNotifications={refreshFriendNotifications} />;
      default:
        return <Dashboard userId={user.id} user={user} setCurrentView={handleSetCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen opal-bg">
      {/* Main Content */}
      <main className="flex-1 pb-24">
        {renderCurrentView()}
      </main>

      {/* Floating Bottom Navigation */}
      {currentView !== 'analytics' && !bookPopupOpen && !voicePopupOpen && (
        <nav className={`fixed bottom-0 left-0 w-full z-50 bottom-navbar transition-transform duration-500 ${timerActive ? 'translate-y-full' : 'translate-y-0'}`}>
          <div className={`bg-emerald-900/90 backdrop-blur-sm px-2 py-2 ${timerActive ? '' : 'border-t border-emerald-700 shadow-2xl'}`}>
            <div className="max-w-md mx-auto w-full flex items-center justify-between space-x-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSetCurrentView(item.id as View)}
                    className={`flex-1 min-w-0 flex flex-col items-center px-3 py-2 rounded-2xl transition-all duration-200 ${isActive
                      ? 'bg-emerald-400 text-emerald-900'
                      : 'text-emerald-200 hover:bg-emerald-800/60'
                      }`}
                    title={item.label}
                    style={{ position: 'relative' }}
                    disabled={timerActive} // Disable nav buttons when timer is active
                  >
                    <span style={{ position: 'relative', display: 'inline-block' }}>
                      <Icon size={20} />
                      {item.id === 'settings' && hasFriendNotifications && (
                        <span style={{ position: 'absolute', top: -4, right: -4, width: 10, height: 10, background: '#ef4444', borderRadius: '50%', zIndex: 10 }} />
                      )}
                    </span>
                    {isActive && (
                      <span className="text-xs mt-1 font-medium">{item.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}

export default App;