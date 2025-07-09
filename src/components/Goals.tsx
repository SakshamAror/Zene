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
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 mt-6 mb-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-2">GOALS</h1>
        <div className="w-full flex justify-center">
          <div className="h-px w-full max-w-lg bg-emerald-400/30 mt-4 mb-2"></div>
        </div>
      </div>

      {/* Add New Goal */}
      <div className="opal-card p-4 sm:p-6">
        <form onSubmit={handleAddGoal} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <input
            type="text"
            value={newGoal}
            onChange={(e) => setNewGoal(e.target.value)}
            placeholder="What would you like to achieve?"
            className="opal-input flex-1 text-sm sm:text-base"
            disabled={saving}
          />
          <button
            type="submit"
            disabled={!newGoal.trim() || saving}
            className="opal-button flex items-center justify-center space-x-2 px-4 sm:px-6 py-3 sm:py-4 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Plus size={18} />
                <span className="hidden sm:inline">Add Goal</span>
                <span className="sm:hidden">Add</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Progress Overview */}
      <div className="opal-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="mobile-text-xl font-bold text-primary">Progress</h2>
          <ChevronRight size={20} className="text-secondary" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{pendingGoals.length}</div>
            <div className="text-sm text-secondary">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">{completedGoals.length}</div>
            <div className="text-sm text-secondary">Completed</div>
          </div>
        </div>

        {goals.length > 0 && (
          <div className="mt-4">
            <div className="progress-bar h-2">
              <div
                className="progress-fill h-full"
                style={{ width: `${(completedGoals.length / goals.length) * 100}%` }}
              />
            </div>
            <div className="text-center mt-2 text-sm text-secondary">
              {Math.round((completedGoals.length / goals.length) * 100)}% Complete
            </div>
          </div>
        )}
      </div>

      {/* Goals List */}
      <div className="space-y-6">
        {/* Pending Goals */}
        <div className="opal-card p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="icon-bg icon-bg-blue">
              <Target size={20} />
            </div>
            <h2 className="mobile-text-xl font-bold text-primary">
              In Progress ({pendingGoals.length})
            </h2>
          </div>

          {pendingGoals.length > 0 ? (
            <div className="space-y-3">
              {pendingGoals.map((goal) => (
                <div
                  key={goal.id}
                  className="flex items-center space-x-3 p-4 opal-card-dark rounded-2xl"
                >
                  <button
                    onClick={() => goal.id && handleToggleGoal(goal.id, goal.completed)}
                    className="w-6 h-6 border-2 border-secondary rounded-full hover:border-emerald-400 transition-colors flex items-center justify-center flex-shrink-0"
                  >
                    {goal.completed && <Check size={16} className="text-emerald-400" />}
                  </button>
                  <span className="flex-1 text-primary text-sm sm:text-base break-words">{goal.goal}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="mx-auto text-secondary mb-4" size={48} />
              <p className="text-secondary">No goals yet</p>
              <p className="text-sm text-tertiary">Add your first goal above</p>
            </div>
          )}
        </div>

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <div className="opal-card p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="icon-bg icon-bg-emerald">
                <Check size={20} />
              </div>
              <h2 className="mobile-text-xl font-bold text-primary">
                Completed ({completedGoals.length})
              </h2>
            </div>

            <div className="space-y-3">
              {completedGoals.map((goal) => (
                <div
                  key={goal.id}
                  className="flex items-center space-x-3 p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20"
                >
                  <button
                    onClick={() => goal.id && handleToggleGoal(goal.id, goal.completed)}
                    className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0"
                  >
                    <Check size={16} className="text-black" />
                  </button>
                  <span className="flex-1 text-secondary line-through text-sm sm:text-base break-words">
                    {goal.goal}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}