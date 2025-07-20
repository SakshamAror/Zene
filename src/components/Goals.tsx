import React, { useState, useEffect, useRef } from 'react';
import { Plus, Check, Target, ChevronRight, Trash2 } from 'lucide-react';
import { getGoals, saveGoal, updateGoal, deleteGoal } from '../lib/saveData';
import type { Goal } from '../types';
import { offlineStorage } from '../lib/offlineStorage';
import { Emoji } from './Emoji';

interface GoalsProps {
  userId: string;
  needsInitialGoals?: boolean;
  onFirstGoal?: () => void;
}

export default function Goals({ userId, needsInitialGoals = false, onFirstGoal }: GoalsProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoal, setNewGoal] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const [togglingId, setTogglingId] = useState<number | string | null>(null);
  const [showFirstGoalModal, setShowFirstGoalModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGoals();
  }, [userId]);

  // Add page visibility listener to sync when user returns to app
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && userId && offlineStorage && typeof offlineStorage.forceSync === 'function') {
        // Sync when user returns to the app
        offlineStorage.forceSync(userId).catch(error => {
          console.error('Error during visibility change sync:', error);
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId]);

  // Add beforeunload listener to sync before user leaves page
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (userId && offlineStorage && typeof offlineStorage.forceSync === 'function') {
        // Force sync before user leaves (this is synchronous to prevent navigation)
        offlineStorage.syncWithServer().catch(error => {
          console.error('Error during beforeunload sync:', error);
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [userId]);

  useEffect(() => {
    if (needsInitialGoals && goals.length === 0) {
      setShowFirstGoalModal(true);
    } else {
      setShowFirstGoalModal(false);
    }
  }, [needsInitialGoals, goals.length]);

  const loadGoals = async () => {
    try {
      setLoading(true);
      setError(null);
      let userGoals = await getGoals(userId);

      // If any temp IDs are present, prefer local storage
      if (userGoals.some(g => typeof g.id === 'string' && g.id.startsWith('temp_'))) {
        if (typeof offlineStorage.getGoals === 'function') {
          const localGoals = await offlineStorage.getGoals(userId, { localOnly: true });
          userGoals = localGoals;
        }
      }
      setGoals(userGoals);
    } catch (error) {
      console.error('Error loading goals:', error);
      setError('Failed to load goals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.trim() || saving) return;

    setSaving(true);
    setError(null);
    try {
      const goalData = {
        user_id: userId,
        goal: newGoal.trim(),
        completed: false,
        timestamp: new Date().toISOString(),
      };

      const savedGoals = await saveGoal(goalData);

      // Update state with the new goal(s)
      if (savedGoals && savedGoals.length > 0) {
        const newGoalItem = savedGoals[0];
        setGoals(prev => [newGoalItem, ...prev]);
        setNewGoal('');

        if (needsInitialGoals && onFirstGoal) {
          onFirstGoal();
        }
      }

      // Force immediate sync for critical operations
      if (offlineStorage && typeof offlineStorage.forceSync === 'function' && userId) {
        // Use setTimeout to ensure the save operation completes first
        setTimeout(() => {
          offlineStorage.forceSync(userId).catch(error => {
            console.error('Error during force sync:', error);
          });
        }, 100);
      }
    } catch (error) {
      console.error('Error adding goal:', error);
      setError('Failed to add goal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleGoal = async (goalId: number | string, currentCompleted: boolean) => {
    if (!goalId) return;

    // Prevent multiple clicks
    if (togglingId === goalId) return;

    setTogglingId(goalId);
    setError(null);

    try {
      await updateGoal(goalId, { completed: !currentCompleted });

      // Update state optimistically
      setGoals(prev => prev.map(goal =>
        goal.id === goalId ? { ...goal, completed: !currentCompleted } : goal
      ));

      // Force immediate sync for critical operations
      if (offlineStorage && typeof offlineStorage.forceSync === 'function' && userId) {
        // Use setTimeout to ensure the update operation completes first
        setTimeout(() => {
          offlineStorage.forceSync(userId).catch(error => {
            console.error('Error during force sync:', error);
          });
        }, 100);
      }
    } catch (error) {
      console.error('Error toggling goal:', error);
      setError('Failed to update goal. Please try again.');
      // Revert optimistic update on error
      await loadGoals();
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteGoal = async (goalId: number | string) => {
    if (!goalId) return;

    // Prevent multiple clicks
    if (deletingId === goalId) return;

    setDeletingId(goalId);
    setError(null);

    try {
      await deleteGoal(goalId);

      // Update state optimistically
      setGoals(prev => prev.filter(goal => goal.id !== goalId));

      // Force immediate sync for critical operations
      if (offlineStorage && typeof offlineStorage.forceSync === 'function' && userId) {
        // Use setTimeout to ensure the delete operation completes first
        setTimeout(() => {
          offlineStorage.forceSync(userId).catch(error => {
            console.error('Error during force sync:', error);
          });
        }, 100);
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
      setError('Failed to delete goal. Please try again.');
      // Revert optimistic update on error
      await loadGoals();
    } finally {
      setDeletingId(null);
    }
  };

  const completedGoals = goals.filter(goal => goal.completed);
  const pendingGoals = goals.filter(goal => !goal.completed);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 loading-spinner mx-auto mb-4"></div>
          <p className="text-white/80 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 md:px-12 lg:px-24 py-10">
      {/* First Goal Modal/Overlay */}
      {showFirstGoalModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
            <div className="bg-emerald-900 rounded-2xl p-8 shadow-2xl border border-emerald-400 max-w-xs w-full text-center">
              <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Emoji emoji="🎯" png="goal.png" alt="goal" className="w-16 h-16 object-contain" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Set your first goal!</h2>
              <p className="text-white/80 mb-4">What would you like to achieve? Setting your goals sets a clear path ahead of you.</p>
              <button
                className="mt-2 px-6 py-2 rounded-xl bg-emerald-400 text-emerald-900 font-bold text-base shadow-lg active:bg-emerald-300 transition"
                onClick={() => {
                  // Focus the input field
                  const input = document.querySelector<HTMLInputElement>('input[placeholder="What would you like to achieve?"]');
                  if (input) input.focus();
                  setShowFirstGoalModal(false);
                }}
              >
                Start Writing
              </button>
            </div>
          </div>
          {/* Darken navbar as well */}
          <style>{`.bottom-navbar { filter: brightness(0.5) !important; }`}</style>
        </>
      )}
      <div className="w-full max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4 animate-float">
            <Emoji emoji="🎯" png="goal.png" alt="goal" size="3xl" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Goals</h1>
          <p className="text-white/80 text-lg max-w-md">Set, track, and achieve your goals</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-2xl">
            <p className="text-red-400 text-center">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-red-300 text-sm hover:text-red-200"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Goal Input/Editor */}
          <div>
            {/* Progress Overview */}
            <div className="w-full mb-8">
              <div className="bg-emerald-900/60 rounded-2xl p-6 border border-emerald-700">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{pendingGoals.length}</div>
                    <div className="text-sm text-emerald-300">In Progress</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-400">{completedGoals.length}</div>
                    <div className="text-sm text-emerald-300">Completed</div>
                  </div>
                </div>

                {goals.length > 0 && (
                  <div>
                    <div className="h-2 bg-emerald-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${(completedGoals.length / goals.length) * 100}%` }}
                      />
                    </div>
                    <div className="text-center mt-2 text-sm text-emerald-300">
                      {Math.round((completedGoals.length / goals.length) * 100)}% Complete
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Add New Goal */}
            <div className="w-full mb-8">
              <form onSubmit={handleAddGoal} className="space-y-4">
                <input
                  type="text"
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  placeholder="What would you like to achieve?"
                  className="w-full py-4 px-6 bg-emerald-900/60 text-white placeholder-emerald-300 rounded-2xl border border-emerald-700 focus:outline-none focus:border-emerald-400 transition"
                  disabled={saving}
                />
                <button
                  type="submit"
                  disabled={!newGoal.trim() || saving}
                  className="w-full py-4 px-6 bg-emerald-400 text-emerald-900 font-bold text-lg rounded-2xl shadow-lg active:bg-emerald-300 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-emerald-900 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Plus size={20} />
                      <span>Add Goal</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Goals List */}
          <div>
            {/* Pending Goals */}
            {pendingGoals.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-white mb-4 text-center">
                  In Progress ({pendingGoals.length})
                </h3>
                <div className="space-y-3">
                  {pendingGoals.map((goal) => {
                    const { id } = goal;
                    return (
                      <div
                        key={id}
                        className="flex items-center space-x-3 p-4 bg-emerald-900/60 rounded-2xl border border-emerald-700"
                      >
                        <button
                          onClick={() => id && handleToggleGoal(id, goal.completed)}
                          className="w-6 h-6 border-2 border-emerald-400 rounded-full hover:bg-emerald-400/20 transition-colors flex items-center justify-center flex-shrink-0"
                          disabled={togglingId === id || deletingId === id}
                        >
                          {togglingId === id ? (
                            <svg className="animate-spin h-4 w-4 text-emerald-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
                          ) : (
                            goal.completed && <Check size={16} className="text-emerald-400" />
                          )}
                        </button>
                        <span className="flex-1 text-white break-words">{goal.goal}</span>
                        {id && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteGoal(id);
                            }}
                            className="p-2 rounded-full hover:bg-red-500/20 transition-colors text-red-400 hover:text-red-300 disabled:opacity-40 disabled:cursor-not-allowed"
                            disabled={deletingId === id || togglingId === id}
                            aria-label="Delete goal"
                            title="Delete goal"
                          >
                            {deletingId === id ? (
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-white my-4 text-center">
                  Completed ({completedGoals.length})
                </h3>
                <div className="space-y-3">
                  {completedGoals.map((goal) => {
                    const { id } = goal;
                    return (
                      <div
                        key={id}
                        className="flex items-center space-x-3 p-4 bg-emerald-400/20 rounded-2xl border border-emerald-400/30"
                      >
                        <button
                          onClick={() => id && handleToggleGoal(id, goal.completed)}
                          className="w-6 h-6 bg-emerald-400 rounded-full flex items-center justify-center flex-shrink-0"
                          disabled={togglingId === id || deletingId === id}
                        >
                          {togglingId === id ? (
                            <svg className="animate-spin h-4 w-4 text-emerald-900" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
                          ) : (
                            <Check size={16} className="text-emerald-900" />
                          )}
                        </button>
                        <span className="flex-1 text-emerald-200 line-through break-words">
                          {goal.goal}
                        </span>
                        {id && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteGoal(id);
                            }}
                            className="p-2 rounded-full hover:bg-red-500/20 transition-colors text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={deletingId === id || togglingId === id}
                            aria-label="Delete goal"
                            title="Delete goal"
                          >
                            {deletingId === id ? (
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {goals.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Emoji emoji="⭐️" png="star.png" alt="star" className="w-16 h-16 object-contain" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No goals yet</h3>
                <p className="text-white/70">Add your first goal above to get started</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Motivational Footer */}
      <div className="mt-12 text-center">
        <p className="text-white/60 text-sm">
          Every goal achieved is a step towards greatness.
        </p>
      </div>
    </div>
  );
}