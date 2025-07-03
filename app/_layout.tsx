import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Pause, RotateCcw, VolumeX, CloudRain, Waves, TreePine, Coffee } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import AuthForm from '../../components/AuthForm';
import { saveMeditationSession } from '../../lib/saveData';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}