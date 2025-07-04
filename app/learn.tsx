import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, BookOpen, Heart, Star } from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import AuthForm from '../components/AuthForm';

interface BookSummary {
  id: string;
  title: string;
  summary: string;
}

interface UserBookStatus {
  book_summary_id: string;
  is_favourite: boolean;
  read_at: string;
}

export default function LearnScreen() {
  const { user, loading } = useAuth();
  const [bookSummaries, setBookSummaries] = useState<BookSummary[]>([]);
  const [userBookStatuses, setUserBookStatuses] = useState<UserBookStatus[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookSummary | null>(null);

  useEffect(() => {
    if (user) {
      loadBookSummaries();
      loadUserBookStatuses();
    }
  }, [user]);

  const loadBookSummaries = async () => {
    try {
      const { data, error } = await supabase
        .from('book_summaries')
        .select('*')
        .order('title');

      if (error) throw error;
      setBookSummaries(data || []);
    } catch (error) {
      console.error('Error loading book summaries:', error);
    }
  };

  const loadUserBookStatuses = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_book_status')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setUserBookStatuses(data || []);
    } catch (error) {
      console.error('Error loading user book statuses:', error);
    }
  };

  const markAsRead = async (bookId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_book_status')
        .upsert({
          user_id: user.id,
          book_summary_id: bookId,
          read_at: new Date().toISOString().split('T')[0],
          is_favourite: false,
        });

      if (error) throw error;
      Alert.alert('Success', 'Book marked as read!');
      loadUserBookStatuses();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const toggleFavourite = async (bookId: string) => {
    if (!user) return;

    try {
      const existingStatus = userBookStatuses.find(status => status.book_summary_id === bookId);
      
      const { error } = await supabase
        .from('user_book_status')
        .upsert({
          user_id: user.id,
          book_summary_id: bookId,
          read_at: existingStatus?.read_at || new Date().toISOString().split('T')[0],
          is_favourite: !existingStatus?.is_favourite,
        });

      if (error) throw error;
      loadUserBookStatuses();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const isBookRead = (bookId: string) => {
    return userBookStatuses.some(status => status.book_summary_id === bookId);
  };

  const isBookFavourite = (bookId: string) => {
    return userBookStatuses.some(status => status.book_summary_id === bookId && status.is_favourite);
  };

  if (loading) {
    return (
      <LinearGradient colors={['#000000', '#1a1a1a']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!user) {
    return <AuthForm onAuthSuccess={() => {}} />;
  }

  if (selectedBook) {
    return (
      <LinearGradient colors={['#000000', '#1a1a1a']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setSelectedBook(null)}>
              <ArrowLeft size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Book Summary</Text>
            <TouchableOpacity onPress={() => toggleFavourite(selectedBook.id)}>
              <Heart 
                size={24} 
                color={isBookFavourite(selectedBook.id) ? "#FF6B6B" : "#ffffff"}
                fill={isBookFavourite(selectedBook.id) ? "#FF6B6B" : "transparent"}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <LinearGradient
              colors={['#333333', '#2a2a2a']}
              style={styles.bookDetailCard}
            >
              <Text style={styles.bookTitle}>{selectedBook.title}</Text>
              <Text style={styles.bookSummary}>{selectedBook.summary}</Text>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    isBookRead(selectedBook.id) && styles.actionButtonRead
                  ]}
                  onPress={() => markAsRead(selectedBook.id)}
                >
                  <Text style={[
                    styles.actionButtonText,
                    isBookRead(selectedBook.id) && styles.actionButtonTextRead
                  ]}>
                    {isBookRead(selectedBook.id) ? 'Read ✓' : 'Mark as Read'}
                  </Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#000000', '#1a1a1a']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity>
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Learn</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Book Summaries</Text>
            <Text style={styles.subtitle}>Discover wisdom from great books</Text>
          </View>

          <View style={styles.statsContainer}>
            <LinearGradient colors={['#333333', '#2a2a2a']} style={styles.statCard}>
              <BookOpen size={24} color="#4ECDC4" />
              <Text style={styles.statNumber}>{userBookStatuses.length}</Text>
              <Text style={styles.statLabel}>Books Read</Text>
            </LinearGradient>
            
            <LinearGradient colors={['#333333', '#2a2a2a']} style={styles.statCard}>
              <Star size={24} color="#FFD93D" />
              <Text style={styles.statNumber}>
                {userBookStatuses.filter(status => status.is_favourite).length}
              </Text>
              <Text style={styles.statLabel}>Favourites</Text>
            </LinearGradient>
          </View>

          <View style={styles.booksContainer}>
            {bookSummaries.map((book) => (
              <TouchableOpacity
                key={book.id}
                style={styles.bookCard}
                onPress={() => setSelectedBook(book)}
              >
                <LinearGradient
                  colors={['#333333', '#2a2a2a']}
                  style={styles.bookCardGradient}
                >
                  <View style={styles.bookCardHeader}>
                    <View style={styles.bookIcon}>
                      <BookOpen size={20} color="#4ECDC4" />
                    </View>
                    <View style={styles.bookStatus}>
                      {isBookRead(book.id) && (
                        <View style={styles.readBadge}>
                          <Text style={styles.readBadgeText}>Read</Text>
                        </View>
                      )}
                      {isBookFavourite(book.id) && (
                        <Heart size={16} color="#FF6B6B" fill="#FF6B6B" />
                      )}
                    </View>
                  </View>
                  
                  <Text style={styles.bookCardTitle}>{book.title}</Text>
                  <Text style={styles.bookCardPreview} numberOfLines={3}>
                    {book.summary}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
            
            {bookSummaries.length === 0 && (
              <Text style={styles.emptyText}>No book summaries available yet.</Text>
            )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-SemiBold',
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
    fontSize: 32,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    fontFamily: 'Inter-SemiBold',
  },
  subtitle: {
    fontSize: 16,
    color: '#888888',
    fontFamily: 'Inter-Regular',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 8,
    marginBottom: 4,
    fontFamily: 'Inter-SemiBold',
  },
  statLabel: {
    fontSize: 12,
    color: '#888888',
    fontFamily: 'Inter-Regular',
  },
  booksContainer: {
    marginBottom: 40,
  },
  bookCard: {
    marginBottom: 16,
  },
  bookCardGradient: {
    borderRadius: 16,
    padding: 20,
  },
  bookCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4ECDC420',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  readBadge: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  readBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  bookCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    fontFamily: 'Inter-SemiBold',
  },
  bookCardPreview: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
    fontFamily: 'Inter-Regular',
  },
  bookDetailCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 40,
  },
  bookTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 20,
    fontFamily: 'Inter-SemiBold',
  },
  bookSummary: {
    fontSize: 16,
    color: '#cccccc',
    lineHeight: 24,
    marginBottom: 30,
    fontFamily: 'Inter-Regular',
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  actionButtonRead: {
    backgroundColor: '#333333',
  },
  actionButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  actionButtonTextRead: {
    color: '#4ECDC4',
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 40,
    fontFamily: 'Inter-Regular',
  },
});