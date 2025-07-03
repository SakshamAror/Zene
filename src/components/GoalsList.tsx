import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getGoals, saveGoal, updateGoal } from '../lib/saveData';
import type { Goal } from '../types';

interface GoalsListProps {
  userId: string;
}

export default function GoalsList({ userId }: GoalsListProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoalText, setNewGoalText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadGoals();
  }, [userId]);

  const loadGoals = async () => {
    try {
      const userGoals = await getGoals(userId);
      setGoals(userGoals);
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  };

  const handleAddGoal = async () => {
    if (!newGoalText.trim()) return;

    setLoading(true);
    try {
      await saveGoal({
        user_id: userId,
        goal: newGoalText.trim(),
        completed: false,
        date_created: new Date().toISOString().split('T')[0],
      });
      
      setNewGoalText('');
      await loadGoals();
    } catch (error) {
      console.error('Error saving goal:', error);
      Alert.alert('Error', 'Failed to save goal');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGoal = async (goal: Goal) => {
    try {
      await updateGoal(goal.id!, { completed: !goal.completed });
      await loadGoals();
    } catch (error) {
      console.error('Error updating goal:', error);
      Alert.alert('Error', 'Failed to update goal');
    }
  };

  return (
    <View className="space-y-4">
      {/* Add New Goal */}
      <View className="flex-row space-x-2">
        <TextInput
          value={newGoalText}
          onChangeText={setNewGoalText}
          placeholder="Add a new goal..."
          placeholderTextColor="#fbbf24"
          className="flex-1 px-3 py-2 border border-amber-200 rounded-lg text-amber-800"
        />
        <Pressable
          onPress={handleAddGoal}
          disabled={loading || !newGoalText.trim()}
          className="bg-amber-600 px-4 py-2 rounded-lg justify-center disabled:opacity-50"
        >
          <Ionicons name="add" size={20} color="white" />
        </Pressable>
      </View>

      {/* Goals List */}
      <View className="space-y-2">
        {goals.map((goal) => (
          <Pressable
            key={goal.id}
            onPress={() => handleToggleGoal(goal)}
            className="flex-row items-center space-x-3 p-3 bg-amber-25 rounded-lg"
          >
            <View
              className={`w-6 h-6 rounded-full border-2 ${
                goal.completed
                  ? 'bg-amber-600 border-amber-600'
                  : 'border-amber-300'
              } items-center justify-center`}
            >
              {goal.completed && (
                <Ionicons name="checkmark" size={16} color="white" />
              )}
            </View>
            <Text
              className={`flex-1 ${
                goal.completed
                  ? 'text-amber-600 line-through'
                  : 'text-amber-800'
              } font-medium`}
            >
              {goal.goal}
            </Text>
          </Pressable>
        ))}
        
        {goals.length === 0 && (
          <Text className="text-amber-600 text-center py-4">
            No goals yet. Add your first goal above!
          </Text>
        )}
      </View>
    </View>
  );
}