import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Settings, ChartBar as BarChart3, TrendingUp, Smile, Leaf, BookOpen, Flame, Heart } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import AuthForm from '../../components/AuthForm';

interface AnalyticsData {
  totalMeditation: number;
  journalEntries: number;
  dayStreak: number;
  averageMoodScore: number;
  weeklyMeditation: Array<{ day: string; minutes: number; mood: number }>;
}

export default function AnalyticsScreen() {
  const { user, loading } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalMeditation: 0,
    journalEntries: 0,
    dayStreak: 0,
    averageMoodScore: 8.2,
    weeklyMeditation: [],
  });
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    if (user) {
      loadAnalyticsData();
    }
  }, [user, timeRange]);

  const loadAnalyticsData = async () => {
    if (!user) return;

    try {
      // Get meditation data
      const { data: meditationData } = await supabase
        .from('meditation_sessions')
        .select('duration, date')
        .eq('user_id', user.id);

      // Get journal data
      const { data: journalData } = await supabase
        .from('journal_logs')
        .select('date, content')
        .eq('user_id', user.id);

      // Calculate total meditation minutes
      const totalMeditation = meditationData?.reduce((sum, session) => sum + (session.duration / 60), 0) || 0;

      // Calculate streak (simplified)
      const dayStreak = journalData?.length || 0;

      // Generate weekly data (last 7 days)
      const weeklyData = [];
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayMeditation = meditationData?.filter(session => session.date === dateStr)
          .reduce((sum, session) => sum + (session.duration / 60), 0) || 0;
        
        weeklyData.push({
          day: days[date.getDay() === 0 ? 6 : date.getDay() - 1],
          minutes: dayMeditation,
          mood: Math.floor(Math.random() * 3) + 7, // Random mood 7-9
        });
      }

      setAnalyticsData({
        totalMeditation: Math.round(totalMeditation),
        journalEntries: journalData?.length || 0,
        dayStreak,
        averageMoodScore: 8.2,
        weeklyMeditation: weeklyData,
      });
    } catch (error) {
      console.error('Error loading analytics data:', error);
    }
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

  const stats = [
    { 
      label: 'Minutes Meditated', 
      value: analyticsData.totalMeditation.toString(), 
      icon: Leaf, 
      color: '#4ECDC4' 
    },
    { 
      label: 'Journal Entries', 
      value: analyticsData.journalEntries.toString(), 
      icon: BookOpen, 
      color: '#FFD93D' 
    },
    { 
      label: 'Day Streak', 
      value: analyticsData.dayStreak.toString(), 
      icon: Flame, 
      color: '#FF6B6B' 
    },
    { 
      label: 'Mood Score', 
      value: analyticsData.averageMoodScore.toString(), 
      icon: Smile, 
      color: '#667eea' 
    },
  ];

  const maxMeditation = Math.max(...analyticsData.weeklyMeditation.map(d => d.minutes), 1);

  return (
    <LinearGradient colors={['#000000', '#1a1a1a']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity>
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analytics</Text>
          <TouchableOpacity>
            <Settings size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.overviewContainer}>
            <Text style={styles.sectionTitle}>This Week</Text>
            <View style={styles.timeRangeSelector}>
              {['7d', '30d', '90d'].map((range) => (
                <TouchableOpacity
                  key={range}
                  style={[styles.timeButton, timeRange === range && styles.timeButtonActive]}
                  onPress={() => setTimeRange(range)}
                >
                  <Text style={[
                    styles.timeButtonText,
                    timeRange === range && styles.timeButtonTextActive
                  ]}>
                    {range}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.statsGrid}>
            {stats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <LinearGradient
                  key={index}
                  colors={['#333333', '#2a2a2a']}
                  style={styles.statCard}
                >
                  <View style={[styles.statIcon, { backgroundColor: `${stat.color}20` }]}>
                    <IconComponent size={24} color={stat.color} />
                  </View>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </LinearGradient>
              );
            })}
          </View>

          <LinearGradient
            colors={['#333333', '#2a2a2a']}
            style={styles.chartContainer}
          >
            <View style={styles.chartHeader}>
              <View style={styles.chartIcon}>
                <BarChart3 size={20} color="#4ECDC4" />
              </View>
              <Text style={styles.chartTitle}>Daily Activity</Text>
            </View>

            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#4ECDC4' }]} />
                <Text style={styles.legendText}>Meditation</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#FFD93D' }]} />
                <Text style={styles.legendText}>Mood</Text>
              </View>
            </View>

            <View style={styles.chartContent}>
              {analyticsData.weeklyMeditation.map((day, index) => (
                <View key={index} style={styles.chartBar}>
                  <Text style={styles.dayLabel}>{day.day}</Text>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.meditationBar,
                        { height: Math.max((day.minutes / maxMeditation) * 60, 4) }
                      ]}
                    />
                    <View
                      style={[
                        styles.moodBar,
                        { height: (day.mood / 10) * 60 }
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </LinearGradient>

          <LinearGradient
            colors={['#333333', '#2a2a2a']}
            style={styles.insightsContainer}
          >
            <Text style={styles.insightsTitle}>Insights</Text>
            <View style={styles.insightItem}>
              <TrendingUp size={20} color="#4ECDC4" />
              <Text style={styles.insightText}>
                Your meditation streak is at an all-time high! Keep it up.
              </Text>
            </View>
            <View style={styles.insightItem}>
              <Heart size={20} color="#FFD93D" />
              <Text style={styles.insightText}>
                Your mood has improved 15% this week compared to last week.
              </Text>
            </View>
          </LinearGradient>
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
  overviewContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
    fontFamily: 'Inter-SemiBold',
  },
  timeRangeSelector: {
    flexDirection: 'row',
    backgroundColor: '#333333',
    borderRadius: 12,
    padding: 4,
  },
  timeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  timeButtonActive: {
    backgroundColor: '#4ECDC4',
  },
  timeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter-SemiBold',
  },
  timeButtonTextActive: {
    color: '#000000',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 30,
  },
  statCard: {
    width: '48%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    fontFamily: 'Inter-SemiBold',
  },
  statLabel: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  chartContainer: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4ECDC420',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
  },
  legendContainer: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#888888',
    fontFamily: 'Inter-Regular',
  },
  chartContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  dayLabel: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 8,
    fontFamily: 'Inter-Regular',
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  meditationBar: {
    width: 8,
    backgroundColor: '#4ECDC4',
    borderRadius: 4,
    minHeight: 4,
  },
  moodBar: {
    width: 8,
    backgroundColor: '#FFD93D',
    borderRadius: 4,
    minHeight: 4,
  },
  insightsContainer: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 40,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
    fontFamily: 'Inter-SemiBold',
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
    marginLeft: 12,
    fontFamily: 'Inter-Regular',
  },
});