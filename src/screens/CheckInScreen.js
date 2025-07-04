import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const feelings = [
  { name: 'Joyful', color: ['#FFD93D', '#FF8C42'], position: { top: 120, left: 50 } },
  { name: 'Grateful', color: ['#6BCF7F', '#4D9DE0'], position: { top: 180, right: 40 } },
  { name: 'Peaceful', color: ['#4D9DE0', '#7209B7'], position: { top: 250, left: 30 } },
  { name: 'Energetic', color: ['#FF6B6B', '#FFD93D'], position: { top: 320, right: 60 } },
  { name: 'Focused', color: ['#4ECDC4', '#44A08D'], position: { top: 390, left: 70 } },
  { name: 'Calm', color: ['#667eea', '#764ba2'], position: { top: 460, right: 30 } },
  { name: 'Inspired', color: ['#f093fb', '#f5576c'], position: { top: 530, left: 40 } },
  { name: 'Content', color: ['#4facfe', '#00f2fe'], position: { top: 600, right: 50 } },
];

export default function CheckInScreen() {
  const [selectedFeeling, setSelectedFeeling] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleFeelingSelect = (feeling) => {
    setSelectedFeeling(feeling);
    setShowDetails(true);
  };

  if (showDetails && selectedFeeling) {
    return (
      <LinearGradient colors={['#000000', '#1a1a1a']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowDetails(false)}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity>
              <Ionicons name="settings-outline" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.feelingDetailContainer}>
            <LinearGradient
              colors={selectedFeeling.color}
              style={styles.feelingIcon}
            />
            
            <Text style={styles.feelingText}>I'm feeling</Text>
            <Text style={styles.feelingName}>{selectedFeeling.name.toLowerCase()}</Text>
            
            <View style={styles.timeContainer}>
              <Ionicons name="time-outline" size={16} color="#888888" />
              <Text style={styles.timeText}>Today, 9:58am</Text>
            </View>

            <TouchableOpacity style={styles.editButton}>
              <Ionicons name="add-circle-outline" size={16} color="#ffffff" />
              <Text style={styles.editButtonText}>Edit Emotions</Text>
            </TouchableOpacity>

            <View style={styles.journalContainer}>
              <Text style={styles.journalPrompt}>What are you doing?</Text>
              <TouchableOpacity style={styles.journalInput}>
                <Text style={styles.journalPlaceholder}>Add a note about your day...</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.completeButton}>
              <Text style={styles.completeButtonText}>Complete check-in</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#000000', '#1a1a1a']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity>
            <Ionicons name="settings-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="arrow-up" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>How are you feeling{'\n'}this morning?</Text>
        </View>

        <View style={styles.circleContainer}>
          <LinearGradient
            colors={['#FF6B6B', '#FFD93D', '#4ECDC4', '#667eea']}
            style={styles.mainCircle}
          >
            <TouchableOpacity style={styles.checkInButton}>
              <Ionicons name="add" size={32} color="#ffffff" />
              <Text style={styles.checkInText}>Check in</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>4</Text>
            <Text style={styles.statLabel}>unique{'\n'}feelings</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>2</Text>
            <Text style={styles.statLabel}>day{'\n'}streak</Text>
          </View>
        </View>

        <ScrollView style={styles.feelingsContainer} showsVerticalScrollIndicator={false}>
          {feelings.map((feeling, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.feelingBubble, feeling.position]}
              onPress={() => handleFeelingSelect(feeling)}
            >
              <LinearGradient
                colors={feeling.color}
                style={styles.feelingGradient}
              >
                <Text style={styles.feelingBubbleText}>{feeling.name}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
  titleContainer: {
    paddingHorizontal: 20,
    marginTop: 40,
    marginBottom: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 40,
  },
  circleContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  mainCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkInButton: {
    alignItems: 'center',
  },
  checkInText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '500',
    marginTop: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 60,
    marginBottom: 40,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 48,
    fontWeight: '300',
    color: '#666666',
  },
  statLabel: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 18,
  },
  feelingsContainer: {
    flex: 1,
    position: 'relative',
  },
  feelingBubble: {
    position: 'absolute',
    width: 120,
    height: 120,
  },
  feelingGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feelingBubbleText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  feelingDetailContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  feelingIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginTop: 60,
    marginBottom: 40,
  },
  feelingText: {
    fontSize: 24,
    color: '#ffffff',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  feelingName: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FFD93D',
    marginBottom: 20,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333333',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  timeText: {
    color: '#888888',
    fontSize: 14,
    marginLeft: 6,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333333',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 40,
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 14,
    marginLeft: 6,
  },
  journalContainer: {
    width: '100%',
    marginBottom: 40,
  },
  journalPrompt: {
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 16,
  },
  journalInput: {
    backgroundColor: '#333333',
    borderRadius: 16,
    padding: 20,
    minHeight: 100,
  },
  journalPlaceholder: {
    color: '#888888',
    fontSize: 16,
  },
  completeButton: {
    backgroundColor: '#ffffff',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '600',
  },
});