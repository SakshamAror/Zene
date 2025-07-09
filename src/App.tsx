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
      <main className="flex-1 mobile-padding py-6 pb-28 safe-area-top">
        <div className="max-w-6xl mx-auto">
          {renderCurrentView()}
        </div>
      </main>

      {/* Sync Indicator (mobile only) */}
      <SyncIndicator userId={user.id} />

      {/* Floating Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full z-40 flex justify-center" style={{ margin: 0, padding: 0 }}>
        <div className="w-full sm:w-auto sm:max-w-xl md:max-w-2xl lg:max-w-3xl flex justify-center">
          <div className="flex-1 flex justify-center bg-emerald-900 border-t border-emerald-600 shadow-[0_-2px_16px_0_rgba(16,185,129,0.10)] sm:rounded-t-2xl sm:rounded-b-none rounded-none" style={{ marginBottom: 0, minHeight: '84px', paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}>
            <div className="flex flex-row w-full sm:w-auto justify-between items-center px-2 sm:px-6 py-4">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id as View)}
                    className={`flex flex-col items-center flex-1 px-2 py-1 transition-all duration-150 ${isActive ? 'text-emerald-200 font-bold' : 'text-emerald-100'} group`}
                    style={{ position: 'relative' }}
                    title={item.label}
                  >
                    <div className={`flex items-center justify-center w-10 h-10 rounded-xl mb-1 ${isActive ? 'bg-emerald-800 border-b-4 border-emerald-300' : ''}`}
                      style={isActive ? { boxShadow: '0 2px 12px #6ee7b733' } : {}}>
                      <Icon size={28} />
                    </div>
                    <span className={`text-sm mt-0.5 ${isActive ? 'text-emerald-100' : 'text-emerald-100/90'} transition-all font-semibold`}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}

export default App;