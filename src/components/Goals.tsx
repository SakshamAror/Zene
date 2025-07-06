import React, { useState, useEffect } from 'react';
import { Plus, Check, Target } from 'lucide-react';
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
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Goals</h1>
        <p className="text-slate-600 dark:text-slate-400">Set intentions and track your progress</p>
      </div>

      {/* Add New Goal */}
      <div className="zene-card rounded-2xl p-6 border zene-border">
        <form onSubmit={handleAddGoal} className="flex space-x-4">
          <input
            type="text"
            value={newGoal}
            onChange={(e) => setNewGoal(e.target.value)}
            placeholder="What would you like to achieve?"
            className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
            disabled={saving}
          />
          <button
            type="submit"
            disabled={!newGoal.trim() || saving}
            className={`flex items-center space-x-2 px-6 py-3 text-white rounded-xl transition-colors
              bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-400
              shadow-[0_0_16px_2px_rgba(16,185,129,0.4)]
              disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed`}
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
      <div className="grid md:grid-cols-2 gap-6">
        {/* Pending Goals */}
        <div className="zene-card rounded-2xl p-6 border zene-border">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Target className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              In Progress ({pendingGoals.length})
            </h2>
          </div>

          {pendingGoals.length > 0 ? (
            <div className="space-y-3">
              {pendingGoals.map((goal) => (
                <div
                  key={goal.id}
                  className="flex items-center space-x-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl"
                >
                  <button
                    onClick={() => goal.id && handleToggleGoal(goal.id, goal.completed)}
                    className="w-6 h-6 border-2 border-slate-300 dark:border-slate-600 rounded-full hover:border-emerald-500 dark:hover:border-emerald-400 transition-colors flex items-center justify-center"
                  >
                    {goal.completed && <Check size={16} className="text-emerald-600" />}
                  </button>
                  <span className="flex-1 text-slate-900 dark:text-white">{goal.goal}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="mx-auto text-slate-400 dark:text-slate-500 mb-4" size={48} />
              <p className="text-slate-500 dark:text-slate-400">No goals yet</p>
              <p className="text-sm text-slate-400 dark:text-slate-500">Add your first goal above</p>
            </div>
          )}
        </div>

        {/* Completed Goals */}
        <div className="zene-card rounded-2xl p-6 border zene-border">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
              <Check className="text-emerald-600 dark:text-emerald-400" size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Completed ({completedGoals.length})
            </h2>
          </div>

          {completedGoals.length > 0 ? (
            <div className="space-y-3">
              {completedGoals.map((goal) => (
                <div
                  key={goal.id}
                  className="flex items-center space-x-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl"
                >
                  <button
                    onClick={() => goal.id && handleToggleGoal(goal.id, goal.completed)}
                    className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center"
                  >
                    <Check size={16} className="text-white" />
                  </button>
                  <span className="flex-1 text-slate-700 dark:text-slate-300 line-through">
                    {goal.goal}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Check className="mx-auto text-slate-400 dark:text-slate-500 mb-4" size={48} />
              <p className="text-slate-500 dark:text-slate-400">No completed goals</p>
              <p className="text-sm text-slate-400 dark:text-slate-500">Complete your first goal!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}