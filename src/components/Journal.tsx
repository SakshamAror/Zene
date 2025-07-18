import React, { useState, useEffect, useRef } from 'react';
import { Calendar, PenTool, ChevronLeft, ChevronRight, Save, Calendar as CalendarIcon, ArrowLeft } from 'lucide-react';
import { getJournalLogs, saveJournalLog, deleteJournalLog } from '../lib/saveData';
import type { JournalLog } from '../types';
import { Emoji } from './Emoji';
import { getVoiceMessages, saveVoiceMessage, getVoiceMessagesForDate, markVoiceMessageAsPlayed, deleteVoiceMessage } from '../lib/saveData';
import { uploadVoiceMessage, supabase } from '../lib/supabase';
import type { VoiceMessage } from '../types';
import { offlineStorage } from '../lib/offlineStorage';

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
                // if (allowFutureDates === true && date < today) isDisabled = true;
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
  // All hooks at the top level (useState, useEffect, useRef, etc.)
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

  // Add state for voice message playback feedback
  const [playingMessageId, setPlayingMessageId] = useState<string | number | null>(null);
  const [loadingMessageId, setLoadingMessageId] = useState<string | number | null>(null);
  const [showRemindersSection, setShowRemindersSection] = useState(true);

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
    getVoiceMessagesForDate(userId, today).then(messages => {
      setVoiceMessagesToday(messages);
    });
  }, [userId, savingVoice]);

  useEffect(() => {
    // Always try to sync offline storage with Supabase on mount if online
    if (offlineStorage && typeof offlineStorage.forceSync === 'function' && userId) {
      offlineStorage.forceSync(userId);
    }
  }, [userId]);

  useEffect(() => {
    // If there is any unplayed message, open the reminders section by default
    if (voiceMessagesToday.some(msg => !msg.played)) {
      setShowRemindersSection(true);
    }
    // Optionally, you could auto-close if all are played, but user may want to keep it open
  }, [voiceMessagesToday]);

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
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [animationId, setAnimationId] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Timer logic
  useEffect(() => {
    if (recording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 0.1);
      }, 100);
    } else if (!recording || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recording, isPaused]);

  // Waveform drawing
  useEffect(() => {
    if (!analyser || !canvasRef.current || !recording) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    function draw() {
      if (!analyser || !ctx) return;
      analyser.getByteTimeDomainData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fbbf24';
      ctx.beginPath();
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      setAnimationId(requestAnimationFrame(draw));
    }
    draw();
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [analyser, recording]);

  // Start Recording (with waveform)
  const startRecording = async () => {
    setAudioChunks([]);
    setAudioURL(null);
    setRecording(true);
    setIsPaused(false);
    setRecordingTime(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
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
      // Web Audio API for waveform
      const ctx = new window.AudioContext();
      setAudioContext(ctx);
      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 128;
      source.connect(analyserNode);
      setAnalyser(analyserNode);
    } catch (err) {
      setRecording(false);
      alert('Could not access microphone.');
    }
  };

  // Pause/Resume Recording
  const pauseRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
      setIsPaused(true);
    }
  };
  const resumeRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume();
      setIsPaused(false);
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
      setIsPaused(false);
      setRecordingTime(0);
      if (audioContext) {
        audioContext.close();
        setAudioContext(null);
      }
      setAnalyser(null);
      if (animationId) cancelAnimationFrame(animationId);
      // Stop all tracks in the stream to remove the recording indicator
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  // Define handleSaveVoice as a plain async function
  const handleSaveVoice = async () => {
    if (!audioChunks.length || !reminderDate) return;
    setSavingVoice(true);
    try {
      // Create blob from audio chunks
      const blob = new Blob(audioChunks, { type: 'audio/webm' });

      // Upload to Supabase Storage
      const audioPath = await uploadVoiceMessage(userId, blob);

      if (!audioPath) {
        // Fallback: save locally if Supabase upload fails
        console.log('Supabase upload failed, saving locally for testing');
        const localAudioUrl = URL.createObjectURL(blob);

        // Save voice message with the local URL (deprecated field)
        await saveVoiceMessage({
          user_id: userId,
          audio_path: '',
          audio_url: localAudioUrl,
          reminder_date: new Date(reminderDate).toISOString(),
          created_at: new Date().toISOString(),
          title: voiceTitle,
          played: false,
        });

        alert('Voice message saved locally (Supabase upload failed). You can test the reminder functionality.');
      } else {
        // Save voice message with the uploaded path
        await saveVoiceMessage({
          user_id: userId,
          audio_path: audioPath,
          reminder_date: new Date(reminderDate).toISOString(),
          created_at: new Date().toISOString(),
          title: voiceTitle,
          played: false,
        });
      }

      // Reset form
      setAudioChunks([]);
      setAudioURL(null);
      setReminderDate('');
      setVoiceTitle('');
      setShowRecorder(false);
      setVoicePopupOpen(false);
      // Always reload from Supabase after saving
      await fetchVoiceMessagesToday();
    } catch (error) {
      console.error('Error saving voice message:', error);
      alert('Failed to save voice message. Please try again.');
    } finally {
      setSavingVoice(false);
    }
  };

  // Play a voice message
  const handlePlayVoice = async (audio_path: string, id: string | number) => {
    console.log('Playing voice message:', { audio_path, id, userId });

    // Validate inputs
    if (!audio_path && !audioURL) {
      alert('No audio file available');
      return;
    }

    if (!id || id === 'undefined' || id === undefined) {
      console.error('Invalid voice message ID:', id);
      alert('Invalid voice message ID');
      return;
    }

    // Stop any currently playing message
    if (playingMessageId && playingMessageId !== id) {
      setPlayingMessageId(null);
    }

    // Set loading state
    setLoadingMessageId(id);

    try {
      let playbackUrl = '';
      if (audio_path) {
        // For private buckets, generate a fresh signed URL
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('voice-messages')
          .createSignedUrl(audio_path, 3600); // 1 hour expiry

        if (signedUrlError) {
          console.error('Signed URL error:', signedUrlError);
          alert('Failed to generate access URL for audio file.');
          setLoadingMessageId(null);
          return;
        }
        playbackUrl = signedUrlData?.signedUrl;
      } else if (audioURL) {
        // Fallback for legacy/local files
        playbackUrl = audioURL;
      }
      if (!playbackUrl) {
        alert('Failed to generate access URL for audio file.');
        setLoadingMessageId(null);
        return;
      }
      console.log('Playback URL:', playbackUrl);

      // Try to play the audio with the signed URL or fallback
      const audio = new Audio(playbackUrl);

      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        alert('Failed to play audio. The file may be corrupted or inaccessible.');
        setLoadingMessageId(null);
        setPlayingMessageId(null);
      });

      audio.addEventListener('canplaythrough', () => {
        // Mark as played only when audio can actually play
        if (id === undefined || id === null || id === 'undefined') {
          console.error('markVoiceMessageAsPlayed called with invalid id:', id);
          return;
        }
        markVoiceMessageAsPlayed(id);
      });

      audio.addEventListener('play', () => {
        setLoadingMessageId(null);
        setPlayingMessageId(id);
      });

      audio.addEventListener('pause', () => {
        setPlayingMessageId(null);
      });

      audio.addEventListener('ended', async () => {
        setPlayingMessageId(null);
        // Mark as played in Supabase and refresh UI
        if (!id || id === 'undefined' || typeof id !== 'string' || !/^([0-9a-fA-F-]{36})$/.test(id)) {
          console.error('Invalid voice message ID for markVoiceMessageAsPlayed:', id);
          alert('Error: Invalid voice message ID. Cannot mark as played.');
        } else {
          console.log('Marking voice message as played. ID:', id);
          try {
            await markVoiceMessageAsPlayed(id);
          } catch (err) {
            console.error('Failed to mark as played:', err);
          }
        }
        const today = toLocalDateString(new Date());
        getVoiceMessagesForDate(userId, today).then(messages => {
          setVoiceMessagesToday(messages);
        });
      });

      audio.play().catch(error => {
        console.error('Audio play error:', error);
        alert('Failed to play audio. Please try again.');
        setLoadingMessageId(null);
        setPlayingMessageId(null);
      });
    } catch (error) {
      console.error('Error generating signed URL:', error);
      alert('Failed to access audio file. Please try again.');
      setLoadingMessageId(null);
    }
  };

  // Delete a voice message
  const handleDeleteVoice = async (id: string | number, audio_path: string) => {
    if (audio_path) {
      try {
        await supabase.storage.from('voice-messages').remove([audio_path]);
      } catch (err) {
        console.error('Error deleting audio file from storage:', err);
      }
    }
    await deleteVoiceMessage(id);
    // Always reload from server after delete
    const today = toLocalDateString(new Date());
    const messages = await getVoiceMessagesForDate(userId, today);
    setVoiceMessagesToday(messages);
    // Reset playing states if the deleted message was playing
    if (playingMessageId === id) {
      setPlayingMessageId(null);
    }
    if (loadingMessageId === id) {
      setLoadingMessageId(null);
    }
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

  // Move these hooks to the top, before if (loading) return ...
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
  const voiceMessageDates = new Set(voiceMessagesToday.map(m => m.reminder_date.split('T')[0]));
  const todayStr = toLocalDateString(today);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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

  // Helper to always fetch from Supabase, not local cache
  const fetchVoiceMessagesToday = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('voice_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const today = toLocalDateString(new Date());
      const todayMessages = (data || []).filter(msg => msg.reminder_date && msg.reminder_date.split('T')[0] === today);
      setVoiceMessagesToday(todayMessages);
    } catch (err) {
      console.error('Error fetching voice messages from Supabase:', err);
    }
  };

  // On mount and when userId changes, always fetch from Supabase
  useEffect(() => {
    fetchVoiceMessagesToday();
  }, [userId]);

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
            <div className="bg-emerald-900/60 rounded-2xl p-6 border border-emerald-700">
              <div className="flex items-center justify-between w-full mb-4">
                <div className="relative flex flex-col items-center justify-center w-full mb-4">
                  <Emoji emoji="🔔" png="bell.png" alt="reminder" size="xl" />
                  <span className="text-base font-normal text-emerald-100 text-center mt-2 block">
                    Today's Voice Messages
                  </span>
                  <button
                    onClick={() => setShowRemindersSection(!showRemindersSection)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-emerald-300 hover:text-emerald-100 transition"
                    aria-label={showRemindersSection ? 'Collapse reminders' : 'Expand reminders'}
                    style={{ lineHeight: 0 }}
                  >
                    {showRemindersSection ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {showRemindersSection && (
                <div className="space-y-3">
                  {voiceMessagesToday.map(msg => (
                    <div key={msg.id} className={`relative flex items-center justify-between rounded-2xl p-3 border transition ${msg.played
                      ? 'bg-emerald-800/40 border-emerald-600/50'
                      : 'bg-emerald-900/60 border-emerald-700 cursor-pointer hover:bg-emerald-900/80'
                      }`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-base font-normal block ${msg.played ? 'text-emerald-300/70' : 'text-emerald-100'
                            }`}>
                            {msg.title || 'Voice Message'}
                          </span>
                          {msg.played && (
                            <span className="px-2 py-1 bg-emerald-600/30 text-emerald-200 text-xs rounded-full border border-emerald-500/30">
                              ✓ Played
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className={`px-3 py-1.5 font-semibold rounded-lg transition border text-sm flex items-center gap-2 ${loadingMessageId === msg.id
                            ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                            : playingMessageId === msg.id
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              : msg.played
                                ? 'bg-emerald-600/40 text-emerald-300 border-emerald-600/50 hover:bg-emerald-600/60'
                                : 'bg-emerald-400 text-emerald-900 hover:bg-emerald-300 border-emerald-500'
                            }`}
                          onClick={() => handlePlayVoice(msg.audio_path, msg.id!)}
                          disabled={loadingMessageId === msg.id || playingMessageId === msg.id || typeof msg.id !== 'string' || !/^([0-9a-fA-F-]{36})$/.test(msg.id)}
                        >
                          {loadingMessageId === msg.id ? (
                            <>
                              <div className="w-3 h-3 border border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                              Loading...
                            </>
                          ) : playingMessageId === msg.id ? (
                            <>
                              <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                              Playing
                            </>
                          ) : msg.played ? (
                            'Replay'
                          ) : (
                            'Play'
                          )}
                        </button>
                        <button
                          className="px-3 py-1.5 bg-red-500/20 text-red-400 font-bold rounded-lg border border-red-500/30 active:bg-red-500/30 transition text-sm"
                          onClick={() => handleDeleteVoice(msg.id!, msg.audio_path)}
                          disabled={loadingMessageId === msg.id || playingMessageId === msg.id}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                      markedDates={journalDates}
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
          {/* Calendar Picker for reminder date */}
          <div className="w-full mb-4">
            <CalendarPicker
              selectedDate={reminderDate}
              onSelect={date => { setReminderDate(date); setShowVoiceCalendar(false); }}
              markedDates={voiceMessageDates}
              disabledDates={voiceMessageDates}
              allowFutureDates={true}
              minDate={undefined}
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
          {/* Audio Preview or Recorder Controls */}
          {audioURL ? (
            <AudioPreviewPlayer audioURL={audioURL} onRetake={() => {
              setAudioChunks([]);
              setAudioURL(null);
              setRecording(false);
              setIsPaused(false);
              setRecordingTime(0);
            }} />
          ) : (
            <>
              {/* --- Waveform Visualization & Timer --- */}
              <div className="w-full flex flex-col items-center mb-4">
                <canvas
                  ref={canvasRef}
                  width={320}
                  height={60}
                  className="w-full max-w-xs h-16 bg-black/30 rounded-xl mb-2 border border-emerald-800"
                  style={{ background: '#18181b' }}
                />
                <div className="text-emerald-200 font-mono text-lg mb-2">
                  {recording ? recordingTime.toFixed(2) : '00:00.00'}
                </div>
              </div>
              {/* --- Controls --- */}
              <div className="flex items-center justify-center gap-6 mb-4">
                {!recording && (
                  <button
                    className="w-14 h-14 rounded-full bg-emerald-400 text-emerald-900 flex items-center justify-center text-2xl border border-emerald-500 hover:bg-emerald-300 transition"
                    onClick={startRecording}
                    disabled={recording || savingVoice}
                    aria-label="Start Recording"
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /></svg>
                  </button>
                )}
                {recording && !isPaused && (
                  <button
                    className="w-14 h-14 rounded-full bg-yellow-400 text-yellow-900 flex items-center justify-center text-2xl border border-yellow-500 hover:bg-yellow-300 transition"
                    onClick={pauseRecording}
                    aria-label="Pause Recording"
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="5" width="3" height="14" rx="1.5" /><rect x="14" y="5" width="3" height="14" rx="1.5" /></svg>
                  </button>
                )}
                {recording && isPaused && (
                  <button
                    className="w-14 h-14 rounded-full bg-emerald-400 text-emerald-900 flex items-center justify-center text-2xl border border-emerald-500 hover:bg-emerald-300 transition"
                    onClick={resumeRecording}
                    aria-label="Resume Recording"
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 4 20 12 6 20 6 4" /></svg>
                  </button>
                )}
                {(recording || isPaused) && (
                  <button
                    className="w-14 h-14 rounded-full bg-red-400 text-red-900 flex items-center justify-center text-2xl border border-red-500 hover:bg-red-300 transition"
                    onClick={stopRecording}
                    aria-label="Stop Recording"
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="7" width="10" height="10" rx="2" /></svg>
                  </button>
                )}
              </div>
            </>
          )}
          <button
            className="w-full py-3 bg-emerald-400 text-emerald-900 font-bold text-base rounded-xl shadow-lg active:bg-emerald-300 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            onClick={handleSaveVoice}
            disabled={!audioChunks.length || !reminderDate || savingVoice}
          >
            {savingVoice ? (
              <>
                <div className="w-5 h-5 border-2 border-emerald-900 border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Message</span>
            )}
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

function AudioPreviewPlayer({ audioURL, onRetake }: { audioURL: string, onRetake: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const durationSetRef = useRef(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    durationSetRef.current = false;

    const setDurationIfValid = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
        durationSetRef.current = true;
      }
    };

    const handleLoadedMetadata = () => {
      setDurationIfValid();
      // Fallback: try again after a short delay if duration is still 0
      if (!durationSetRef.current) {
        setTimeout(() => setDurationIfValid(), 200);
      }
    };
    const handleCanPlayThrough = () => {
      setDurationIfValid();
    };
    const update = () => {
      setCurrentTime(audio.currentTime);
      if (!durationSetRef.current && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
        durationSetRef.current = true;
      }
      setProgress(audio.duration && isFinite(audio.duration) && audio.duration > 0 ? audio.currentTime / audio.duration : 0);
    };
    audio.addEventListener('timeupdate', update);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('ended', () => setPlaying(false));
    // Set duration immediately if already loaded
    if (audio.readyState >= 1) handleLoadedMetadata();
    return () => {
      audio.removeEventListener('timeupdate', update);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('ended', () => setPlaying(false));
    };
  }, [audioURL]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  // Format time as mm:ss
  const format = (t: number) => {
    if (!isFinite(t) || isNaN(t) || t < 0) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full flex items-center gap-4 bg-emerald-800/60 rounded-2xl border border-emerald-700 px-4 py-3 mb-4">
      <button
        className="w-12 h-12 rounded-full bg-emerald-400 text-emerald-900 flex items-center justify-center text-2xl border border-emerald-500 hover:bg-emerald-300 transition"
        onClick={togglePlay}
        aria-label={playing ? 'Pause' : 'Play'}
        type="button"
      >
        {playing ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
        )}
      </button>
      <div className="flex-1 flex flex-col justify-center">
        <div className="relative w-full h-2 rounded-full bg-emerald-700/60">
          <div
            className="absolute top-0 left-0 h-2 rounded-full bg-emerald-400 transition-all"
            style={{ width: duration > 0 ? `${progress * 100}%` : '0%' }}
          />
        </div>
        <div className="flex justify-between text-xs text-emerald-200 mt-1">
          <span>{format(currentTime)}</span>
          <span>{duration > 0 ? format(duration) : '–:–'}</span>
        </div>
      </div>
      <audio ref={audioRef} src={audioURL} preload="auto" />
      <button
        className="ml-2 w-10 h-10 flex items-center justify-center rounded-full bg-red-500/80 hover:bg-red-600 border border-red-700 transition"
        onClick={onRetake}
        type="button"
        aria-label="Retake recording"
      >
        {/* Circular arrow/refresh icon */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      </button>
    </div>
  );
}