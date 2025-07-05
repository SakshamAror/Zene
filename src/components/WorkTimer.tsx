import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Coffee, Target } from 'lucide-react';
import { saveWorkSession } from '../lib/saveData';

interface WorkTimerProps {
  userId: string;
}

export default function WorkTimer({ userId }: WorkTimerProps) {
  const [workDuration, setWorkDuration] = useState(1500); // 25 minutes default
  const [breakDuration, setBreakDuration] = useState(300); // 5 minutes default
  const [timeLeft, setTimeLeft] = useState(workDuration);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const workDurations = [
    { label: '15 min', value: 900 },
    { label: '25 min', value: 1500 },
    { label: '45 min', value: 2700 },
    { label: '60 min', value: 3600 },
  ];

  const breakDurations = [
    { label: '5 min', value: 300 },
    { label: '10 min', value: 600 },
    { label: '15 min', value: 900 },
  ];

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(time => {
          if (time <= 1) {
            setIsActive(false);
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
    setTimeLeft(isBreak ? breakDuration : workDuration);
  }, [workDuration, breakDuration, isBreak]);

  const handleSessionComplete = async () => {
    if (!isBreak) {
      // Work session completed
      try {
        await saveWorkSession({
          user_id: userId,
          length: workDuration,
          date: new Date().toISOString().split('T')[0],
        });
        setCompletedSessions(prev => prev + 1);
      } catch (error) {
        console.error('Error saving work session:', error);
      }
    }

    // Switch between work and break
    setIsBreak(!isBreak);
    setTimeLeft(isBreak ? workDuration : breakDuration);
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setIsBreak(false);
    setTimeLeft(workDuration);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentDuration = isBreak ? breakDuration : workDuration;
  const progress = ((currentDuration - timeLeft) / currentDuration) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Focus Timer</h1>
        <p className="text-slate-600 dark:text-slate-400">Deep work with purposeful breaks</p>
      </div>

      {/* Session Info */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isBreak ? (
              <Coffee className="text-orange-500" size={24} />
            ) : (
              <Target className="text-blue-500" size={24} />
            )}
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {isBreak ? 'Break Time' : 'Focus Session'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isBreak ? 'Take a well-deserved break' : 'Time for deep work'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {completedSessions}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Sessions
            </div>
          </div>
        </div>
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
              className={`transition-all duration-1000 ease-linear ${
                isBreak ? 'text-orange-500' : 'text-blue-500'
              }`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                {formatTime(timeLeft)}
              </div>
              <div className={`font-medium ${
                isBreak ? 'text-orange-500' : 'text-blue-500'
              }`}>
                {isBreak ? 'Break' : 'Focus'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={toggleTimer}
          className={`flex items-center justify-center w-16 h-16 text-white rounded-full transition-colors shadow-lg ${
            isBreak
              ? 'bg-orange-500 hover:bg-orange-600'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
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

      {/* Duration Settings */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Work Duration</h3>
          <div className="grid grid-cols-2 gap-3">
            {workDurations.map((dur) => (
              <button
                key={dur.value}
                onClick={() => setWorkDuration(dur.value)}
                disabled={isActive}
                className={`py-3 px-4 rounded-xl font-medium transition-colors ${
                  workDuration === dur.value
                    ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {dur.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Break Duration</h3>
          <div className="grid grid-cols-3 gap-3">
            {breakDurations.map((dur) => (
              <button
                key={dur.value}
                onClick={() => setBreakDuration(dur.value)}
                disabled={isActive}
                className={`py-3 px-4 rounded-xl font-medium transition-colors ${
                  breakDuration === dur.value
                    ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {dur.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}