import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMeditationSessions, getWorkSessions, getJournalLogs, getGoals } from '../lib/saveData';
import JournalEntry from '../components/JournalEntry';
import GoalsList from '../components/GoalsList';

interface HomeScreenProps {
  userId: string;
}

export default function HomeScreen({ userId }: HomeScreenProps) {
  const [journalContent, setJournalContent] = useState('');
  const [stats, setStats] = useState({
    totalMeditation: 0,
    totalWork: 0,
    completedGoals: 0,
    journalEntries: 0,
  });

  useEffect(() => {
    loadStats();
    loadTodayJournal();
  }, [userId]);

  const loadStats = async () => {
    try {
      const [meditations, workSessions, goals, journals] = await Promise.all([
        getMeditationSessions(userId),
        getWorkSessions(userId),
        getGoals(userId),
        getJournalLogs(userId),
      ]);

      const totalMeditation = meditations.reduce((sum, session) => sum + session.length, 0);
      const totalWork = workSessions.reduce((sum, session) => sum + session.length, 0);
      const completedGoals = goals.filter(goal => goal.completed).length;

      setStats({
        totalMeditation: Math.floor(totalMeditation / 60),
        totalWork: Math.floor(totalWork / 60),
        completedGoals,
        journalEntries: journals.length,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadTodayJournal = async () => {
    try {
      const journals = await getJournalLogs(userId);
      const today = new Date().toISOString().split('T')[0];
      const todayJournal = journals.find(journal => journal.date === today);
      setJournalContent(todayJournal?.log || '');
    } catch (error) {
      console.error('Error loading journal:', error);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <ScrollView className="flex-1 bg-gradient-to-br from-amber-25 via-orange-25 to-yellow-25">
      <View className="p-4 space-y-6">
        {/* Welcome Section */}
        <View className="bg-white rounded-xl p-6 border border-amber-200">
          <Text className="text-2xl font-bold text-amber-900 mb-2">
            Welcome back!
          </Text>
          <Text className="text-amber-700">
            Ready to continue your mindful journey today?
          </Text>
        </View>

        {/* Stats Grid */}
        <View className="flex-row flex-wrap -mx-2">
          <View className="w-1/2 px-2 mb-4">
            <View className="bg-white rounded-xl p-4 border border-amber-200">
              <View className="flex-row items-center mb-2">
                <Ionicons name="leaf" size={20} color="#d97706" />
                <Text className="text-amber-700 text-sm font-semibold ml-2">
                  Meditation
                </Text>
              </View>
              <Text className="text-2xl font-bold text-amber-900">
                {formatTime(stats.totalMeditation)}
              </Text>
            </View>
          </View>

          <View className="w-1/2 px-2 mb-4">
            <View className="bg-white rounded-xl p-4 border border-amber-200">
              <View className="flex-row items-center mb-2">
                <Ionicons name="time" size={20} color="#d97706" />
                <Text className="text-amber-700 text-sm font-semibold ml-2">
                  Focus Work
                </Text>
              </View>
              <Text className="text-2xl font-bold text-amber-900">
                {formatTime(stats.totalWork)}
              </Text>
            </View>
          </View>

          <View className="w-1/2 px-2 mb-4">
            <View className="bg-white rounded-xl p-4 border border-amber-200">
              <View className="flex-row items-center mb-2">
                <Ionicons name="checkmark-circle" size={20} color="#d97706" />
                <Text className="text-amber-700 text-sm font-semibold ml-2">
                  Goals
                </Text>
              </View>
              <Text className="text-2xl font-bold text-amber-900">
                {stats.completedGoals}
              </Text>
            </View>
          </View>

          <View className="w-1/2 px-2 mb-4">
            <View className="bg-white rounded-xl p-4 border border-amber-200">
              <View className="flex-row items-center mb-2">
                <Ionicons name="book" size={20} color="#d97706" />
                <Text className="text-amber-700 text-sm font-semibold ml-2">
                  Journal
                </Text>
              </View>
              <Text className="text-2xl font-bold text-amber-900">
                {stats.journalEntries}
              </Text>
            </View>
          </View>
        </View>

        {/* Today's Journal */}
        <View className="bg-white rounded-xl p-6 border border-amber-200">
          <Text className="text-xl font-bold text-amber-900 mb-4">
            Today's Journal
          </Text>
          <JournalEntry
            userId={userId}
            initialContent={journalContent}
            onContentChange={setJournalContent}
          />
        </View>

        {/* Goals Section */}
        <View className="bg-white rounded-xl p-6 border border-amber-200">
          <Text className="text-xl font-bold text-amber-900 mb-4">
            Your Goals
          </Text>
          <GoalsList userId={userId} />
        </View>
      </View>
    </ScrollView>
  );
}