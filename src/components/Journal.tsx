import React, { useState, useEffect } from 'react';
import { Calendar, PenTool, ChevronLeft, ChevronRight } from 'lucide-react';
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
      year: 'numeric',
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
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Journal</h1>
        <p className="text-slate-600 dark:text-slate-400">Reflect on your thoughts and experiences</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Journal Entry */}
        <div className="lg:col-span-2 space-y-6">
          {/* Date Navigation */}
          <div className="zene-card rounded-2xl p-6 border zene-border">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="text-center">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {formatDate(selectedDate)}
                </h2>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="mt-2 px-3 py-1 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300"
                />
              </div>

              <button
                onClick={() => navigateDate('next')}
                disabled={selectedDate >= new Date().toISOString().split('T')[0]}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Journal Entry */}
          <div className="zene-card rounded-2xl p-6 border zene-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <PenTool className="text-purple-600 dark:text-purple-400" size={20} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Today's Entry
                </h3>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className={`flex items-center space-x-2 px-4 py-2 text-white rounded-lg transition-colors
                  bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-400
                  shadow-[0_0_16px_2px_rgba(16,185,129,0.4)]
                  disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed`}
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span>Save</span>
                )}
              </button>
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="How are you feeling today? What's on your mind? What are you grateful for?"
              className="w-full h-64 p-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
            />
          </div>
        </div>

        {/* Recent Entries Sidebar */}
        <div className="space-y-6">
          <div className="zene-card rounded-2xl p-6 border zene-border">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                <Calendar className="text-slate-600 dark:text-slate-400" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Recent Entries
              </h3>
            </div>

            {getRecentEntries().length > 0 ? (
              <div className="space-y-3">
                {getRecentEntries().map((log) => (
                  <button
                    key={log.id}
                    onClick={() => setSelectedDate(log.date)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${selectedDate === log.date
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                  >
                    <div className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                      {new Date(log.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                      {log.log.substring(0, 80)}...
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <PenTool className="mx-auto text-slate-400 dark:text-slate-500 mb-4" size={48} />
                <p className="text-slate-500 dark:text-slate-400">No entries yet</p>
                <p className="text-sm text-slate-400 dark:text-slate-500">Start writing your first entry</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}