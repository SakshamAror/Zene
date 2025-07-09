import React, { useState, useEffect } from 'react';
import { Plus, Check, Target, ChevronRight } from 'lucide-react';
import { getGoals, saveGoal, updateGoal } from '../lib/saveData';
import type { Goal } from '../types';

interface GoalsProps {
  userId: string;
}

export default function Goals({ userId }: GoalsProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoal, setNewGoal] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadGoals();
  }, [userId]);

  const loadGoals = async () => {
    try {
      const userGoals = await getGoals(userId);
      setGoals(userGoals);
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.trim() || saving) return;

    setSaving(true);
    try {
      const goalData = {
        user_id: userId,
        goal: newGoal.trim(),
        completed: false,
        date_created: new Date().toISOString().split('T')[0],
      };

      const savedGoal = await saveGoal(goalData);
      if (savedGoal && savedGoal[0]) {
        setGoals(prev => [savedGoal[0], ...prev]);
        setNewGoal('');
      }
    } catch (error) {
      console.error('Error saving goal:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleGoal = async (goalId: number, completed: boolean) => {
    try {
      await updateGoal(goalId, { completed: !completed });
      setGoals(prev => prev.map(goal =>
        goal.id === goalId ? { ...goal, completed: !completed } : goal
      ));
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  const completedGoals = goals.filter(goal => goal.completed);
  const pendingGoals = goals.filter(goal => !goal.completed);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-900 to-emerald-700 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 loading-spinner mx-auto mb-4"></div>
          <p className="text-white/80 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 to-emerald-700 flex flex-col items-center px-6 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-6 animate-float">🎯</div>
        <h1 className="text-3xl font-bold text-white mb-3" style={{ letterSpacing: '-0.03em' }}>
          Your Goals
        </h1>
        <p className="text-white/80 text-lg max-w-sm mx-auto">
          Set intentions and track your progress
        </p>
      </div>

      {/* Progress Overview */}
      <div className="w-full max-w-sm mb-8">
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
      <div className="w-full max-w-sm mb-8">
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

      {/* Goals List */}
      <div className="w-full max-w-sm space-y-6">
        {/* Pending Goals */}
        {pendingGoals.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-white mb-4 text-center">
              In Progress ({pendingGoals.length})
            </h3>
            <div className="space-y-3">
              {pendingGoals.map((goal) => (
                <div
                  key={goal.id}
                  className="flex items-center space-x-3 p-4 bg-emerald-900/60 rounded-2xl border border-emerald-700"
                >
                  <button
                    onClick={() => goal.id && handleToggleGoal(goal.id, goal.completed)}
                    className="w-6 h-6 border-2 border-emerald-400 rounded-full hover:bg-emerald-400/20 transition-colors flex items-center justify-center flex-shrink-0"
                  >
                    {goal.completed && <Check size={16} className="text-emerald-400" />}
                  </button>
                  <span className="flex-1 text-white break-words">{goal.goal}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-white mb-4 text-center">
              Completed ({completedGoals.length})
            </h3>
            <div className="space-y-3">
              {completedGoals.map((goal) => (
                <div
                  key={goal.id}
                  className="flex items-center space-x-3 p-4 bg-emerald-400/20 rounded-2xl border border-emerald-400/30"
                >
                  <button
                    onClick={() => goal.id && handleToggleGoal(goal.id, goal.completed)}
                    className="w-6 h-6 bg-emerald-400 rounded-full flex items-center justify-center flex-shrink-0"
                  >
                    <Check size={16} className="text-emerald-900" />
                  </button>
                  <span className="flex-1 text-emerald-200 line-through break-words">
                    {goal.goal}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {goals.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🌟</div>
            <h3 className="text-xl font-bold text-white mb-2">No goals yet</h3>
            <p className="text-white/70">Add your first goal above to get started</p>
          </div>
        )}
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