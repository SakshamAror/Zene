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
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function MeditateScreen() {
  const [duration, setDuration] = useState(300); // 5 minutes
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isActive, setIsActive] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const durations = [
    { label: '5 min', value: 300 },
    { label: '10 min', value: 600 },
    { label: '15 min', value: 900 },
    { label: '20 min', value: 1200 },
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
    setTimeLeft(duration);
    setIsCompleted(false);
  }, [duration]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(duration);
    setIsCompleted(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((duration - timeLeft) / duration) * 100;

  return (
    <LinearGradient colors={['#000000', '#1a1a1a']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meditation</Text>
          <TouchableOpacity>
            <Ionicons name="settings-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.subtitle}>Find your center and breathe</Text>

          <View style={styles.timerContainer}>
            <LinearGradient
              colors={['#4ECDC4', '#44A08D']}
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
              <Ionicons 
                name={isActive ? 'pause' : 'play'} 
                size={32} 
                color="#ffffff" 
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={resetTimer}
              style={[styles.controlButton, styles.resetButton]}
            >
              <Ionicons name="refresh" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.durationContainer}>
            <Text style={styles.sectionTitle}>Duration</Text>
            <View style={styles.durationButtons}>
              {durations.map((dur) => (
                <TouchableOpacity
                  key={dur.value}
                  onPress={() => setDuration(dur.value)}
                  style={[
                    styles.durationButton,
                    duration === dur.value && styles.durationButtonActive
                  ]}
                  disabled={isActive}
                >
                  <Text style={[
                    styles.durationButtonText,
                    duration === dur.value && styles.durationButtonTextActive
                  ]}>
                    {dur.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.ambientContainer}>
            <Text style={styles.sectionTitle}>Ambient Sounds</Text>
            <View style={styles.ambientButtons}>
              <TouchableOpacity style={styles.ambientButton}>
                <Text style={styles.ambientButtonText}>None</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ambientButton}>
                <Text style={styles.ambientButtonText}>Rain</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ambientButton}>
                <Text style={styles.ambientButtonText}>Ocean</Text>
              </TouchableOpacity>
            </View>
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
    marginBottom: 40,
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
    backgroundColor: '#4ECDC4',
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
    backgroundColor: '#4ECDC4',
  },
  durationButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  durationButtonTextActive: {
    color: '#000000',
  },
  ambientContainer: {
    marginBottom: 30,
  },
  ambientButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  ambientButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#333333',
    borderRadius: 12,
    alignItems: 'center',
  },
  ambientButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});