import { Tabs } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Leaf, BookOpen, ChartBar as BarChart3 } from 'lucide-react-native';
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
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Meditate',
          tabBarIcon: ({ size, color }) => (
            <Leaf size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="work"
        options={{
          title: 'Focus',
          tabBarIcon: ({ size, color }) => (
            <Heart size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ size, color }) => (
            <BookOpen size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ size, color }) => (
            <BarChart3 size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}