import React, { useState, useEffect } from 'react';
import { Calendar, PenTool, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { getJournalLogs, saveJournalLog } from '../lib/saveData';
import type { JournalLog } from '../types';

interface JournalProps {
  userId: string;
}

export default function Journal({ userId }: JournalProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [content, setContent] = useState('');
  const [journalLogs, setJournalLogs] = useState<JournalLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadJournalLogs();
  }, [userId]);

  useEffect(() => {
    const log = journalLogs.find(log => log.date === selectedDate);
    setContent(log?.log || '');
  }, [selectedDate, journalLogs]);

  const loadJournalLogs = async () => {
    try {
      const logs = await getJournalLogs(userId);
      setJournalLogs(logs);
    } catch (error) {
      console.error('Error loading journal logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (saving) return;

    setSaving(true);
    try {
      const logData = {
        user_id: userId,
        log: content,
        date: selectedDate,
      };

      await saveJournalLog(logData);

      // Update local state
      setJournalLogs(prev => {
        const existing = prev.find(log => log.date === selectedDate);
        if (existing) {
          return prev.map(log =>
            log.date === selectedDate ? { ...log, log: content } : log
          );
        } else {
          return [...prev, { ...logData, id: Date.now() }];
        }
      });
    } catch (error) {
      console.error('Error saving journal entry:', error);
    } finally {
      setSaving(false);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedDate);
    if (direction === 'prev') {
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  const getRecentEntries = () => {
    return journalLogs
      .filter(log => log.log.trim())
      .slice(0, 5);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 mt-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-2">JOURNAL</h1>
        <div className="w-full flex justify-center">
          <div className="h-px w-full max-w-lg bg-emerald-400/30 mt-4 mb-2"></div>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="opal-card p-4 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => navigateDate('prev')}
            className="opal-button-secondary p-2 sm:p-3 rounded-xl flex-shrink-0"
          >
            <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
          </button>

          <div className="text-center flex-1 min-w-0">
            <h2 className="text-lg sm:mobile-text-xl font-bold text-primary truncate">
              {formatDate(selectedDate)}
            </h2>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="mt-2 opal-input text-center text-xs sm:text-sm w-full max-w-[140px] mx-auto"
            />
          </div>

          <button
            onClick={() => navigateDate('next')}
            disabled={selectedDate >= new Date().toISOString().split('T')[0]}
            className="opal-button-secondary p-2 sm:p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <ChevronRight size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Journal Entry */}
      <div className="opal-card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="icon-bg icon-bg-purple">
              <PenTool size={20} />
            </div>
            <h3 className="text-lg sm:mobile-text-lg font-semibold text-primary">
              Today's Entry
            </h3>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="opal-button flex items-center justify-center space-x-2 disabled:opacity-50 px-4 py-2 sm:px-6 sm:py-3"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Save size={16} />
                <span>Save</span>
              </>
            )}
          </button>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="How are you feeling today? What's on your mind? What are you grateful for?"
          className="opal-input w-full h-48 sm:h-64 resize-none text-sm sm:text-base"
          style={{ fontFamily: 'Inter, sans-serif' }}
        />
      </div>

      {/* Recent Entries */}
      <div className="opal-card p-4 sm:p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="icon-bg icon-bg-blue">
            <Calendar size={20} />
          </div>
          <h3 className="text-lg sm:mobile-text-lg font-semibold text-primary">
            Recent Entries
          </h3>
        </div>

        {getRecentEntries().length > 0 ? (
          <div className="space-y-3">
            {getRecentEntries().map((log) => (
              <button
                key={log.id}
                onClick={() => setSelectedDate(log.date)}
                className={`w-full text-left p-3 sm:p-4 rounded-xl transition-colors ${selectedDate === log.date
                  ? 'bg-emerald-500/20 border border-emerald-500/30'
                  : 'opal-card-dark hover:bg-white/10'
                  }`}
              >
                <div className="text-xs sm:text-sm font-medium text-primary mb-1">
                  {new Date(log.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div className="text-xs sm:text-sm text-secondary line-clamp-2">
                  {log.log.substring(0, 80)}...
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <PenTool className="mx-auto text-secondary mb-4" size={48} />
            <p className="text-secondary">No entries yet</p>
            <p className="text-sm text-tertiary">Start writing your first entry</p>
          </div>
        )}
      </div>
    </div>
  );
}