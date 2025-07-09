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
      <div className="min-h-screen bg-gradient-to-b from-emerald-900 to-emerald-700 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 loading-spinner mx-auto mb-4"></div>
          <p className="text-white/80 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 to-emerald-700 flex flex-col items-center px-6 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-6 animate-float">📝</div>
        <h1 className="text-3xl font-bold text-white mb-3" style={{ letterSpacing: '-0.03em' }}>
          Daily Journal
        </h1>
        <p className="text-white/80 text-lg max-w-sm mx-auto">
          Reflect on your thoughts and feelings
        </p>
      </div>

      {/* Date Navigation */}
      <div className="w-full max-w-sm mb-8">
        <div className="bg-emerald-900/60 rounded-2xl p-4 border border-emerald-700">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => navigateDate('prev')}
              className="w-12 h-12 bg-emerald-800/60 text-emerald-200 rounded-xl flex items-center justify-center border border-emerald-600 active:bg-emerald-700 transition"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="text-center flex-1">
              <h2 className="text-lg font-bold text-white mb-2">
                {formatDate(selectedDate)}
              </h2>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-emerald-800/60 text-emerald-200 border border-emerald-600 rounded-lg px-3 py-1 text-sm focus:outline-none focus:border-emerald-400 transition"
              />
            </div>

            <button
              onClick={() => navigateDate('next')}
              disabled={selectedDate >= new Date().toISOString().split('T')[0]}
              className="w-12 h-12 bg-emerald-800/60 text-emerald-200 rounded-xl flex items-center justify-center border border-emerald-600 active:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Journal Entry */}
      <div className="w-full max-w-sm mb-8">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="How are you feeling today? What's on your mind? What are you grateful for?"
          className="w-full h-48 py-4 px-6 bg-emerald-900/60 text-white placeholder-emerald-300 rounded-2xl border border-emerald-700 focus:outline-none focus:border-emerald-400 transition resize-none"
          style={{ fontFamily: 'Inter, sans-serif' }}
        />
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-4 py-4 px-6 bg-emerald-400 text-emerald-900 font-bold text-lg rounded-2xl shadow-lg active:bg-emerald-300 transition disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-emerald-900 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Save size={20} />
              <span>Save Entry</span>
            </>
          )}
        </button>
      </div>

      {/* Recent Entries */}
      {getRecentEntries().length > 0 && (
        <div className="w-full max-w-sm">
          <h3 className="text-xl font-bold text-white mb-4 text-center">
            Recent Entries
          </h3>
          <div className="space-y-3">
            {getRecentEntries().map((log) => (
              <button
                key={log.id}
                onClick={() => setSelectedDate(log.date)}
                className={`w-full text-left p-4 rounded-2xl transition-all ${
                  selectedDate === log.date
                    ? 'bg-emerald-400/20 border border-emerald-400/30'
                    : 'bg-emerald-900/60 border border-emerald-700 hover:bg-emerald-800/60'
                }`}
              >
                <div className="text-sm font-medium text-emerald-300 mb-1">
                  {new Date(log.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div className="text-sm text-white line-clamp-2">
                  {log.log.substring(0, 80)}...
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {getRecentEntries().length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">✨</div>
          <h3 className="text-xl font-bold text-white mb-2">No entries yet</h3>
          <p className="text-white/70">Start writing your first entry above</p>
        </div>
      )}

      {/* Motivational Footer */}
      <div className="mt-12 text-center">
        <p className="text-white/60 text-sm">
          Your thoughts today shape your tomorrow.
        </p>
      </div>
    </div>
  );
}