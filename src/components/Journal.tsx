import React, { useState, useEffect, useRef } from 'react';
import { Calendar, PenTool, ChevronLeft, ChevronRight, Save, Calendar as CalendarIcon, ArrowLeft } from 'lucide-react';
import { getJournalLogs, saveJournalLog, deleteJournalLog } from '../lib/saveData';
import type { JournalLog } from '../types';
import { Emoji } from './Emoji';
import { getVoiceMessages, saveVoiceMessage, getVoiceMessagesForDate, markVoiceMessageAsPlayed, deleteVoiceMessage } from '../lib/saveData';
import { uploadVoiceMessage } from '../lib/supabase';
import type { VoiceMessage } from '../types';

interface JournalProps {
  userId: string;
  voicePopupOpen: boolean;
  setVoicePopupOpen: (open: boolean) => void;
}

function getMonthDays(year: number, month: number) {
  // Returns an array of weeks, each week is an array of Date objects (or null for padding)
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: (Date | null)[] = [];
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }
  // Pad start
  for (let i = 0; i < firstDay.getDay(); i++) {
    days.unshift(null);
  }
  // Pad end
  while (days.length % 7 !== 0) {
    days.push(null);
  }
  // Split into weeks
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

// Helper to get YYYY-MM-DD in local time
function toLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Reusable CalendarPicker component
function CalendarPicker({
  selectedDate,
  onSelect,
  markedDates = new Set(),
  disabledDates = new Set(),
  minDate,
  trigger,
  show, setShow,
  allowFutureDates = true,
  showTodayDot = false,
  voice_recording_calendar = false,
}: {
  selectedDate: string,
  onSelect: (date: string) => void,
  markedDates?: Set<string>,
  disabledDates?: Set<string>,
  minDate?: string,
  trigger: React.ReactNode,
  show: boolean,
  setShow: (show: boolean) => void,
  allowFutureDates?: boolean,
  showTodayDot?: boolean,
  voice_recording_calendar?: boolean,
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show) return;
    function handleClickOutside(event: MouseEvent) {
      if (parentRef.current && !parentRef.current.contains(event.target as Node)) {
        setShow(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [show, setShow]);

  const selected = new Date(selectedDate);
  const [calendarMonth, setCalendarMonth] = useState(selected.getMonth());
  const [calendarYear, setCalendarYear] = useState(selected.getFullYear());
  useEffect(() => {
    const d = new Date(selectedDate);
    setCalendarMonth(d.getMonth());
    setCalendarYear(d.getFullYear());
  }, [selectedDate]);
  const monthDays = getMonthDays(calendarYear, calendarMonth);
  const todayISO = toLocalDateString(new Date());
  const today = new Date(todayISO);
  return (
    <div ref={parentRef} className="relative w-full">
      <div onClick={() => setShow(show ? false : true)}>{trigger}</div>
      {show && (
        <div
          ref={popupRef}
          className={
            voice_recording_calendar
              ? "absolute left-0 right-0 mx-auto z-50 w-full max-w-xs mt-2 bg-emerald-900/95 border border-emerald-700 rounded-2xl shadow-xl p-4 animate-fade-in"
              : "absolute left-1/2 z-50 w-[174.5%] max-w-xs mt-2 bg-emerald-900/95 border border-emerald-700 rounded-2xl shadow-xl p-4 -translate-x-1/2 animate-fade-in"
          }
          style={{ minWidth: 260 }}
        >
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => {
                if (calendarMonth === 0) {
                  setCalendarYear(y => y - 1);
                  setCalendarMonth(11);
                } else {
                  setCalendarMonth(m => m - 1);
                }
              }}
              className="px-2 py-1 text-emerald-200 hover:text-emerald-400"
              aria-label="Previous month"
            >
              &lt;
            </button>
            <span className="text-white font-semibold">
              {new Date(calendarYear, calendarMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => {
                if (calendarMonth === 11) {
                  setCalendarYear(y => y + 1);
                  setCalendarMonth(0);
                } else {
                  setCalendarMonth(m => m + 1);
                }
              }}
              className="px-2 py-1 text-emerald-200 hover:text-emerald-400"
              aria-label="Next month"
            >
              &gt;
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="text-xs text-emerald-300 text-center">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthDays.flat().map((date, idx) => {
              const iso = date ? toLocalDateString(date) : '';
              const isSelected = date && iso === selectedDate;
              const isMarked = date && markedDates.has(iso);
              const isToday = date && date.toDateString() === today.toDateString();
              let isDisabled = !date || (minDate && iso < minDate) || (disabledDates && disabledDates.has(iso));
              if (date) {
                if (allowFutureDates === false && date > today) isDisabled = true;
                if (allowFutureDates === true && date < today) isDisabled = true;
              }
              return (
                <button
                  key={idx}
                  disabled={isDisabled}
                  onClick={() => {
                    if (date && !isDisabled) {
                      onSelect(iso);
                      setShow(false);
                      setCalendarMonth(date.getMonth());
                      setCalendarYear(date.getFullYear());
                    }
                  }}
                  className={`aspect-square w-8 rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-all
                    ${isSelected ? 'bg-emerald-400 text-emerald-900' : isDisabled ? 'bg-emerald-800/30 text-white/30 cursor-not-allowed' : 'bg-emerald-800/60 text-emerald-200 hover:bg-emerald-700'}
                    ${!date ? 'opacity-0 cursor-default' : ''}`}
                  style={{ outline: isSelected ? '2px solid #34d399' : undefined }}
                >
                  {date ? date.getDate() : ''}
                  {isMarked && <span className="w-1.5 h-1.5 mt-0.5 rounded-full bg-emerald-300 block"></span>}
                  {showTodayDot && isToday && <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setShow(false)}
            className="mt-3 w-full py-2 rounded-xl bg-emerald-800/60 text-emerald-200 hover:bg-emerald-700 transition"
          >Close</button>
        </div>
      )}
    </div>
  );
}

// Helper for getting tomorrow's date in YYYY-MM-DD
function getTomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

// Modal component (reusable, similar to leaderboard element)
function Modal({ show, onClose, children }: { show: boolean, onClose: () => void, children: React.ReactNode }) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (show) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [show, onClose]);
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-emerald-900/95 border border-emerald-700 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-auto flex flex-col items-center animate-fade-in">
        {children}
      </div>
    </div>
  );
}

// Replace FullscreenPopup with Analytics-style fullscreen page for voice message
function VoiceMessagePopup({ show, onClose, children }: { show: boolean, onClose: () => void, children: React.ReactNode }) {
  const [transitioning, setTransitioning] = useState(false);
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    if (show) {
      setVisible(true);
      setTimeout(() => setTransitioning(false), 10); // allow for mount
    } else {
      setTransitioning(true);
      setTimeout(() => setVisible(false), 300); // match duration-300
    }
  }, [show]);

  if (!visible) return null;
  return (
    <div className={`fixed inset-0 z-50 min-h-screen bg-gradient-to-b from-emerald-900 to-emerald-700 flex flex-col items-center px-6 py-10 transition-all duration-300 ease-in-out ${(!show || transitioning) ? 'opacity-0 translate-y-8 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
      {/* Back button styled like analytics */}
      <div className="absolute top-0 left-0 p-4 z-50">
        <button
          className="bg-emerald-900/80 rounded-full p-2 shadow-md border border-emerald-700 text-emerald-200 hover:bg-emerald-800/90 transition"
          onClick={onClose}
          aria-label="Back to Journal"
        >
          <ArrowLeft size={22} />
        </button>
      </div>
      {/* Header */}
      <div className="text-center mb-8 mt-2">
        <div className="w-16 h-16 mb-6 flex items-center justify-center mx-auto animate-float">
          <Emoji emoji="⏳" png="hourglass.png" alt="future" size="3xl" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3" style={{ letterSpacing: '-0.03em' }}>
          Send a voice message to the future you
        </h1>
        <p className="text-white/80 text-lg max-w-sm mx-auto">
          Record a meaningful message
        </p>
      </div>
      {/* Card with form */}
      {children}
      {/* Motivational Footer */}
      <div className="mt-12 text-center w-full max-w-md mx-auto">
        <p className="text-white/60 text-sm">
          Your words today will inspire your future self.
        </p>
      </div>
    </div>
  );
}

export default function Journal({ userId, voicePopupOpen, setVoicePopupOpen }: JournalProps) {
  const [selectedDate, setSelectedDate] = useState(toLocalDateString(new Date()));
  const [content, setContent] = useState('');
  const [journalLogs, setJournalLogs] = useState<JournalLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // --- Voice Message State ---
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [reminderDate, setReminderDate] = useState<string>(getTomorrowISO());
  const [voiceTitle, setVoiceTitle] = useState('');
  const [savingVoice, setSavingVoice] = useState(false);
  const [voiceMessagesToday, setVoiceMessagesToday] = useState<VoiceMessage[]>([]);
  const [showRecorder, setShowRecorder] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  // Add state for the voice recording calendar popup
  const [showVoiceCalendar, setShowVoiceCalendar] = useState(false);

  useEffect(() => {
    loadJournalLogs();
  }, [userId]);

  useEffect(() => {
    const log = journalLogs.find(log => log.timestamp && log.timestamp.split('T')[0] === selectedDate);
    setContent(log?.log || '');
  }, [selectedDate, journalLogs]);

  // Load today's voice messages
  useEffect(() => {
    if (!userId) return;
    const today = toLocalDateString(new Date());
    getVoiceMessagesForDate(userId, today).then(setVoiceMessagesToday);
  }, [userId, savingVoice]);

  const loadJournalLogs = async () => {
    try {
      const logs = await getJournalLogs(userId);
      setJournalLogs(logs);
    } catch (error) {
      // console.error('Error loading journal logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // Always check for and delete any existing entry for the selected date first
      const existingLog = journalLogs.find(log => log.timestamp && log.timestamp.split('T')[0] === selectedDate);

      if (existingLog) {
        await deleteJournalLog(userId, existingLog.timestamp);
      }

      // Only save new entry if content is not empty
      if (content.trim()) {
        // Always save the timestamp as midnight UTC for the selected date
        const timestamp = `${selectedDate}T00:00:00.000Z`;

        const logData = {
          user_id: userId,
          log: content,
          timestamp: timestamp,
        };
        await saveJournalLog(logData);
      }

      // Reload logs to update UI
      await loadJournalLogs();
      setContent('');
    } catch (error) {
      console.error('Error saving/deleting journal entry:', error);
    } finally {
      setSaving(false);
    }
  };

  // --- Voice Recording Logic ---
  const startRecording = async () => {
    setAudioChunks([]);
    setAudioURL(null);
    setRecording(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new window.MediaRecorder(stream);
      setMediaRecorder(recorder);
      recorder.start();
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        setAudioChunks(chunks);
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioURL(URL.createObjectURL(blob));
      };
    } catch (err) {
      setRecording(false);
      alert('Could not access microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  // Save voice message (uploads to Supabase storage)
  const handleSaveVoice = async () => {
    if (!audioChunks.length || !reminderDate) return;
    setSavingVoice(true);
    try {
      // Create blob from audio chunks
      const blob = new Blob(audioChunks, { type: 'audio/webm' });

      // Upload to Supabase Storage
      const audioUrl = await uploadVoiceMessage(userId, blob);
      if (!audioUrl) {
        alert('Failed to upload audio. Please try again.');
        return;
      }

      // Save voice message with the uploaded URL
      await saveVoiceMessage({
        user_id: userId,
        audio_url: audioUrl,
        reminder_date: new Date(reminderDate).toISOString(),
        created_at: new Date().toISOString(),
        title: voiceTitle,
        played: false,
      });

      // Reset form
      setAudioChunks([]);
      setAudioURL(null);
      setReminderDate('');
      setVoiceTitle('');
      setShowRecorder(false);
    } catch (error) {
      console.error('Error saving voice message:', error);
      alert('Failed to save voice message. Please try again.');
    } finally {
      setSavingVoice(false);
    }
  };

  // Play a voice message
  const handlePlayVoice = (url: string, id: string | number) => {
    const audio = new Audio(url);
    audio.play();
    markVoiceMessageAsPlayed(id);
  };

  // Delete a voice message
  const handleDeleteVoice = (id: string | number) => {
    deleteVoiceMessage(id);
    setVoiceMessagesToday(msgs => msgs.filter(m => m.id !== id));
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedDate);
    if (direction === 'prev') {
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    setSelectedDate(toLocalDateString(currentDate));
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
      .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
      .slice(0, 5);
  };

  // Calendar state
  const selected = new Date(selectedDate);
  const [calendarMonth, setCalendarMonth] = useState(selected.getMonth());
  const [calendarYear, setCalendarYear] = useState(selected.getFullYear());
  const [showCalendar, setShowCalendar] = useState(false);
  useEffect(() => {
    const d = new Date(selectedDate);
    setCalendarMonth(d.getMonth());
    setCalendarYear(d.getFullYear());
  }, [selectedDate]);
  const monthDays = getMonthDays(calendarYear, calendarMonth);
  const journalDates = new Set(journalLogs.map(j => j.timestamp && j.timestamp.split('T')[0]));
  const todayISO = toLocalDateString(new Date());
  const today = new Date(todayISO);

  // Prepare sets for marked/disabled dates
  const journalEntryDates = new Set(journalLogs.map(j => j.timestamp && j.timestamp.split('T')[0]));
  const voiceMessageDates = new Set(voiceMessagesToday.map(m => m.reminder_date.split('T')[0]));
  const todayStr = toLocalDateString(today);

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

  // In Journal, define a handler to close the popup and cancel recording if needed
  const handleCloseVoicePopup = () => {
    // Always stop and dispose of recorder if recording
    if (mediaRecorder) {
      // Remove event handlers to prevent setting state after close
      mediaRecorder.onstop = null;
      mediaRecorder.ondataavailable = null;
      if (recording) {
        try {
          mediaRecorder.stop();
        } catch { }
      }
    }
    setRecording(false);
    setMediaRecorder(null);
    setAudioChunks([]);
    setAudioURL(null);
    setVoiceTitle('');
    setShowRecorder(false);
    setReminderDate(getTomorrowISO());
    setVoicePopupOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-4 md:px-12 lg:px-24 py-10">
      <div className="w-full max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-10">
          {/* For the journal header icon: */}
          <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4 animate-float">
            <Emoji emoji="📝" png="notebook.png" alt="journal" size="3xl" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Journal</h1>
          <p className="text-white/80 text-lg max-w-md">Reflect, write, and grow every day</p>
        </div>

        {/* --- Voice Message to Future Self Section --- */}
        <div
          className="relative flex flex-col items-center justify-center bg-emerald-900/60 rounded-2xl p-4 border border-emerald-700 cursor-pointer hover:bg-emerald-900/80 transition mb-8"
          onClick={() => setVoicePopupOpen(true)}
          role="button"
          tabIndex={0}
          onKeyPress={e => { if (e.key === 'Enter' || e.key === ' ') setVoicePopupOpen(true); }}
        >
          <span className="absolute top-3 right-4 text-xs text-white/40 font-normal" style={{ letterSpacing: 0 }}>Tap to expand</span>
          <div className="flex flex-col items-center justify-center w-full">
            <Emoji emoji="⏳" png="hourglass.png" alt="future" size="xl" />
            <span className="text-base font-normal text-emerald-100 text-center mt-2 block">
              Send a voice message to your future self
            </span>
          </div>
        </div>

        {/* --- Today's Voice Reminders --- */}
        {voiceMessagesToday.length > 0 && (
          <div className="w-full mb-10">
            <div className="bg-emerald-900/60 rounded-2xl p-4 border border-emerald-700">
              <div className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Emoji emoji="🔔" png="wave.png" alt="reminder" size="lg" />
                Today's Voice Reminders
              </div>
              <ul className="space-y-2">
                {voiceMessagesToday.map(msg => (
                  <li key={msg.id} className="flex items-center gap-3 border-b border-emerald-800 pb-2">
                    <span className="text-white flex-1">{msg.title || 'Voice Message'}</span>
                    <button
                      className="px-3 py-1 bg-emerald-400 text-emerald-900 rounded border border-emerald-700 hover:bg-emerald-300 transition"
                      onClick={() => handlePlayVoice(msg.audio_url, msg.id!)}
                    >
                      Play
                    </button>
                    <button
                      className="px-2 py-1 text-xs text-red-400 border border-red-700 rounded hover:bg-red-900/30 ml-2"
                      onClick={() => handleDeleteVoice(msg.id!)}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Entry Input/Editor */}
          <div>
            {/* Date Navigation */}
            <div className="w-full mb-8">
              <div className="bg-emerald-900/60 rounded-2xl p-4 border border-emerald-700">
                <div className="flex items-center justify-between gap-4">
                  <button
                    onClick={() => navigateDate('prev')}
                    className="w-12 h-12 bg-emerald-800/60 text-emerald-200 rounded-xl flex items-center justify-center border border-emerald-600 active:bg-emerald-700 transition"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <div className="text-center flex-1">
                    <CalendarPicker
                      selectedDate={selectedDate}
                      onSelect={setSelectedDate}
                      markedDates={journalEntryDates}
                      disabledDates={new Set()} // allow all dates
                      minDate={undefined}
                      trigger={
                        <button className="inline-flex items-center gap-2 text-lg font-bold text-white mb-2 px-3 py-1 rounded-lg border border-emerald-700 bg-emerald-900/40 hover:bg-emerald-800/80 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400">
                          <span>{formatDate(selectedDate)}</span>
                          <CalendarIcon size={20} className="text-emerald-300" />
                        </button>
                      }
                      show={showCalendar}
                      setShow={setShowCalendar}
                      allowFutureDates={false}
                      showTodayDot={false}
                    />
                  </div>

                  <button
                    onClick={() => navigateDate('next')}
                    disabled={selectedDate >= toLocalDateString(new Date())}
                    className="w-12 h-12 bg-emerald-800/60 text-emerald-200 rounded-xl flex items-center justify-center border border-emerald-600 active:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Journal Entry */}
            <div className="w-full mb-8">
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
          </div>
          {/* Journal List/Stats */}
          <div>
            {/* Recent Entries */}
            {getRecentEntries().length > 0 && (
              <div className="w-full">
                <h3 className="text-xl font-bold text-white mb-4 text-center">
                  Recent Entries
                </h3>
                <div className="space-y-3">
                  {getRecentEntries().map((log, idx) => (
                    <button
                      key={log.id ? log.id : `${log.timestamp}-${idx}`}
                      onClick={() => setSelectedDate(log.timestamp && log.timestamp.split('T')[0])}
                      className={`w-full text-left p-4 rounded-2xl transition-all ${selectedDate === (log.timestamp && log.timestamp.split('T')[0])
                        ? 'bg-emerald-400/20 border border-emerald-400/30'
                        : 'bg-emerald-900/60 border border-emerald-700 hover:bg-emerald-800/60'
                        }`}
                    >
                      <div className="text-sm font-medium text-emerald-300 mb-1">
                        {log.timestamp ? new Date(log.timestamp).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        }) : ''}
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
                <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Emoji emoji="📝" png="notebook.png" alt="journal" className="w-16 h-16 object-contain" />
                </div>
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
        </div>
      </div>

      {/* Voice Message Fullscreen Popup */}
      <VoiceMessagePopup show={voicePopupOpen} onClose={handleCloseVoicePopup}>
        {/* Date Picker styled like journal entry */}
        <div className="w-full max-w-md bg-emerald-900/60 rounded-2xl p-6 border border-emerald-700 flex flex-col items-center mx-auto" style={{ marginTop: 0, marginBottom: 0 }}>
          <div className="w-full mb-4">
            <CalendarPicker
              selectedDate={reminderDate}
              onSelect={date => { setReminderDate(date); setShowVoiceCalendar(false); }}
              markedDates={voiceMessageDates}
              disabledDates={voiceMessageDates}
              allowFutureDates={true}
              minDate={todayStr}
              voice_recording_calendar={true}
              trigger={
                <button
                  type="button"
                  className="flex items-center justify-between w-full px-3 py-2 rounded-xl border border-emerald-700 bg-emerald-900/60 hover:bg-emerald-800/80 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <span className="text-lg font-bold text-white text-left">
                    {reminderDate ? formatCalendarDate(reminderDate) : 'Select date'}
                  </span>
                  <span className="flex items-center justify-center w-10 h-10 rounded-xl ml-2">
                    <CalendarIcon size={24} className="text-emerald-300" />
                  </span>
                </button>
              }
              show={showVoiceCalendar}
              setShow={setShowVoiceCalendar}
            />
          </div>
          {/* Title Field */}
          <input
            type="text"
            className="w-full mb-4 px-4 py-2 rounded-lg bg-emerald-900/80 border border-emerald-700 text-white placeholder-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
            placeholder="Title (optional)"
            value={voiceTitle}
            onChange={e => setVoiceTitle(e.target.value)}
          />
          {/* Audio Preview */}
          {audioURL && (
            <div className="w-full mb-4 flex flex-col items-center">
              <div className="w-full bg-emerald-900/80 border border-emerald-700 rounded-xl p-3 flex items-center gap-3">
                <button
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-400 text-emerald-900 hover:bg-emerald-300 transition focus:outline-none"
                  onClick={() => {
                    const audio = document.getElementById('voice-audio-preview') as HTMLAudioElement;
                    if (audio) {
                      if (audio.paused) audio.play(); else audio.pause();
                    }
                  }}
                  type="button"
                >
                  <svg id="audio-play-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </button>
                <div className="flex-1 flex flex-col">
                  <audio
                    id="voice-audio-preview"
                    src={audioURL}
                    className="w-full"
                    controls={false}
                    preload="auto"
                    onPlay={e => {
                      const icon = document.getElementById('audio-play-icon');
                      if (icon) icon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
                    }}
                    onPause={e => {
                      const icon = document.getElementById('audio-play-icon');
                      if (icon) icon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3" />';
                    }}
                  />
                  <div className="w-full h-1 bg-emerald-800 rounded mt-2 relative">
                    {/* Progress bar will be handled by audio element events if needed */}
                  </div>
                </div>
              </div>
            </div>
          )}
          {!recording && (
            <button
              className="w-full py-3 mb-3 bg-emerald-400 text-emerald-900 font-bold text-base rounded-xl shadow-lg active:bg-emerald-300 transition"
              onClick={startRecording}
              disabled={recording || savingVoice}
            >
              Start Recording
            </button>
          )}
          {recording && (
            <button
              className="w-full py-3 mb-3 bg-red-400 text-red-900 font-bold text-base rounded-xl shadow-lg active:bg-red-300 transition"
              onClick={stopRecording}
              disabled={savingVoice}
            >
              Stop Recording
            </button>
          )}
          <button
            className="w-full py-3 bg-emerald-400 text-emerald-900 font-bold text-base rounded-xl shadow-lg active:bg-emerald-300 transition"
            onClick={handleSaveVoice}
            disabled={!audioChunks.length || !reminderDate || savingVoice}
          >
            Save Message
          </button>
        </div>
      </VoiceMessagePopup>
    </div>
  );
}

// Helper for formatting calendar date (e.g., Monday, July 14)
function formatCalendarDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}