import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ScrollView, Pressable, SafeAreaView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './src/hooks/useAuth';
import AuthForm from './src/components/AuthForm';
import HomeScreen from './src/screens/HomeScreen';
import MeditateScreen from './src/screens/MeditateScreen';
import LearnScreen from './src/screens/LearnScreen';
import './global.css';

type Screen = 'home' | 'meditate' | 'learn';

export default function App() {
  const { user, loading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [isDarkMode, setIsDarkMode] = useState(false);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-amber-25 justify-center items-center">
        <Text className="text-amber-800 text-lg font-semibold">Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return <AuthForm onAuthSuccess={() => {}} />;
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen userId={user.id} />;
      case 'meditate':
        return <MeditateScreen userId={user.id} />;
      case 'learn':
        return <LearnScreen userId={user.id} />;
      default:
        return <HomeScreen userId={user.id} />;
    }
  };

  const getIconName = (screen: Screen) => {
    switch (screen) {
      case 'home':
        return 'home';
      case 'meditate':
        return 'leaf';
      case 'learn':
        return 'book';
      default:
        return 'home';
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'dark' : ''}`}>
      <View className="flex-1 bg-gradient-to-br from-amber-25 via-orange-25 to-yellow-25">
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        
        {/* Header */}
        <View className="bg-gradient-to-t from-amber-50 to-amber-25 px-4 py-3 border-b border-amber-200">
          <View className="flex-row justify-between items-center">
            <Text className="text-2xl font-bold text-amber-900">Zene</Text>
            <Pressable
              onPress={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full bg-amber-100"
            >
              <Ionicons
                name={isDarkMode ? 'sunny' : 'moon'}
                size={20}
                color="#92400e"
              />
            </Pressable>
          </View>
        </View>

        {/* Main Content */}
        <View className="flex-1">
          {renderScreen()}
        </View>

        {/* Bottom Navigation */}
        <View className="bg-gradient-to-t from-amber-50 to-amber-25 border-t border-amber-200">
          <View className="flex-row justify-around py-2">
            {(['home', 'meditate', 'learn'] as Screen[]).map((screen) => (
              <Pressable
                key={screen}
                onPress={() => setCurrentScreen(screen)}
                className={`flex-1 items-center py-3 mx-1 rounded-lg ${
                  currentScreen === screen ? 'bg-amber-100' : ''
                }`}
              >
                <Ionicons
                  name={getIconName(screen) as any}
                  size={24}
                  color={currentScreen === screen ? '#92400e' : '#d97706'}
                />
                <Text
                  className={`text-xs mt-1 font-medium ${
                    currentScreen === screen ? 'text-amber-800' : 'text-amber-600'
                  }`}
                >
                  {screen.charAt(0).toUpperCase() + screen.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}