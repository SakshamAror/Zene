import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, BookOpen, Heart, Star } from 'lucide-react-native';
import { router } from 'expo-router';

export default function LearnScreen() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'mindfulness', label: 'Mindfulness' },
    { id: 'productivity', label: 'Productivity' },
    { id: 'wellness', label: 'Wellness' },
  ];

  const bookSummaries = [
    {
      id: 1,
      title: 'The Power of Now',
      author: 'Eckhart Tolle',
      category: 'mindfulness',
      summary: 'A guide to spiritual enlightenment through present-moment awareness...',
      image: 'https://images.pexels.com/photos/1029141/pexels-photo-1029141.jpeg?auto=compress&cs=tinysrgb&w=400',
      isFavorite: true,
      readTime: '8 min read'
    },
    {
      id: 2,
      title: 'Atomic Habits',
      author: 'James Clear',
      category: 'productivity',
      summary: 'An easy and proven way to build good habits and break bad ones...',
      image: 'https://images.pexels.com/photos/1029141/pexels-photo-1029141.jpeg?auto=compress&cs=tinysrgb&w=400',
      isFavorite: false,
      readTime: '12 min read'
    },
    {
      id: 3,
      title: 'The Miracle Morning',
      author: 'Hal Elrod',
      category: 'wellness',
      summary: 'The not-so-obvious secret guaranteed to transform your life...',
      image: 'https://images.pexels.com/photos/1029141/pexels-photo-1029141.jpeg?auto=compress&cs=tinysrgb&w=400',
      isFavorite: true,
      readTime: '10 min read'
    },
    {
      id: 4,
      title: 'Mindfulness in Plain English',
      author: 'Bhante Henepola Gunaratana',
      category: 'mindfulness',
      summary: 'A practical guide to meditation and mindfulness practice...',
      image: 'https://images.pexels.com/photos/1029141/pexels-photo-1029141.jpeg?auto=compress&cs=tinysrgb&w=400',
      isFavorite: false,
      readTime: '15 min read'
    },
  ];

  const filteredBooks = selectedCategory === 'all' 
    ? bookSummaries 
    : bookSummaries.filter(book => book.category === selectedCategory);

  return (
    <LinearGradient colors={['#000000', '#1a1a1a']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Learn</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Book Summaries</Text>
            <Text style={styles.subtitle}>Discover wisdom from the world's best books</Text>
          </View>

          <View style={styles.categoriesContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categories}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    onPress={() => setSelectedCategory(category.id)}
                    style={[
                      styles.categoryButton,
                      selectedCategory === category.id && styles.categoryButtonActive
                    ]}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      selectedCategory === category.id && styles.categoryButtonTextActive
                    ]}>
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.booksContainer}>
            {filteredBooks.map((book) => (
              <TouchableOpacity key={book.id} style={styles.bookCard}>
                <LinearGradient
                  colors={['#333333', '#2a2a2a']}
                  style={styles.bookCardGradient}
                >
                  <View style={styles.bookHeader}>
                    <Image source={{ uri: book.image }} style={styles.bookImage} />
                    <View style={styles.bookInfo}>
                      <Text style={styles.bookTitle}>{book.title}</Text>
                      <Text style={styles.bookAuthor}>by {book.author}</Text>
                      <Text style={styles.readTime}>{book.readTime}</Text>
                    </View>
                    <TouchableOpacity style={styles.favoriteButton}>
                      <Heart 
                        size={20} 
                        color={book.isFavorite ? "#FF6B6B" : "#666666"}
                        fill={book.isFavorite ? "#FF6B6B" : "transparent"}
                      />
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={styles.bookSummary}>{book.summary}</Text>
                  
                  <View style={styles.bookFooter}>
                    <View style={styles.categoryTag}>
                      <Text style={styles.categoryTagText}>{book.category}</Text>
                    </View>
                    <TouchableOpacity style={styles.readButton}>
                      <BookOpen size={16} color="#000000" />
                      <Text style={styles.readButtonText}>Read</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
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
  titleContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888888',
  },
  categoriesContainer: {
    marginBottom: 30,
  },
  categories: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#333333',
    borderRadius: 20,
  },
  categoryButtonActive: {
    backgroundColor: '#4ECDC4',
  },
  categoryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#000000',
  },
  booksContainer: {
    gap: 20,
    marginBottom: 40,
  },
  bookCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  bookCardGradient: {
    padding: 20,
  },
  bookHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  bookImage: {
    width: 60,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 8,
  },
  readTime: {
    fontSize: 12,
    color: '#4ECDC4',
  },
  favoriteButton: {
    padding: 8,
  },
  bookSummary: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
    marginBottom: 16,
  },
  bookFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTag: {
    backgroundColor: '#4ECDC420',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryTagText: {
    fontSize: 12,
    color: '#4ECDC4',
    fontWeight: '500',
  },
  readButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  readButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
});