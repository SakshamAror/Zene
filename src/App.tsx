import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import AuthForm from './components/AuthForm.tsx';
import Dashboard from './components/Dashboard.tsx';
import Timers from './components/Timers.tsx';
import Goals from './components/Goals.tsx';
import Journal from './components/Journal.tsx';
import Learn from './components/Learn.tsx';
import Analytics from './components/Analytics.tsx';
import { Home, Clock, Target, BookOpen, PenTool, BarChart3 } from 'lucide-react';

type View = 'dashboard' | 'timers' | 'goals' | 'journal' | 'learn' | 'analytics';

function App() {
  const { user, loading, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [darkMode, setDarkMode] = useState(true); // Default to dark mode for Opal style

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

  if (loading) {
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

  const navigationItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'timers', label: 'Focus', icon: Clock },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'journal', label: 'Journal', icon: PenTool },
    { id: 'learn', label: 'Learn', icon: BookOpen },
    { id: 'analytics', label: 'Insights', icon: BarChart3 },
  ];

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard userId={user.id} user={user} />;
      case 'timers':
        return <Timers userId={user.id} />;
      case 'goals':
        return <Goals userId={user.id} />;
      case 'journal':
        return <Journal userId={user.id} />;
      case 'learn':
        return <Learn userId={user.id} />;
      case 'analytics':
        return <Analytics userId={user.id} />;
      default:
        return <Dashboard userId={user.id} user={user} />;
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

      {/* Floating Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 z-40 safe-area-bottom">
        <div className="floating-nav-container">
          <div className="flex space-x-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id as View)}
                  className={`floating-nav-item ${isActive ? 'active' : ''}`}
                  title={item.label}
                >
                  <Icon size={20} />
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