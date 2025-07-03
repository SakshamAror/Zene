import React, { useState, useEffect } from 'react';
import { saveJournalLog } from '../lib/saveData';

interface JournalEntryProps {
  userId: string;
  initialContent: string;
  onContentChange: (content: string) => void;
}

export default function JournalEntry({ userId, initialContent, onContentChange }: JournalEntryProps) {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);

  // Update local content when initial content changes (e.g., when switching dates)
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  // Auto-save with debouncing
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

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  return (
    <div className="relative">
      <textarea
        value={content}
        onChange={handleChange}
        placeholder="How are you feeling today? What's on your mind?"
        className="w-full h-24 bg-white border border-amber-200 rounded-lg p-3 text-amber-800 placeholder-amber-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent"
        style={{
          fontFamily: 'Crimson Text, serif',
          lineHeight: '1.6',
        }}
      />
      {isSaving && (
        <div className="absolute top-2 right-2">
          <svg
            className="animate-spin h-4 w-4 text-amber-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            ></path>
          </svg>
        </div>
      )}
    </div>
  );
}