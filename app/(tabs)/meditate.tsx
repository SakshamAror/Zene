import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Pause, RotateCcw, VolumeX, CloudRain, Waves, TreePine, Coffee } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import AuthForm from '@/components/AuthForm';
import { saveMeditationSession } from '@/lib/saveData';

export default function MeditateScreen() {
  const { user, loading } = useAuth();
  const [selectedDuration, setSelectedDuration] = useState(10);
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [selectedAudio, setSelectedAudio] = useState('none');

  const durations = [5, 10, 15, 20, 30, 45, 60];
  const audioOptions = [
    { id: 'none', name: 'Silence', icon: VolumeX },
    { id: 'rain', name: 'Rain', icon: CloudRain },
    { id: 'ocean', name: 'Ocean', icon: Waves },
    { id: 'forest', name: 'Forest', icon: TreePine },
    { id: 'cafe', name: 'Café', icon: Coffee },
  ];

  useEffect(() => {
    setTimeLeft(selectedDuration * 60);
  }, [selectedDuration]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft => timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleSessionComplete();
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleSessionComplete = async () => {
    setIsActive(false);
    
    if (!user) return;
    
    try {
      await saveMeditationSession({
        user_id: user.id,
        length: selectedDuration * 60,
        date: new Date().toISOString().split('T')[0],
      });
      
      Alert.alert(
        'Session Complete!',
        `Great job! You meditated for ${selectedDuration} minutes.`,
        [{ text: 'OK', onPress: () => setTimeLeft(selectedDuration * 60) }]
      );
    } catch (error) {
      console.error('Error saving meditation session:', error);
      Alert.alert('Error', 'Failed to save your meditation session.');
    }
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(selectedDuration * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return <AuthForm onAuthSuccess={() => {}} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Meditate</Text>
          <Text style={styles.subtitle}>Find your inner peace</Text>
        </View>

        {/* Timer Circle */}
        <View style={styles.timerContainer}>
          <View style={styles.timerCircle}>
            <Text style={styles.timerText}>
              {formatTime(timeLeft)}
            </Text>
            <Text style={styles.timerStatus}>
              {isActive ? 'Meditating...' : 'Ready to start'}
            </Text>
          </View>
        </View>

        {/* Control Buttons */}
        <View style={styles.controlButtons}>
          <Pressable
            onPress={toggleTimer}
            style={styles.primaryButton}
          >
            {isActive ? (
              <Pause size={24} color="white" />
            ) : (
              <Play size={24} color="white" />
            )}
            <Text style={styles.primaryButtonText}>
              {isActive ? 'Pause' : 'Start'}
            </Text>
          </Pressable>

          <Pressable
            onPress={resetTimer}
            style={styles.secondaryButton}
          >
            <RotateCcw size={24} color="#92400e" />
            <Text style={styles.secondaryButtonText}>Reset</Text>
          </Pressable>
        </View>

        {/* Duration Selection */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Duration</Text>
          <View style={styles.durationGrid}>
            {durations.map((duration) => (
              <Pressable
                key={duration}
                onPress={() => !isActive && setSelectedDuration(duration)}
                disabled={isActive}
                style={[
                  styles.durationButton,
                  selectedDuration === duration && styles.durationButtonActive,
                  isActive && styles.durationButtonDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.durationButtonText,
                    selectedDuration === duration && styles.durationButtonTextActive,
                  ]}
                >
                  {duration}m
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Audio Selection */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ambient Sound</Text>
          <View style={styles.audioOptions}>
            {audioOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setSelectedAudio(option.id)}
                  style={[
                    styles.audioOption,
                    selectedAudio === option.id && styles.audioOptionActive,
                  ]}
                >
                  <IconComponent
                    size={24}
                    color={selectedAudio === option.id ? '#92400e' : '#d97706'}
                  />
                  <Text
                    style={[
                      styles.audioOptionText,
                      selectedAudio === option.id && styles.audioOptionTextActive,
                    ]}
                  >
                    {option.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fffdf7',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fffdf7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#92400e',
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#b45309',
    fontWeight: '500',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  timerCircle: {
    width: 256,
    height: 256,
    borderRadius: 128,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  timerText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  timerStatus: {
    fontSize: 18,
    color: 'white',
    marginTop: 8,
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#d97706',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 18,
  },
  secondaryButton: {
    backgroundColor: '#fde68a',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#92400e',
    fontWeight: '600',
    fontSize: 18,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 16,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationButton: {
    width: '22%',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#fffdf7',
  },
  durationButtonActive: {
    backgroundColor: '#fef3c7',
  },
  durationButtonDisabled: {
    opacity: 0.5,
  },
  durationButtonText: {
    fontWeight: '600',
    color: '#b45309',
  },
  durationButtonTextActive: {
    color: '#92400e',
  },
  audioOptions: {
    gap: 8,
  },
  audioOption: {
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fffdf7',
  },
  audioOptionActive: {
    backgroundColor: '#fef3c7',
  },
  audioOptionText: {
    fontWeight: '600',
    color: '#b45309',
  },
  audioOptionTextActive: {
    color: '#92400e',
  },
});