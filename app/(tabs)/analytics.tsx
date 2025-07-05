import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Settings, TrendingUp, Smile, ChartBar as BarChart } from 'lucide-react-native';

export default function AnalyticsScreen() {
  const stats = [
    { label: 'Minutes Meditated', value: '245', icon: 'leaf', color: '#4ECDC4' },
    { label: 'Journal Entries', value: '12', icon: 'book', color: '#FFD93D' },
    { label: 'Day Streak', value: '7', icon: 'flame', color: '#FF6B6B' },
    { label: 'Mood Score', value: '8.2', icon: 'happy', color: '#667eea' },
  ];

  const weeklyData = [
    { day: 'Mon', meditation: 15, mood: 7 },
    { day: 'Tue', meditation: 20, mood: 8 },
    { day: 'Wed', meditation: 10, mood: 6 },
    { day: 'Thu', meditation: 25, mood: 9 },
    { day: 'Fri', meditation: 15, mood: 7 },
    { day: 'Sat', meditation: 30, mood: 9 },
    { day: 'Sun', meditation: 20, mood: 8 },
  ];

  const maxMeditation = Math.max(...weeklyData.map(d => d.meditation));

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
              <TouchableOpacity style={[styles.timeButton, styles.timeButtonActive]}>
                <Text style={[styles.timeButtonText, styles.timeButtonTextActive]}>7d</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.timeButton}>
                <Text style={styles.timeButtonText}>30d</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.timeButton}>
                <Text style={styles.timeButtonText}>90d</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.statsGrid}>
            {stats.map((stat, index) => (
              <LinearGradient
                key={index}
                colors={['#333333', '#2a2a2a']}
                style={styles.statCard}
              >
                <View style={[styles.statIcon, { backgroundColor: `${stat.color}20` }]}>
                  <BarChart size={24} color={stat.color} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </LinearGradient>
            ))}
          </View>

          <LinearGradient
            colors={['#333333', '#2a2a2a']}
            style={styles.chartContainer}
          >
            <View style={styles.chartHeader}>
              <View style={styles.chartIcon}>
                <BarChart size={20} color="#4ECDC4" />
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
              {weeklyData.map((day, index) => (
                <View key={index} style={styles.chartBar}>
                  <Text style={styles.dayLabel}>{day.day}</Text>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.meditationBar,
                        { height: (day.meditation / maxMeditation) * 60 }
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
              <Smile size={20} color="#FFD93D" />
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
  overviewContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
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
  },
  statLabel: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
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
  },
});