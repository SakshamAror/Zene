import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Calendar, BookOpen } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import AuthForm from '../../components/AuthForm';

interface JournalEntry {
  id: string;
  date: string;
  content: string;
}

export default function JournalScreen() {
  const { user, loading } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [content, setContent] = useState('');
  const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadRecentEntries();
      loadTodayEntry();
    }
  }, [user, selectedDate]);

  const loadRecentEntries = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('journal_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentEntries(data || []);
    } catch (error) {
      console.error('Error loading recent entries:', error);
    }
  };

  const loadTodayEntry = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('journal_logs')
        .select('content')
        .eq('user_id', user.id)
        .eq('date', selectedDate)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setContent(data?.content || '');
    } catch (error) {
      console.error('Error loading today entry:', error);
    }
  };

  const saveEntry = async () => {
    if (!user || !content.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('journal_logs')
        .upsert({
          user_id: user.id,
          date: selectedDate,
          content: content.trim(),
        });

      if (error) throw error;
      Alert.alert('Success', 'Journal entry saved!');
      loadRecentEntries();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
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

  return (
    <LinearGradient colors={['#000000', '#1a1a1a']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity>
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Journal</Text>
          <TouchableOpacity>
            <Calendar size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          </View>

          <View style={styles.journalContainer}>
            <LinearGradient
              colors={['#333333', '#2a2a2a']}
              style={styles.journalCard}
            >
              <View style={styles.journalHeader}>
                <View style={styles.journalIcon}>
                  <BookOpen size={20} color="#FFD93D" />
                </View>
                <Text style={styles.journalTitle}>Today's Entry</Text>
                <TouchableOpacity 
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
                  onPress={saveEntry}
                  disabled={saving}
                >
                  <Text style={styles.saveButtonText}>
                    {saving ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder="How are you feeling today? What's on your mind? What are you grateful for?"
                placeholderTextColor="#666666"
                multiline
                style={styles.textInput}
                textAlignVertical="top"
              />
            </LinearGradient>
          </View>

          <View style={styles.recentContainer}>
            <Text style={styles.sectionTitle}>Recent Entries</Text>
            {recentEntries.map((entry, index) => (
              <TouchableOpacity key={entry.id} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryDate}>
                    {formatShortDate(entry.date)}
                  </Text>
                </View>
                <Text style={styles.entryPreview} numberOfLines={2}>
                  {entry.content}
                </Text>
              </TouchableOpacity>
            ))}
            {recentEntries.length === 0 && (
              <Text style={styles.emptyText}>No journal entries yet. Start writing!</Text>
            )}
          </View>
        </ScrollView>
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
  dateContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  dateText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
  },
  journalContainer: {
    marginBottom: 40,
  },
  journalCard: {
    borderRadius: 20,
    padding: 20,
  },
  journalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  journalIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFD93D20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  journalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
  },
  saveButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  textInput: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 24,
    minHeight: 200,
    fontFamily: 'Inter-Regular',
  },
  recentContainer: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
    fontFamily: 'Inter-SemiBold',
  },
  entryCard: {
    backgroundColor: '#333333',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  entryHeader: {
    marginBottom: 8,
  },
  entryDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD93D',
    fontFamily: 'Inter-SemiBold',
  },
  entryPreview: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
    fontFamily: 'Inter-Regular',
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
    fontFamily: 'Inter-Regular',
  },
});