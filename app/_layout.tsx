import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';

// If `useFrameworkReady` is a custom hook, import it or remove if unused
import { useFrameworkReady } from '../../hooks/useFrameworkReady'; // adjust path if needed

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