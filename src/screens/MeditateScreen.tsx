import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { saveMeditationSession } from '../lib/saveData';

interface MeditateScreenProps {
  userId: string;
}

export default function MeditateScreen({ userId }: MeditateScreenProps) {
  const [selectedDuration, setSelectedDuration] = useState(10);
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [selectedAudio, setSelectedAudio] = useState('none');

  const durations = [5, 10, 15, 20, 30, 45, 60];
  const audioOptions = [
    { id: 'none', name: 'Silence', icon: 'volume-mute' },
    { id: 'rain', name: 'Rain', icon: 'rainy' },
    { id: 'ocean', name: 'Ocean', icon: 'water' },
    { id: 'forest', name: 'Forest', icon: 'leaf' },
    { id: 'cafe', name: 'Café', icon: 'cafe' },
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
    
    try {
      await saveMeditationSession({
        user_id: userId,
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

  const progress = 1 - (timeLeft / (selectedDuration * 60));

  return (
    <ScrollView className="flex-1 bg-gradient-to-br from-amber-25 via-orange-25 to-yellow-25">
      <View className="p-4 space-y-6">
        {/* Timer Circle */}
        <View className="items-center py-8">
          <View className="relative">
            <View className="w-64 h-64 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 items-center justify-center shadow-lg">
              <Text className="text-4xl font-bold text-white">
                {formatTime(timeLeft)}
              </Text>
              <Text className="text-white text-lg mt-2">
                {isActive ? 'Meditating...' : 'Ready to start'}
              </Text>
            </View>
          </View>
        </View>

        {/* Control Buttons */}
        <View className="flex-row justify-center space-x-4">
          <Pressable
            onPress={toggleTimer}
            className="bg-amber-600 px-8 py-4 rounded-full flex-row items-center space-x-2"
          >
            <Ionicons
              name={isActive ? 'pause' : 'play'}
              size={24}
              color="white"
            />
            <Text className="text-white font-semibold text-lg">
              {isActive ? 'Pause' : 'Start'}
            </Text>
          </Pressable>

          <Pressable
            onPress={resetTimer}
            className="bg-amber-200 px-8 py-4 rounded-full flex-row items-center space-x-2"
          >
            <Ionicons name="refresh" size={24} color="#92400e" />
            <Text className="text-amber-800 font-semibold text-lg">
              Reset
            </Text>
          </Pressable>
        </View>

        {/* Duration Selection */}
        <View className="bg-white rounded-xl p-6 border border-amber-200">
          <Text className="text-xl font-bold text-amber-900 mb-4">
            Duration
          </Text>
          <View className="flex-row flex-wrap -mx-1">
            {durations.map((duration) => (
              <View key={duration} className="w-1/4 px-1 mb-2">
                <Pressable
                  onPress={() => !isActive && setSelectedDuration(duration)}
                  disabled={isActive}
                  className={`py-3 rounded-lg items-center ${
                    selectedDuration === duration
                      ? 'bg-amber-100'
                      : 'bg-amber-25'
                  } ${isActive ? 'opacity-50' : ''}`}
                >
                  <Text
                    className={`font-semibold ${
                      selectedDuration === duration
                        ? 'text-amber-800'
                        : 'text-amber-700'
                    }`}
                  >
                    {duration}m
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        {/* Audio Selection */}
        <View className="bg-white rounded-xl p-6 border border-amber-200">
          <Text className="text-xl font-bold text-amber-900 mb-4">
            Ambient Sound
          </Text>
          <View className="space-y-2">
            {audioOptions.map((option) => (
              <Pressable
                key={option.id}
                onPress={() => setSelectedAudio(option.id)}
                className={`p-4 rounded-lg flex-row items-center space-x-3 ${
                  selectedAudio === option.id
                    ? 'bg-amber-100'
                    : 'bg-amber-25'
                }`}
              >
                <Ionicons
                  name={option.icon as any}
                  size={24}
                  color={selectedAudio === option.id ? '#92400e' : '#d97706'}
                />
                <Text
                  className={`font-semibold ${
                    selectedAudio === option.id
                      ? 'text-amber-800'
                      : 'text-amber-700'
                  }`}
                >
                  {option.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}