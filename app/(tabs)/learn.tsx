import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Heart } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import AuthForm from '../../components/AuthForm';
import {
  getBookSummaries,
  getUserBookStatus,
  upsertUserBookStatus,
} from '../../lib/saveData';
import type { BookSummary, UserBookStatus } from '../../types';

export default function LearnScreen() {
  const { user, loading } = useAuth();
  const [bookSummaries, setBookSummaries] = useState<BookSummary[]>([]);
  const [userBookStatus, setUserBookStatus] = useState<UserBookStatus[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookSummary | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      const [summaries, status] = await Promise.all([
        getBookSummaries(),
        getUserBookStatus(user.id),
      ]);
      setBookSummaries(summaries);
      setUserBookStatus(status);
    } catch (error) {
      console.error('Error loading learn data:', error);
    }
  };

  const handleBookPress = async (book: BookSummary) => {
    setSelectedBook(book);
    
    if (!user) return;
    
    // Mark as read
    try {
      await upsertUserBookStatus({
        user_id: user.id,
        book_summary_id: book.id,
        is_favourite: isBookFavourite(book.id),
        read_at: new Date().toISOString().split('T')[0],
      });
      
      // Refresh user book status
      const status = await getUserBookStatus(user.id);
      setUserBookStatus(status);
    } catch (error) {
      console.error('Error marking book as read:', error);
    }
  };

  const toggleFavourite = async (bookId: string) => {
    if (!user) return;
    
    const currentStatus = userBookStatus.find(status => status.book_summary_id === bookId);
    const isFavourite = currentStatus?.is_favourite || false;
    
    try {
      await upsertUserBookStatus({
        user_id: user.id,
        book_summary_id: bookId,
        is_favourite: !isFavourite,
        read_at: currentStatus?.read_at || new Date().toISOString().split('T')[0],
      });
      
      // Refresh user book status
      const status = await getUserBookStatus(user.id);
      setUserBookStatus(status);
    } catch (error) {
      console.error('Error toggling favourite:', error);
    }
  };

  const isBookRead = (bookId: string) => {
    return userBookStatus.some(status => status.book_summary_id === bookId);
  };

  const isBookFavourite = (bookId: string) => {
    const status = userBookStatus.find(status => status.book_summary_id === bookId);
    return status?.is_favourite || false;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return <AuthForm onAuthSuccess={() => {}} />;
  }

  if (selectedBook) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <View style={styles.bookHeader}>
              <Pressable
                onPress={() => setSelectedBook(null)}
                style={styles.backButton}
              >
                <ArrowLeft size={24} color="#92400e" />
              </Pressable>
              
              <Pressable
                onPress={() => toggleFavourite(selectedBook.id)}
                style={styles.favoriteButton}
              >
                <Heart
                  size={24}
                  color={isBookFavourite(selectedBook.id) ? '#dc2626' : '#92400e'}
                  fill={isBookFavourite(selectedBook.id) ? '#dc2626' : 'none'}
                />
              </Pressable>
            </View>
            
            <Text style={styles.bookTitle}>
              {selectedBook.title}
            </Text>
            
            <Text style={styles.bookSummary}>
              {selectedBook.summary}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Learn & Grow</Text>
          <Text style={styles.subtitle}>
            Discover wisdom from great minds and expand your knowledge.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Book Summaries</Text>
          
          <View style={styles.booksList}>
            {bookSummaries.map((book) => (
              <Pressable
                key={book.id}
                onPress={() => handleBookPress(book)}
                style={styles.bookItem}
              >
                <View style={styles.bookContent}>
                  <View style={styles.bookInfo}>
                    <Text style={styles.bookItemTitle}>
                      {book.title}
                    </Text>
                    <Text style={styles.bookItemSummary} numberOfLines={2}>
                      {book.summary}
                    </Text>
                  </View>
                  
                  <View style={styles.bookActions}>
                    {isBookRead(book.id) && (
                      <View style={styles.readIndicator} />
                    )}
                    
                    <Pressable
                      onPress={() => toggleFavourite(book.id)}
                      style={styles.favoriteButtonSmall}
                    >
                      <Heart
                        size={20}
                        color={isBookFavourite(book.id) ? '#dc2626' : '#d97706'}
                        fill={isBookFavourite(book.id) ? '#dc2626' : 'none'}
                      />
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fffdf7',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fffdf7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#92400e',
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#b45309',
    fontWeight: '500',
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 16,
  },
  bookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#fef3c7',
  },
  favoriteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#fef3c7',
  },
  bookTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 16,
  },
  bookSummary: {
    fontSize: 16,
    color: '#b45309',
    lineHeight: 24,
  },
  booksList: {
    gap: 12,
  },
  bookItem: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
    backgroundColor: '#fffdf7',
  },
  bookContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bookInfo: {
    flex: 1,
    marginRight: 12,
  },
  bookItemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 4,
  },
  bookItemSummary: {
    fontSize: 14,
    color: '#b45309',
  },
  bookActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  readIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  favoriteButtonSmall: {
    padding: 4,
  },
});