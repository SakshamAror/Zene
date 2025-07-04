import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Settings, Play, Pause, RotateCcw, Coffee } from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import AuthForm from '../components/AuthForm';

export default function WorkScreen() {
  const { user, loading } = useAuth();
  const [workDuration, setWorkDuration] = useState(25 * 60); // 25 minutes
  const [breakDuration, setBreakDuration] = useState(5 * 60); // 5 minutes
  const [timeLeft, setTimeLeft] = useState(workDuration);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [cycles, setCycles] = useState(0);

  const workDurations = [
    { label: '15 min', value: 15 * 60 },
    { label: '25 min', value: 25 * 60 },
    { label: '45 min', value: 45 * 60 },
    { label: '60 min', value: 60 * 60 },
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => {
          if (time <= 1) {
            setIsActive(false);
            setIsCompleted(true);
            handleTimerComplete();
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    } else if (!isActive && timeLeft !== 0) {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  useEffect(() => {
    setTimeLeft(isBreak ? breakDuration : workDuration);
    setIsCompleted(false);
  }, [workDuration, breakDuration, isBreak]);

  const handleTimerComplete = async () => {
    if (isBreak) {
      // Break completed, start work session
      setIsBreak(false);
      setTimeLeft(workDuration);
      Alert.alert('Break Over!', 'Time to get back to work.');
    } else {
      // Work session completed
      setCycles(prev => prev + 1);
      await saveWorkSession();
      setIsBreak(true);
      setTimeLeft(breakDuration);
      Alert.alert('Work Session Complete!', 'Time for a break.');
    }
  };

  const saveWorkSession = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('work_sessions')
        .insert({
          user_id: user.id,
          duration: workDuration,
          date: new Date().toISOString().split('T')[0],
        });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error saving work session:', error);
    }
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(isBreak ? breakDuration : workDuration);
    setIsCompleted(false);
  };

  const resetSession = () => {
    setIsActive(false);
    setIsBreak(false);
    setTimeLeft(workDuration);
    setIsCompleted(false);
    setCycles(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
          <Text style={styles.headerTitle}>Focus Timer</Text>
          <TouchableOpacity>
            <Settings size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.subtitle}>
            {isBreak ? 'Take a break and recharge' : 'Focus on your work'}
          </Text>

          <View style={styles.sessionInfo}>
            <Text style={styles.sessionType}>
              {isBreak ? 'Break Time' : 'Work Session'}
            </Text>
            <Text style={styles.cycleCount}>Cycles completed: {cycles}</Text>
          </View>

          <View style={styles.timerContainer}>
            <LinearGradient
              colors={isBreak ? ['#FFD93D', '#FF8C42'] : ['#FF6B6B', '#FF8C42']}
              style={styles.timerCircle}
            >
              <View style={styles.timerInner}>
                <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
                {isCompleted && (
                  <Text style={styles.completedText}>
                    {isBreak ? 'Break Over!' : 'Well Done!'}
                  </Text>
                )}
              </View>
            </LinearGradient>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              onPress={toggleTimer}
              style={[styles.controlButton, styles.playButton]}
            >
              {isActive ? (
                <Pause size={32} color="#ffffff" />
              ) : (
                <Play size={32} color="#ffffff" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={resetTimer}
              style={[styles.controlButton, styles.resetButton]}
            >
              <RotateCcw size={24} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={resetSession}
              style={[styles.controlButton, styles.resetButton]}
            >
              <Coffee size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {!isBreak && (
            <View style={styles.durationContainer}>
              <Text style={styles.sectionTitle}>Work Duration</Text>
              <View style={styles.durationButtons}>
                {workDurations.map((dur) => (
                  <TouchableOpacity
                    key={dur.value}
                    onPress={() => setWorkDuration(dur.value)}
                    style={[
                      styles.durationButton,
                      workDuration === dur.value && styles.durationButtonActive
                    ]}
                    disabled={isActive}
                  >
                    <Text style={[
                      styles.durationButtonText,
                      workDuration === dur.value && styles.durationButtonTextActive
                    ]}>
                      {dur.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.infoContainer}>
            <LinearGradient colors={['#333333', '#2a2a2a']} style={styles.infoCard}>
              <Text style={styles.infoTitle}>Pomodoro Technique</Text>
              <Text style={styles.infoText}>
                Work for focused intervals followed by short breaks. This technique helps maintain concentration and prevents burnout.
              </Text>
            </LinearGradient>
          </View>
        </View>
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
  subtitle: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Inter-Regular',
  },
  sessionInfo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  sessionType: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    fontFamily: 'Inter-SemiBold',
  },
  cycleCount: {
    fontSize: 14,
    color: '#888888',
    fontFamily: 'Inter-Regular',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  timerCircle: {
    width: 250,
    height: 250,
    borderRadius: 125,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerInner: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 48,
    fontWeight: '300',
    color: '#ffffff',
    fontFamily: 'Inter-Regular',
  },
  completedText: {
    fontSize: 16,
    color: '#FFD93D',
    marginTop: 8,
    fontFamily: 'Inter-Regular',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    gap: 20,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    backgroundColor: '#FF6B6B',
  },
  resetButton: {
    backgroundColor: '#333333',
  },
  durationContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
    fontFamily: 'Inter-SemiBold',
  },
  durationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  durationButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#333333',
    borderRadius: 12,
    alignItems: 'center',
  },
  durationButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  durationButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter-SemiBold',
  },
  durationButtonTextActive: {
    color: '#000000',
  },
  infoContainer: {
    marginBottom: 30,
  },
  infoCard: {
    borderRadius: 16,
    padding: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    fontFamily: 'Inter-SemiBold',
  },
  infoText: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
    fontFamily: 'Inter-Regular',
  },
});