import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2 } from 'lucide-react';
import { saveMeditationSession } from '../lib/saveData';

interface MeditationTimerProps {
  userId: string;
}

export default function MeditationTimer({ userId }: MeditationTimerProps) {
  const [duration, setDuration] = useState(300); // 5 minutes default
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isActive, setIsActive] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState('none');
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const durations = [
    { label: '5 min', value: 300 },
    { label: '10 min', value: 600 },
    { label: '15 min', value: 900 },
    { label: '20 min', value: 1200 },
    { label: '30 min', value: 1800 },
  ];

  const audioOptions = [
    { label: 'None', value: 'none' },
    { label: 'Ocean Waves', value: 'ocean' },
    { label: 'Forest Sounds', value: 'forest' },
    { label: 'Rain', value: 'rain' },
    { label: 'White Noise', value: 'white-noise' },
  ];

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(time => {
          if (time <= 1) {
            setIsActive(false);
            setIsCompleted(true);
            handleSessionComplete();
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, timeLeft]);

  useEffect(() => {
    setTimeLeft(duration);
    setIsCompleted(false);
  }, [duration]);

  useEffect(() => {
    if (selectedAudio !== 'none' && isActive) {
      if (audioRef.current) {
        audioRef.current.volume = volume;
        audioRef.current.play();
      }
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [selectedAudio, isActive, volume]);

  const handleSessionComplete = async () => {
    try {
      await saveMeditationSession({
        user_id: userId,
        length: duration,
        date: new Date().toISOString().split('T')[0],
      });
    } catch (error) {
      console.error('Error saving meditation session:', error);
    }
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(duration);
    setIsCompleted(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((duration - timeLeft) / duration) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Meditation</h1>
        <p className="text-slate-600 dark:text-slate-400">Find your center and breathe</p>
      </div>

      {/* Timer Circle */}
      <div className="flex justify-center">
        <div className="relative w-80 h-80">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              className="text-slate-200 dark:text-slate-700"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
              className="text-emerald-500 transition-all duration-1000 ease-linear"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                {formatTime(timeLeft)}
              </div>
              {isCompleted && (
                <div className="text-emerald-600 dark:text-emerald-400 font-medium">
                  Session Complete!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={toggleTimer}
          disabled={timeLeft === 0 && !isCompleted}
          className="flex items-center justify-center w-16 h-16 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white rounded-full transition-colors shadow-lg"
        >
          {isActive ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <button
          onClick={resetTimer}
          className="flex items-center justify-center w-16 h-16 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-full transition-colors"
        >
          <RotateCcw size={24} />
        </button>
      </div>

      {/* Duration Selection */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Duration</h3>
        <div className="grid grid-cols-5 gap-3">
          {durations.map((dur) => (
            <button
              key={dur.value}
              onClick={() => setDuration(dur.value)}
              disabled={isActive}
              className={`py-3 px-4 rounded-xl font-medium transition-colors ${
                duration === dur.value
                  ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {dur.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audio Settings */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Ambient Sounds</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {audioOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedAudio(option.value)}
                className={`py-3 px-4 rounded-xl font-medium transition-colors ${
                  selectedAudio === option.value
                    ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {selectedAudio !== 'none' && (
            <div className="flex items-center space-x-3">
              <Volume2 className="text-slate-600 dark:text-slate-400" size={20} />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm text-slate-600 dark:text-slate-400 w-8">
                {Math.round(volume * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Audio Element */}
      {selectedAudio !== 'none' && (
        <audio
          ref={audioRef}
          loop
          preload="auto"
          src={`/audio/${selectedAudio}.mp3`}
        />
      )}
    </div>
  );
}