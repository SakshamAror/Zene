import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import AuthForm from './components/AuthForm.tsx';
import Dashboard from './components/Dashboard.tsx';
import Timers from './components/Timers.tsx';
import Goals from './components/Goals.tsx';
import Journal from './components/Journal.tsx';
import Learn from './components/Learn.tsx';
import Analytics from './components/Analytics.tsx';
import { Home, Clock, Target, BookOpen, PenTool, BarChart3, Settings as SettingsIcon } from 'lucide-react';
import Settings from './components/Settings';
import Onboarding from './components/Onboarding';
import SyncIndicator from './components/SyncIndicator';
import { getUserPrefs, upsertUserPrefs, saveMeditationSession, getMeditationSessions, getWorkSessions } from './lib/saveData';
import type { MeditationSession, WorkSession } from './types';

type View = 'dashboard' | 'timers' | 'goals' | 'journal' | 'learn' | 'analytics' | 'settings';

function App() {
  const { user, loading, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [darkMode, setDarkMode] = useState(true); // Default to dark mode for Opal style
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

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
    console.log('user:', user);
    if (user) {
      getUserPrefs(user.id).then(prefs => {
        console.log('prefs:', prefs);
        setShowOnboarding(!prefs || prefs.onboarded !== true);
      }).catch((e) => {
        console.error('getUserPrefs error:', e);
        setShowOnboarding(false);
      });
    } else {
      setShowOnboarding(false);
    }
  }, [user]);

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
      const hasGoal = meditations.some(m => m.date === dateStr && m.length > 0) ||
        workSessions.some(w => w.date === dateStr && w.length > 0);
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
            date: new Date().toISOString().split('T')[0],
          });
        }
      }
      setShowOnboarding(false);
    }
  };

  console.log('App render', { loading, showOnboarding, user });

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
    return <Onboarding onComplete={handleOnboardingComplete} />;
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
    switch (currentView) {
      case 'dashboard':
        return <Dashboard userId={user.id} user={user} setCurrentView={setCurrentView} />;
      case 'timers':
        return <Timers userId={user.id} />;
      case 'goals':
        return <Goals userId={user.id} />;
      case 'journal':
        return <Journal userId={user.id} />;
      case 'learn':
        return <Learn userId={user.id} />;
      case 'settings':
        return <Settings user={user} signOut={signOut} />;
      default:
        return <Dashboard userId={user.id} user={user} setCurrentView={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen opal-bg">
      {/* Main Content */}
      <main className="flex-1 pb-28">
        {renderCurrentView()}
      </main>

      {/* Sync Indicator (mobile only) */}
      <SyncIndicator userId={user.id} />

      {/* Floating Bottom Navigation */}
      <nav className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
        <div className="bg-emerald-900/90 backdrop-blur-sm border border-emerald-700 rounded-3xl shadow-2xl px-2 py-2">
          <div className="flex items-center space-x-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id as View)}
                    className={`flex flex-col items-center px-3 py-2 rounded-2xl transition-all duration-200 ${
                      isActive 
                        ? 'bg-emerald-400 text-emerald-900' 
                        : 'text-emerald-200 hover:bg-emerald-800/60'
                    }`}
                    title={item.label}
                  >
                    <Icon size={20} />
                    <span className="text-xs mt-1 font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
      </nav>
    </div>
  );
}

export default App;