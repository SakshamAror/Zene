import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { RotateCw } from 'lucide-react-native';
import { saveJournalLog } from '@/lib/saveData';

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
    <View style={styles.container}>
      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder="How are you feeling today? What's on your mind?"
        placeholderTextColor="#fbbf24"
        style={styles.textInput}
        multiline
        textAlignVertical="top"
      />
      {isSaving && (
        <View style={styles.savingIndicator}>
          <RotateCw size={16} color="#fbbf24" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  textInput: {
    width: '100%',
    height: 96,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 8,
    padding: 12,
    color: '#92400e',
    fontSize: 16,
    textAlignVertical: 'top',
  },
  savingIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});