import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
import { Plus, Check } from 'lucide-react-native';
import { getGoals, saveGoal, updateGoal } from "../lib/saveData';
import type { Goal } from '@/types';

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
    <View style={styles.container}>
      {/* Add New Goal */}
      <View style={styles.addGoalContainer}>
        <TextInput
          value={newGoalText}
          onChangeText={setNewGoalText}
          placeholder="Add a new goal..."
          placeholderTextColor="#fbbf24"
          style={styles.goalInput}
        />
        <Pressable
          onPress={handleAddGoal}
          disabled={loading || !newGoalText.trim()}
          style={[styles.addButton, (loading || !newGoalText.trim()) && styles.addButtonDisabled]}
        >
          <Plus size={20} color="white" />
        </Pressable>
      </View>

      {/* Goals List */}
      <View style={styles.goalsList}>
        {goals.map((goal) => (
          <Pressable
            key={goal.id}
            onPress={() => handleToggleGoal(goal)}
            style={styles.goalItem}
          >
            <View
              style={[
                styles.goalCheckbox,
                goal.completed && styles.goalCheckboxCompleted,
              ]}
            >
              {goal.completed && (
                <Check size={16} color="white" />
              )}
            </View>
            <Text
              style={[
                styles.goalText,
                goal.completed && styles.goalTextCompleted,
              ]}
            >
              {goal.goal}
            </Text>
          </Pressable>
        ))}
        
        {goals.length === 0 && (
          <Text style={styles.emptyText}>
            No goals yet. Add your first goal above!
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  addGoalContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  goalInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 8,
    color: '#92400e',
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#d97706',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  goalsList: {
    gap: 8,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#fffdf7',
    borderRadius: 8,
  },
  goalCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fcd34d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalCheckboxCompleted: {
    backgroundColor: '#d97706',
    borderColor: '#d97706',
  },
  goalText: {
    flex: 1,
    color: '#92400e',
    fontWeight: '500',
    fontSize: 16,
  },
  goalTextCompleted: {
    color: '#d97706',
    textDecorationLine: 'line-through',
  },
  emptyText: {
    color: '#d97706',
    textAlign: 'center',
    paddingVertical: 16,
    fontSize: 16,
  },
});