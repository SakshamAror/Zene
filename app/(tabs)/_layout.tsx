import { Tabs } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Leaf, BookOpen, BarChart3 } from 'lucide-react-native';
import { StyleSheet } from 'react-native';

const TabBarBackground = () => (
  <LinearGradient
    colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,1)']}
    style={StyleSheet.absoluteFillObject}
  />
);

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
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
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#666666',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          fontFamily: 'Inter-SemiBold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Check in',
          tabBarIcon: ({ focused, color, size }) => (
            <Heart 
              size={size} 
              color={color} 
              fill={focused ? color : 'transparent'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="meditate"
        options={{
          title: 'Meditate',
          tabBarIcon: ({ focused, color, size }) => (
            <Leaf 
              size={size} 
              color={color} 
              fill={focused ? color : 'transparent'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ focused, color, size }) => (
            <BookOpen 
              size={size} 
              color={color} 
              fill={focused ? color : 'transparent'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analyze',
          tabBarIcon: ({ focused, color, size }) => (
            <BarChart3 
              size={size} 
              color={color} 
              fill={focused ? color : 'transparent'}
            />
          ),
        }}
      />
    </Tabs>
  );
}