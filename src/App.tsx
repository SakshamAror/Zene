import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import AuthForm from './components/AuthForm.tsx';
import Dashboard from './components/Dashboard.tsx';
import MeditationTimer from './components/MeditationTimer.tsx';
import WorkTimer from './components/WorkTimer.tsx';
import Goals from './components/Goals.tsx';
import Journal from './components/Journal.tsx';
import Learn from './components/Learn.tsx';
import Analytics from './components/Analytics.tsx';
import { Home, Clock, Target, BookOpen, PenTool, BarChart3, LogOut, Moon, Sun, Menu, X } from 'lucide-react';

type View = 'dashboard' | 'meditation' | 'work' | 'goals' | 'journal' | 'learn' | 'analytics';

function App() {
  const { user, loading, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
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
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-900 dark:to-orange-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-300 border-t-amber-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-amber-800 dark:text-amber-200 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm onAuthSuccess={() => {}} />;
  }

  const navigationItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'meditation', label: 'Meditate', icon: Clock },
    { id: 'work', label: 'Focus', icon: Target },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'journal', label: 'Journal', icon: PenTool },
    { id: 'learn', label: 'Learn', icon: BookOpen },
    { id: 'analytics', label: 'Insights', icon: BarChart3 },
  ];

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard userId={user.id} />;
      case 'meditation':
        return <MeditationTimer userId={user.id} />;
      case 'work':
        return <WorkTimer userId={user.id} />;
      case 'goals':
        return <Goals userId={user.id} />;
      case 'journal':
        return <Journal userId={user.id} />;
      case 'learn':
        return <Learn userId={user.id} />;
      case 'analytics':
        return <Analytics userId={user.id} />;
      default:
        return <Dashboard userId={user.id} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-900 dark:to-orange-900 notebook-texture">
      {/* Mobile Header */}
      <header className="lg:hidden bg-amber-100/90 dark:bg-amber-800/90 backdrop-blur-sm border-b-2 border-amber-200 dark:border-amber-700 sticky top-0 z-50 notebook-paper">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">Z</span>
              </div>
              <h1 className="text-xl font-bold text-amber-900 dark:text-amber-100 handwriting">Zene</h1>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-amber-200 dark:bg-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-300 dark:hover:bg-amber-600 transition-colors"
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg bg-amber-200 dark:bg-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-300 dark:hover:bg-amber-600 transition-colors"
              >
                {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden lg:block bg-amber-100/90 dark:bg-amber-800/90 backdrop-blur-sm border-b-2 border-amber-200 dark:border-amber-700 sticky top-0 z-50 notebook-paper">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">Z</span>
              </div>
              <h1 className="text-xl font-bold text-amber-900 dark:text-amber-100 handwriting">Zene</h1>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-amber-200 dark:bg-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-300 dark:hover:bg-amber-600 transition-colors"
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                onClick={signOut}
                className="p-2 rounded-lg bg-amber-200 dark:bg-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-300 dark:hover:bg-amber-600 transition-colors"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Mobile Navigation Overlay */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)}>
            <nav className="fixed left-0 top-0 h-full w-64 bg-amber-100/95 dark:bg-amber-800/95 backdrop-blur-sm border-r-2 border-amber-200 dark:border-amber-700 p-4 notebook-paper">
              <div className="pt-16 space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentView(item.id as View);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                        isActive
                          ? 'bg-amber-200 dark:bg-amber-700 text-amber-900 dark:text-amber-100 shadow-md vintage-active'
                          : 'text-amber-800 dark:text-amber-200 hover:bg-amber-200/50 dark:hover:bg-amber-700/50 hover:text-amber-900 dark:hover:text-amber-100'
                      }`}
                    >
                      <Icon size={20} />
                      <span className="font-medium handwriting">{item.label}</span>
                    </button>
                  );
                })}
                
                <div className="pt-4 border-t border-amber-300 dark:border-amber-600">
                  <button
                    onClick={signOut}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 text-amber-800 dark:text-amber-200 hover:bg-amber-200/50 dark:hover:bg-amber-700/50"
                  >
                    <LogOut size={20} />
                    <span className="font-medium handwriting">Sign Out</span>
                  </button>
                </div>
              </div>
            </nav>
          </div>
        )}

        {/* Desktop Sidebar Navigation */}
        <nav className="hidden lg:block w-64 bg-amber-100/50 dark:bg-amber-800/50 backdrop-blur-sm border-r-2 border-amber-200 dark:border-amber-700 min-h-[calc(100vh-4rem)] p-4 notebook-paper">
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id as View)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                    isActive
                      ? 'bg-amber-200 dark:bg-amber-700 text-amber-900 dark:text-amber-100 shadow-md vintage-active'
                      : 'text-amber-800 dark:text-amber-200 hover:bg-amber-200/50 dark:hover:bg-amber-700/50 hover:text-amber-900 dark:hover:text-amber-100'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium handwriting">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6">
          <div className="max-w-6xl mx-auto">
            {renderCurrentView()}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-amber-100/95 dark:bg-amber-800/95 backdrop-blur-sm border-t-2 border-amber-200 dark:border-amber-700 p-2 notebook-paper">
        <div className="flex justify-around">
          {navigationItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as View)}
                className={`flex flex-col items-center space-y-1 px-2 py-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-amber-200 dark:bg-amber-700 text-amber-900 dark:text-amber-100'
                    : 'text-amber-700 dark:text-amber-300 hover:bg-amber-200/50 dark:hover:bg-amber-700/50'
                }`}
              >
                <Icon size={18} />
                <span className="text-xs font-medium handwriting">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Bottom padding for mobile navigation */}
      <div className="lg:hidden h-20"></div>
    </div>
  );
}

export default App;