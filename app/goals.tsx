import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Plus, Target, Check, X } from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import AuthForm from '../components/AuthForm';

interface Goal {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  date_created: string;
}

export default function GoalsScreen() {
  const { user, loading } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadGoals();
    }
  }, [user]);

  const loadGoals = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('date_created', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  };

  const addGoal = async () => {
    if (!user || !newGoalTitle.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          title: newGoalTitle.trim(),
          description: newGoalDescription.trim() || null,
          completed: false,
        });

      if (error) throw error;
      
      setNewGoalTitle('');
      setNewGoalDescription('');
      setShowAddModal(false);
      loadGoals();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleGoalCompletion = async (goalId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('goals')
        .update({ completed: !completed })
        .eq('id', goalId);

      if (error) throw error;
      loadGoals();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const deleteGoal = async (goalId: string) => {
    Alert.alert(
      'Delete Goal',
      'Are you sure you want to delete this goal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('goals')
                .delete()
                .eq('id', goalId);

              if (error) throw error;
              loadGoals();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={['#000000', '#1a1a1a']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!user) {
    return <AuthForm onAuthSuccess={() => {}} />;
  }

  const completedGoals = goals.filter(goal => goal.completed);
  const activeGoals = goals.filter(goal => !goal.completed);

  return (
    <LinearGradient colors={['#000000', '#1a1a1a']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity>
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Goals</Text>
          <TouchableOpacity onPress={() => setShowAddModal(true)}>
            <Plus size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.statsContainer}>
            <LinearGradient colors={['#333333', '#2a2a2a']} style={styles.statCard}>
              <Target size={24} color="#4ECDC4" />
              <Text style={styles.statNumber}>{activeGoals.length}</Text>
              <Text style={styles.statLabel}>Active Goals</Text>
            </LinearGradient>
            
            <LinearGradient colors={['#333333', '#2a2a2a']} style={styles.statCard}>
              <Check size={24} color="#4ECDC4" />
              <Text style={styles.statNumber}>{completedGoals.length}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </LinearGradient>
          </View>

          {activeGoals.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Active Goals</Text>
              {activeGoals.map((goal) => (
                <LinearGradient
                  key={goal.id}
                  colors={['#333333', '#2a2a2a']}
                  style={styles.goalCard}
                >
                  <View style={styles.goalHeader}>
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() => toggleGoalCompletion(goal.id, goal.completed)}
                    >
                      <View style={styles.checkboxInner} />
                    </TouchableOpacity>
                    <View style={styles.goalContent}>
                      <Text style={styles.goalTitle}>{goal.title}</Text>
                      {goal.description && (
                        <Text style={styles.goalDescription}>{goal.description}</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteGoal(goal.id)}
                    >
                      <X size={16} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              ))}
            </View>
          )}

          {completedGoals.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Completed Goals</Text>
              {completedGoals.map((goal) => (
                <LinearGradient
                  key={goal.id}
                  colors={['#2a2a2a', '#1a1a1a']}
                  style={styles.goalCard}
                >
                  <View style={styles.goalHeader}>
                    <TouchableOpacity
                      style={[styles.checkbox, styles.checkboxCompleted]}
                      onPress={() => toggleGoalCompletion(goal.id, goal.completed)}
                    >
                      <Check size={12} color="#000000" />
                    </TouchableOpacity>
                    <View style={styles.goalContent}>
                      <Text style={[styles.goalTitle, styles.goalTitleCompleted]}>
                        {goal.title}
                      </Text>
                      {goal.description && (
                        <Text style={[styles.goalDescription, styles.goalDescriptionCompleted]}>
                          {goal.description}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteGoal(goal.id)}
                    >
                      <X size={16} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              ))}
            </View>
          )}

          {goals.length === 0 && (
            <View style={styles.emptyContainer}>
              <Target size={48} color="#666666" />
              <Text style={styles.emptyTitle}>No goals yet</Text>
              <Text style={styles.emptyText}>
                Set your first goal to start your journey
              </Text>
              <TouchableOpacity
                style={styles.addFirstGoalButton}
                onPress={() => setShowAddModal(true)}
              >
                <Text style={styles.addFirstGoalButtonText}>Add Your First Goal</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        <Modal
          visible={showAddModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAddModal(false)}
        >
          <View style={styles.modalOverlay}>
            <LinearGradient colors={['#333333', '#2a2a2a']} style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add New Goal</Text>
              
              <TextInput
                style={styles.modalInput}
                placeholder="Goal title"
                placeholderTextColor="#666666"
                value={newGoalTitle}
                onChangeText={setNewGoalTitle}
              />
              
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Description (optional)"
                placeholderTextColor="#666666"
                value={newGoalDescription}
                onChangeText={setNewGoalDescription}
                multiline
                numberOfLines={3}
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowAddModal(false)}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalAddButton, saving && styles.modalAddButtonDisabled]}
                  onPress={addGoal}
                  disabled={saving || !newGoalTitle.trim()}
                >
                  <Text style={styles.modalAddButtonText}>
                    {saving ? 'Adding...' : 'Add Goal'}
                  </Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 8,
    marginBottom: 4,
    fontFamily: 'Inter-SemiBold',
  },
  statLabel: {
    fontSize: 12,
    color: '#888888',
    fontFamily: 'Inter-Regular',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
    fontFamily: 'Inter-SemiBold',
  },
  goalCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4ECDC4',
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  checkboxCompleted: {
    backgroundColor: '#4ECDC4',
  },
  goalContent: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    fontFamily: 'Inter-SemiBold',
  },
  goalTitleCompleted: {
    color: '#888888',
    textDecorationLine: 'line-through',
  },
  goalDescription: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
    fontFamily: 'Inter-Regular',
  },
  goalDescriptionCompleted: {
    color: '#666666',
  },
  deleteButton: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'Inter-SemiBold',
  },
  emptyText: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Inter-Regular',
  },
  addFirstGoalButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  addFirstGoalButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Inter-SemiBold',
  },
  modalInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 16,
    fontFamily: 'Inter-Regular',
  },
  modalTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  modalAddButton: {
    flex: 1,
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalAddButtonDisabled: {
    opacity: 0.6,
  },
  modalAddButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
});