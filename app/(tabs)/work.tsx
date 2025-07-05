import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Settings, Play, Pause, RotateCcw } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function WorkScreen() {
  const [workDuration, setWorkDuration] = useState(1500); // 25 minutes
  const [breakDuration, setBreakDuration] = useState(300); // 5 minutes
  const [timeLeft, setTimeLeft] = useState(workDuration);
  const [isActive, setIsActive] = useState(false);
  const [isWorkSession, setIsWorkSession] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  const workDurations = [
    { label: '15 min', value: 900 },
    { label: '25 min', value: 1500 },
    { label: '45 min', value: 2700 },
    { label: '60 min', value: 3600 },
  ];

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => {
          if (time <= 1) {
            setIsActive(false);
            setIsCompleted(true);
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    } else if (!isActive && timeLeft !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  useEffect(() => {
    setTimeLeft(isWorkSession ? workDuration : breakDuration);
    setIsCompleted(false);
  }, [workDuration, breakDuration, isWorkSession]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(isWorkSession ? workDuration : breakDuration);
    setIsCompleted(false);
  };

  const switchSession = () => {
    setIsWorkSession(!isWorkSession);
    setIsActive(false);
    setIsCompleted(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
            {isWorkSession ? 'Time to focus and be productive' : 'Take a well-deserved break'}
          </Text>

          <View style={styles.sessionToggle}>
            <TouchableOpacity
              onPress={() => setIsWorkSession(true)}
              style={[
                styles.sessionButton,
                isWorkSession && styles.sessionButtonActive
              ]}
            >
              <Text style={[
                styles.sessionButtonText,
                isWorkSession && styles.sessionButtonTextActive
              ]}>
                Work
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsWorkSession(false)}
              style={[
                styles.sessionButton,
                !isWorkSession && styles.sessionButtonActive
              ]}
            >
              <Text style={[
                styles.sessionButtonText,
                !isWorkSession && styles.sessionButtonTextActive
              ]}>
                Break
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.timerContainer}>
            <LinearGradient
              colors={isWorkSession ? ['#FF6B6B', '#FF8E53'] : ['#4ECDC4', '#44A08D']}
              style={styles.timerCircle}
            >
              <View style={styles.timerInner}>
                <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
                {isCompleted && (
                  <Text style={styles.completedText}>Complete!</Text>
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
          </View>

          {isWorkSession && (
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
  subtitle: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 30,
  },
  sessionToggle: {
    flexDirection: 'row',
    backgroundColor: '#333333',
    borderRadius: 12,
    padding: 4,
    marginBottom: 40,
  },
  sessionButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  sessionButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  sessionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  sessionButtonTextActive: {
    color: '#000000',
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
  },
  completedText: {
    fontSize: 16,
    color: '#4ECDC4',
    marginTop: 8,
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
  },
  durationButtonTextActive: {
    color: '#000000',
  },
});