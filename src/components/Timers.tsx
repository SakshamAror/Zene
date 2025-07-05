import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, Clock, Target, Square, X } from 'lucide-react';
import { saveMeditationSession, saveWorkSession } from '../lib/saveData';

interface TimersProps {
    userId: string;
}

type TimerMode = 'meditation' | 'focus';

export default function Timers({ userId }: TimersProps) {
    // Meditation Timer State
    const [meditationDuration, setMeditationDuration] = useState(300); // 5 minutes default
    const [meditationTimeLeft, setMeditationTimeLeft] = useState(meditationDuration);
    const [isMeditationActive, setIsMeditationActive] = useState(false);
    const [isMeditationCompleted, setIsMeditationCompleted] = useState(false);
    const [selectedAudio, setSelectedAudio] = useState('none');
    const [volume, setVolume] = useState(0.5);
    const meditationAudioRef = useRef<HTMLAudioElement | null>(null);
    const meditationIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Focus Stopwatch State
    const [focusTime, setFocusTime] = useState(0);
    const [isFocusActive, setIsFocusActive] = useState(false);
    const [focusSessions, setFocusSessions] = useState(0);
    const [focusSelectedAudio, setFocusSelectedAudio] = useState('none');
    const [focusVolume, setFocusVolume] = useState(0.5);
    const focusAudioRef = useRef<HTMLAudioElement | null>(null);
    const focusIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Current Mode
    const [currentMode, setCurrentMode] = useState<TimerMode>('meditation');

    const meditationDurations = [
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

    // Meditation Timer Effects
    useEffect(() => {
        if (isMeditationActive && meditationTimeLeft > 0) {
            meditationIntervalRef.current = setInterval(() => {
                setMeditationTimeLeft(time => {
                    if (time <= 1) {
                        setIsMeditationActive(false);
                        setIsMeditationCompleted(true);
                        handleMeditationComplete();
                        return 0;
                    }
                    return time - 1;
                });
            }, 1000);
        } else {
            if (meditationIntervalRef.current) {
                clearInterval(meditationIntervalRef.current);
            }
        }

        return () => {
            if (meditationIntervalRef.current) {
                clearInterval(meditationIntervalRef.current);
            }
        };
    }, [isMeditationActive, meditationTimeLeft]);

    useEffect(() => {
        setMeditationTimeLeft(meditationDuration);
        setIsMeditationCompleted(false);
    }, [meditationDuration]);

    useEffect(() => {
        if (selectedAudio !== 'none' && isMeditationActive) {
            if (meditationAudioRef.current) {
                meditationAudioRef.current.volume = volume;
                meditationAudioRef.current.play();
            }
        } else if (meditationAudioRef.current) {
            meditationAudioRef.current.pause();
        }
    }, [selectedAudio, isMeditationActive, volume]);

    // Focus Stopwatch Effects
    useEffect(() => {
        if (isFocusActive) {
            focusIntervalRef.current = setInterval(() => {
                setFocusTime(time => time + 1);
            }, 1000);
        } else {
            if (focusIntervalRef.current) {
                clearInterval(focusIntervalRef.current);
            }
        }

        return () => {
            if (focusIntervalRef.current) {
                clearInterval(focusIntervalRef.current);
            }
        };
    }, [isFocusActive]);

    useEffect(() => {
        if (focusSelectedAudio !== 'none' && isFocusActive) {
            if (focusAudioRef.current) {
                focusAudioRef.current.volume = focusVolume;
                focusAudioRef.current.play();
            }
        } else if (focusAudioRef.current) {
            focusAudioRef.current.pause();
        }
    }, [focusSelectedAudio, isFocusActive, focusVolume]);

    const handleMeditationComplete = async () => {
        try {
            await saveMeditationSession({
                user_id: userId,
                length: meditationDuration,
                date: new Date().toISOString().split('T')[0],
            });
        } catch (error) {
            console.error('Error saving meditation session:', error);
        }
    };

    const handleMeditationSessionSave = async (elapsedTime: number) => {
        try {
            await saveMeditationSession({
                user_id: userId,
                length: elapsedTime,
                date: new Date().toISOString().split('T')[0],
            });
        } catch (error) {
            console.error('Error saving meditation session:', error);
        }
    };

    const handleFocusSessionComplete = async () => {
        try {
            await saveWorkSession({
                user_id: userId,
                length: focusTime,
                date: new Date().toISOString().split('T')[0],
            });
            setFocusSessions(prev => prev + 1);
        } catch (error) {
            console.error('Error saving focus session:', error);
        }
    };

    const toggleMeditationTimer = () => {
        if (isMeditationActive) {
            // Stop button pressed - save session if minimum time met
            const elapsedTime = meditationDuration - meditationTimeLeft;
            if (elapsedTime >= 15) {
                handleMeditationSessionSave(elapsedTime);
            }
            setIsMeditationActive(false);
            setMeditationTimeLeft(meditationDuration);
            setIsMeditationCompleted(false);
            if (meditationAudioRef.current) {
                meditationAudioRef.current.pause();
                meditationAudioRef.current.currentTime = 0;
            }
        } else {
            // Start button pressed
            setIsMeditationActive(true);
        }
    };

    const cancelMeditationTimer = () => {
        setIsMeditationActive(false);
        setMeditationTimeLeft(meditationDuration);
        setIsMeditationCompleted(false);
        if (meditationAudioRef.current) {
            meditationAudioRef.current.pause();
            meditationAudioRef.current.currentTime = 0;
        }
    };

    const toggleFocusStopwatch = () => {
        if (isFocusActive) {
            // Stop button pressed - save session if minimum time met
            if (focusTime >= 15) {
                handleFocusSessionComplete();
            }
            setIsFocusActive(false);
            setFocusTime(0);
            if (focusAudioRef.current) {
                focusAudioRef.current.pause();
                focusAudioRef.current.currentTime = 0;
            }
        } else {
            // Start button pressed
            setIsFocusActive(true);
        }
    };

    const cancelFocusSession = () => {
        setIsFocusActive(false);
        setFocusTime(0);
        if (focusAudioRef.current) {
            focusAudioRef.current.pause();
            focusAudioRef.current.currentTime = 0;
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const meditationProgress = ((meditationDuration - meditationTimeLeft) / meditationDuration) * 100;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Timers</h1>
                <p className="text-slate-600 dark:text-slate-400">Meditation and focus tools</p>
            </div>

            {/* Mode Tabs */}
            <div className="flex justify-center">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-2 border border-slate-200 dark:border-slate-700">
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setCurrentMode('meditation')}
                            className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-colors ${currentMode === 'meditation'
                                ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                        >
                            <Clock size={20} />
                            <span>Meditation</span>
                        </button>
                        <button
                            onClick={() => setCurrentMode('focus')}
                            className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-colors ${currentMode === 'focus'
                                ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                        >
                            <Target size={20} />
                            <span>Focus</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Meditation Timer */}
            {currentMode === 'meditation' && (
                <div className="space-y-8">
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
                                    strokeDashoffset={`${2 * Math.PI * 45 * (1 - meditationProgress / 100)}`}
                                    className="text-emerald-500 transition-all duration-1000 ease-linear"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                                        {formatTime(meditationTimeLeft)}
                                    </div>
                                    {isMeditationCompleted && (
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
                            onClick={toggleMeditationTimer}
                            disabled={meditationTimeLeft === 0 && !isMeditationCompleted}
                            className="flex items-center justify-center w-16 h-16 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white rounded-full transition-colors shadow-lg"
                        >
                            {isMeditationActive ? <Square size={24} /> : <Play size={24} />}
                        </button>
                        <button
                            onClick={cancelMeditationTimer}
                            className="flex items-center justify-center w-16 h-16 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-full transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Duration Selection */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Duration</h3>
                        <div className="grid grid-cols-5 gap-3">
                            {meditationDurations.map((dur) => (
                                <button
                                    key={dur.value}
                                    onClick={() => setMeditationDuration(dur.value)}
                                    disabled={isMeditationActive}
                                    className={`py-3 px-4 rounded-xl font-medium transition-colors ${meditationDuration === dur.value
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
                                        className={`py-3 px-4 rounded-xl font-medium transition-colors ${selectedAudio === option.value
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
                            ref={meditationAudioRef}
                            loop
                            preload="auto"
                            src={`/audio/${selectedAudio}.mp3`}
                        />
                    )}
                </div>
            )}

            {/* Focus Stopwatch */}
            {currentMode === 'focus' && (
                <div className="space-y-8">
                    {/* Session Info */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <Target className="text-blue-500" size={24} />
                                <div>
                                    <h3 className="font-semibold text-slate-900 dark:text-white">Focus Session</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Track your focused work time</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {focusSessions}
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400">
                                    Sessions
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stopwatch Circle */}
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
                                    strokeDashoffset={`${2 * Math.PI * 45 * (1 - (focusTime % 3600) / 3600)}`}
                                    className="text-blue-500 transition-all duration-1000 ease-linear"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                                        {formatTime(focusTime)}
                                    </div>
                                    <div className="text-blue-500 font-medium">
                                        {isFocusActive ? 'Running' : 'Stopped'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex justify-center space-x-4">
                        <button
                            onClick={toggleFocusStopwatch}
                            className="flex items-center justify-center w-16 h-16 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors shadow-lg"
                        >
                            {isFocusActive ? <Square size={24} /> : <Play size={24} />}
                        </button>
                        <button
                            onClick={cancelFocusSession}
                            className="flex items-center justify-center w-16 h-16 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-full transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Audio Settings */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Ambient Sounds</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {audioOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setFocusSelectedAudio(option.value)}
                                        className={`py-3 px-4 rounded-xl font-medium transition-colors ${focusSelectedAudio === option.value
                                            ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>

                            {focusSelectedAudio !== 'none' && (
                                <div className="flex items-center space-x-3">
                                    <Volume2 className="text-slate-600 dark:text-slate-400" size={20} />
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={focusVolume}
                                        onChange={(e) => setFocusVolume(parseFloat(e.target.value))}
                                        className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <span className="text-sm text-slate-600 dark:text-slate-400 w-8">
                                        {Math.round(focusVolume * 100)}%
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Audio Element */}
                    {focusSelectedAudio !== 'none' && (
                        <audio
                            ref={focusAudioRef}
                            loop
                            preload="auto"
                            src={`/audio/${focusSelectedAudio}.mp3`}
                        />
                    )}
                </div>
            )}
        </div>
    );
} 