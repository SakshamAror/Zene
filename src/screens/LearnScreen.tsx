import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getBookSummaries, getUserBookStatus, upsertUserBookStatus } from '../lib/saveData';
import type { BookSummary, UserBookStatus } from '../types';

interface LearnScreenProps {
  userId: string;
}

export default function LearnScreen({ userId }: LearnScreenProps) {
  const [bookSummaries, setBookSummaries] = useState<BookSummary[]>([]);
  const [userBookStatus, setUserBookStatus] = useState<UserBookStatus[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookSummary | null>(null);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      const [summaries, status] = await Promise.all([
        getBookSummaries(),
        getUserBookStatus(userId),
      ]);
      setBookSummaries(summaries);
      setUserBookStatus(status);
    } catch (error) {
      console.error('Error loading learn data:', error);
    }
  };

  const handleBookPress = async (book: BookSummary) => {
    setSelectedBook(book);
    
    // Mark as read
    try {
      await upsertUserBookStatus({
        user_id: userId,
        book_summary_id: book.id,
        is_favourite: isBookFavourite(book.id),
        read_at: new Date().toISOString().split('T')[0],
      });
      
      // Refresh user book status
      const status = await getUserBookStatus(userId);
      setUserBookStatus(status);
    } catch (error) {
      console.error('Error marking book as read:', error);
    }
  };

  const toggleFavourite = async (bookId: string) => {
    const currentStatus = userBookStatus.find(status => status.book_summary_id === bookId);
    const isFavourite = currentStatus?.is_favourite || false;
    
    try {
      await upsertUserBookStatus({
        user_id: userId,
        book_summary_id: bookId,
        is_favourite: !isFavourite,
        read_at: currentStatus?.read_at || new Date().toISOString().split('T')[0],
      });
      
      // Refresh user book status
      const status = await getUserBookStatus(userId);
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

  if (selectedBook) {
    return (
      <ScrollView className="flex-1 bg-gradient-to-br from-amber-25 via-orange-25 to-yellow-25">
        <View className="p-4">
          <View className="bg-white rounded-xl p-6 border border-amber-200">
            <View className="flex-row items-center justify-between mb-4">
              <Pressable
                onPress={() => setSelectedBook(null)}
                className="p-2 rounded-full bg-amber-100"
              >
                <Ionicons name="arrow-back" size={24} color="#92400e" />
              </Pressable>
              
              <Pressable
                onPress={() => toggleFavourite(selectedBook.id)}
                className="p-2 rounded-full bg-amber-100"
              >
                <Ionicons
                  name={isBookFavourite(selectedBook.id) ? 'heart' : 'heart-outline'}
                  size={24}
                  color={isBookFavourite(selectedBook.id) ? '#dc2626' : '#92400e'}
                />
              </Pressable>
            </View>
            
            <Text className="text-2xl font-bold text-amber-900 mb-4">
              {selectedBook.title}
            </Text>
            
            <Text className="text-amber-700 leading-relaxed">
              {selectedBook.summary}
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gradient-to-br from-amber-25 via-orange-25 to-yellow-25">
      <View className="p-4 space-y-6">
        <View className="bg-white rounded-xl p-6 border border-amber-200">
          <Text className="text-2xl font-bold text-amber-900 mb-2">
            Learn & Grow
          </Text>
          <Text className="text-amber-700">
            Discover wisdom from great minds and expand your knowledge.
          </Text>
        </View>

        <View className="bg-white rounded-xl p-6 border border-amber-200">
          <Text className="text-xl font-bold text-amber-900 mb-4">
            Book Summaries
          </Text>
          
          <View className="space-y-3">
            {bookSummaries.map((book) => (
              <Pressable
                key={book.id}
                onPress={() => handleBookPress(book)}
                className="p-4 rounded-lg border border-amber-200 bg-amber-25"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 mr-3">
                    <Text className="text-lg font-bold text-amber-900 mb-1">
                      {book.title}
                    </Text>
                    <Text className="text-amber-700 text-sm" numberOfLines={2}>
                      {book.summary}
                    </Text>
                  </View>
                  
                  <View className="flex-row items-center space-x-2">
                    {isBookRead(book.id) && (
                      <View className="w-2 h-2 rounded-full bg-green-500" />
                    )}
                    
                    <Pressable
                      onPress={() => toggleFavourite(book.id)}
                      className="p-1"
                    >
                      <Ionicons
                        name={isBookFavourite(book.id) ? 'heart' : 'heart-outline'}
                        size={20}
                        color={isBookFavourite(book.id) ? '#dc2626' : '#d97706'}
                      />
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}