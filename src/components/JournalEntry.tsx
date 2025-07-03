import React, { useState, useEffect } from 'react';
import { View, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { saveJournalLog } from '../lib/saveData';

interface JournalEntryProps {
  userId: string;
  initialContent: string;
  onContentChange: (content: string) => void;
}

export default function JournalEntry({ userId, initialContent, onContentChange }: JournalEntryProps) {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  useEffect(() => {
    if (content.trim() && content !== initialContent) {
      const timeoutId = setTimeout(async () => {
        setIsSaving(true);
        try {
          const today = new Date().toISOString().split('T')[0];
          await saveJournalLog({
            user_id: userId,
            log: content,
            date: today,
          });
          onContentChange(content);
        } catch (error) {
          console.error('Error saving journal entry:', error);
        } finally {
          setIsSaving(false);
        }
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [content, userId, initialContent, onContentChange]);

  return (
    <View className="relative">
      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder="How are you feeling today? What's on your mind?"
        placeholderTextColor="#fbbf24"
        className="w-full h-24 bg-white border border-amber-200 rounded-lg p-3 text-amber-800"
        multiline
        textAlignVertical="top"
      />
      {isSaving && (
        <View className="absolute top-2 right-2">
          <Ionicons name="sync" size={16} color="#fbbf24" />
        </View>
      )}
    </View>
  );
}