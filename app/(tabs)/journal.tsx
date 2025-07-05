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
import { journalService, JournalEntry } from '@/services/journalService';

export default function JournalScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [content, setContent] = useState('');
  const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadJournalData();
  }, [selectedDate]);

  const loadJournalData = async () => {
    setIsLoading(true);
    try {
      const [todayEntry, recent] = await Promise.all([
        journalService.getJournalEntry(selectedDate),
        journalService.getRecentJournalEntries(5)
      ]);

      setContent(todayEntry?.log || '');
      setRecentEntries(recent);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load journal data: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please write something before saving.');
      return;
    }

    setIsSaving(true);
    try {
      await journalService.saveJournalEntry(content, selectedDate);
      Alert.alert('Success', 'Journal entry saved!');
      loadJournalData(); // Refresh recent entries
    } catch (error: any) {
      Alert.alert('Error', 'Failed to save journal entry: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatEntryDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <LinearGradient colors={['#000000', '#1a1a1a']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
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
                  style={styles.saveButton}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  <Text style={styles.saveButtonText}>
                    {isSaving ? 'Saving...' : 'Save'}
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
            {recentEntries.length === 0 ? (
              <Text style={styles.emptyText}>No recent entries yet. Start writing!</Text>
            ) : (
              recentEntries.map((entry, index) => (
                <TouchableOpacity key={entry.id} style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryDate}>
                      {formatEntryDate(entry.date)}
                    </Text>
                  </View>
                  <Text style={styles.entryPreview} numberOfLines={3}>
                    {entry.log}
                  </Text>
                </TouchableOpacity>
              ))
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
    fontSize: 18,
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
  },
  saveButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  saveButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  textInput: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 24,
    minHeight: 200,
    fontFamily: 'System',
  },
  recentContainer: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    fontStyle: 'italic',
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
  },
  entryPreview: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
  },
});