import 'react-native-screens/enableScreens';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import CheckInScreen from './src/screens/CheckInScreen';
import MeditateScreen from './src/screens/MeditateScreen';
import JournalScreen from './src/screens/JournalScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import { AuthProvider } from './src/context/AuthContext';

const Tab = createBottomTabNavigator();

const TabBarBackground = () => (
  <LinearGradient
    colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,1)']}
    style={StyleSheet.absoluteFillObject}
  />
);

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer theme={{
        dark: true,
        colors: {
          primary: '#FF6B6B',
          background: '#000000',
          card: '#1a1a1a',
          text: '#ffffff',
          border: '#333333',
          notification: '#FF6B6B',
        },
      }}>
        <StatusBar style="light" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarStyle: {
              backgroundColor: 'transparent',
              borderTopWidth: 0,
              elevation: 0,
              height: 90,
              paddingBottom: 20,
              paddingTop: 10,
            },
            tabBarBackground: () => <TabBarBackground />,
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;
              
              if (route.name === 'Check in') {
                iconName = focused ? 'heart' : 'heart-outline';
              } else if (route.name === 'Meditate') {
                iconName = focused ? 'leaf' : 'leaf-outline';
              } else if (route.name === 'Journal') {
                iconName = focused ? 'book' : 'book-outline';
              } else if (route.name === 'Analyze') {
                iconName = focused ? 'analytics' : 'analytics-outline';
              }

              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#ffffff',
            tabBarInactiveTintColor: '#666666',
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '500',
            },
          })}
        >
          <Tab.Screen name="Check in" component={CheckInScreen} />
          <Tab.Screen name="Meditate" component={MeditateScreen} />
          <Tab.Screen name="Journal" component={JournalScreen} />
          <Tab.Screen name="Analyze" component={AnalyticsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}