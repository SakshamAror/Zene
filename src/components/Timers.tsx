import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, Clock, Target, Square, X, ChevronDown } from 'lucide-react';
import { saveMeditationSession, saveWorkSession } from '../lib/saveData';

interface TimersProps {
    userId: string;
}

type TimerMode = 'meditation' | 'focus';

export default function Timers({ userId }: TimersProps) {
    // Meditation Timer State
    const [meditationDuration, setMeditationDuration] = useState(120); // 2 minutes default
    const [meditationTimeLeft, setMeditationTimeLeft] = useState(meditationDuration);
    const [isMeditationActive, setIsMeditationActive] = useState(false);
    const [isMeditationCompleted, setIsMeditationCompleted] = useState(false);
    const [selectedAudio, setSelectedAudio] = useState('none');
    const [volume, setVolume] = useState(0.5);
    const meditationAudioRef = useRef<HTMLAudioElement | null>(null);
    const guidedAudioRef = useRef<HTMLAudioElement | null>(null);
    const [guidedPlaying, setGuidedPlaying] = useState(false);
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
    const [showDurationPicker, setShowDurationPicker] = useState(false);

    const meditationDurations = [
        { label: '2 min', value: 120 },
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
        { label: 'Cafe Ambience', value: 'cafe' },
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

    // Start guided meditation and background sound when meditation starts
    useEffect(() => {
        if (currentMode === 'meditation' && isMeditationActive && meditationTimeLeft === meditationDuration) {
            // Start background sound (if selected)
            if (selectedAudio !== 'none' && meditationAudioRef.current) {
                meditationAudioRef.current.currentTime = 0;
                meditationAudioRef.current.volume = 0.3;
                meditationAudioRef.current.loop = true;
                meditationAudioRef.current.play();
            }
            // Start guided meditation
            if (guidedAudioRef.current) {
                guidedAudioRef.current.currentTime = 0;
                guidedAudioRef.current.volume = 0.0;
                guidedAudioRef.current.loop = false;
                guidedAudioRef.current.play();
                setGuidedPlaying(true);
                // Smoothly fade in guided audio
                let v = 0.0;
                const target = 0.3;
                const step = 0.05;
                const interval = setInterval(() => {
                    if (!guidedAudioRef.current) return;
                    v = Math.min(target, v + step);
                    guidedAudioRef.current.volume = v;
                    if (v >= target) clearInterval(interval);
                }, 60);
                setTimeout(() => clearInterval(interval), 2000);
            }
        }
    }, [isMeditationActive, meditationTimeLeft, currentMode]);

    // When guided meditation ends, smoothly ramp up background sound
    useEffect(() => {
        if (!guidedPlaying && isMeditationActive && selectedAudio !== 'none' && meditationAudioRef.current) {
            let v = meditationAudioRef.current.volume;
            const target = volume;
            const step = 0.02;
            const interval = setInterval(() => {
                if (!meditationAudioRef.current) return;
                v = Math.min(target, v + step);
                meditationAudioRef.current.volume = v;
                if (v >= target) clearInterval(interval);
            }, 60);
            return () => clearInterval(interval);
        }
    }, [guidedPlaying, isMeditationActive, selectedAudio, volume]);

    // Guided meditation end event
    useEffect(() => {
        const audio = guidedAudioRef.current;
        if (!audio) return;
        const onEnded = () => setGuidedPlaying(false);
        audio.addEventListener('ended', onEnded);
        return () => audio.removeEventListener('ended', onEnded);
    }, []);

    // Stop and reset both audios on stop/cancel
    const stopAllMeditationAudio = () => {
        if (meditationAudioRef.current) {
            meditationAudioRef.current.pause();
            meditationAudioRef.current.currentTime = 0;
        }
        if (guidedAudioRef.current) {
            guidedAudioRef.current.pause();
            guidedAudioRef.current.currentTime = 0;
        }
        setGuidedPlaying(false);
    };

    // Helper to fade out and stop both audios
    const fadeOutAndStopAudios = () => {
        const fade = (audioRef: React.RefObject<HTMLAudioElement>) => {
            if (!audioRef.current) return Promise.resolve();
            return new Promise<void>(resolve => {
                let v = audioRef.current!.volume;
                const step = 0.05;
                const interval = setInterval(() => {
                    if (!audioRef.current) {
                        clearInterval(interval);
                        resolve();
                        return;
                    }
                    v = Math.max(0, v - step);
                    audioRef.current.volume = v;
                    if (v <= 0) {
                        if (audioRef.current) {
                            audioRef.current.pause();
                            audioRef.current.currentTime = 0;
                        }
                        clearInterval(interval);
                        resolve();
                    }
                }, 60);
            });
        };
        return Promise.all([
            fade(meditationAudioRef),
            fade(guidedAudioRef)
        ]);
    };

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
            fadeOutAndStopAudios().then(() => stopAllMeditationAudio());
        } else {
            // Start button pressed
            setIsMeditationActive(true);
        }
    };

    const cancelMeditationTimer = () => {
        setIsMeditationActive(false);
        setMeditationTimeLeft(meditationDuration);
        setIsMeditationCompleted(false);
        fadeOutAndStopAudios().then(() => stopAllMeditationAudio());
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
        <div className="max-w-4xl mx-auto space-y-8 mt-6">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-2">FOCUS</h1>
                <div className="w-full flex justify-center">
                    <div className="h-px w-full max-w-lg bg-emerald-400/30 mt-4 mb-2"></div>
                </div>
            </div>

            {/* Mode Tabs */}
            <div className="flex justify-center">
                <div className="opal-card p-2">
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setCurrentMode('meditation')}
                            className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-colors ${currentMode === 'meditation'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'text-secondary hover:text-primary'
                                }`}
                        >
                            <Clock size={20} />
                            <span>Meditation</span>
                        </button>
                        <button
                            onClick={() => setCurrentMode('focus')}
                            className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-colors ${currentMode === 'focus'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'text-secondary hover:text-primary'
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
                            <svg className="w-full h-full transform -rotate-90 timer-circle" viewBox="0 0 100 100">
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    stroke="rgba(255,255,255,0.1)"
                                    strokeWidth="2"
                                    fill="none"
                                />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    stroke="url(#emeraldGradient)"
                                    strokeWidth="2"
                                    fill="none"
                                    strokeDasharray={`${2 * Math.PI * 45}`}
                                    strokeDashoffset={`${2 * Math.PI * 45 * (1 - meditationProgress / 100)}`}
                                    className="transition-all duration-1000 ease-linear"
                                    strokeLinecap="round"
                                />
                                <defs>
                                    <linearGradient id="emeraldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#10b981" />
                                        <stop offset="100%" stopColor="#14b8a6" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="text-4xl font-bold text-primary mb-2">
                                        {formatTime(meditationTimeLeft)}
                                    </div>
                                    {isMeditationCompleted && (
                                        <div className="text-emerald-400 font-medium">
                                            Session Complete!
                                        </div>
                                    )}
                                    {!isMeditationActive && !isMeditationCompleted && (
                                        <div className="text-emerald-400 font-medium">
                                            Stopped
                                        </div>
                                    )}
                                    {isMeditationActive && !isMeditationCompleted && (
                                        <div className="text-emerald-400 font-medium">
                                            Running
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
                            className="opal-button w-16 h-16 rounded-full flex items-center justify-center disabled:opacity-50"
                        >
                            {isMeditationActive ? <Square size={24} /> : <Play size={24} />}
                        </button>
                        <button
                            onClick={cancelMeditationTimer}
                            className="opal-button-secondary w-16 h-16 rounded-full flex items-center justify-center"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Duration Selection */}
                    <div className="opal-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-primary">Duration</h3>
                            <button
                                onClick={() => setShowDurationPicker(!showDurationPicker)}
                                className="opal-button-secondary px-4 py-2 flex items-center space-x-2"
                            >
                                <span>{Math.floor(meditationDuration / 60)} min</span>
                                <ChevronDown size={16} />
                            </button>
                        </div>

                        {showDurationPicker && (
                            <div className="grid grid-cols-3 gap-3">
                                {meditationDurations.map((dur) => (
                                    <button
                                        key={dur.value}
                                        onClick={() => {
                                            setMeditationDuration(dur.value);
                                            setShowDurationPicker(false);
                                        }}
                                        disabled={isMeditationActive}
                                        className={`py-3 px-4 rounded-xl font-medium transition-colors ${meditationDuration === dur.value
                                            ? 'bg-emerald-500/20 text-emerald-400'
                                            : 'opal-button-secondary'
                                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {dur.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Audio Settings */}
                    <div className="opal-card p-6">
                        <h3 className="font-semibold text-primary mb-4">Ambient Sounds</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                {audioOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setSelectedAudio(option.value)}
                                        className={`py-3 px-4 rounded-xl font-medium transition-colors ${selectedAudio === option.value
                                            ? 'bg-emerald-500/20 text-emerald-400'
                                            : 'opal-button-secondary'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>

                            {selectedAudio !== 'none' && (
                                <div className="flex items-center space-x-3">
                                    <Volume2 className="text-secondary" size={20} />
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={volume}
                                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                                        className="zene-slider flex-1"
                                        style={{
                                            '--zene-slider-color': '#10b981',
                                            '--zene-slider-fill': `${volume * 100}%`,
                                            'boxShadow': 'none',
                                            'height': '6px',
                                            'borderRadius': '3px',
                                        } as React.CSSProperties}
                                    />
                                    <span className="text-sm text-secondary w-8">
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
                    {/* Guided Meditation Audio */}
                    <audio
                        ref={guidedAudioRef}
                        preload="auto"
                        src="/audio/guided-meditation.mp3"
                    />
                </div>
            )}

            {/* Focus Stopwatch */}
            {currentMode === 'focus' && (
                <div className="space-y-8">
                    {/* Session Info */}

                    {/* Stopwatch Circle */}
                    <div className="flex justify-center">
                        <div className="relative w-80 h-80">
                            <svg className="w-full h-full transform -rotate-90 timer-circle" viewBox="0 0 100 100">
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    stroke="rgba(255,255,255,0.1)"
                                    strokeWidth="2"
                                    fill="none"
                                />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    stroke="url(#blueGradient)"
                                    strokeWidth="2"
                                    fill="none"
                                    strokeDasharray={`${2 * Math.PI * 45}`}
                                    strokeDashoffset={`${2 * Math.PI * 45 * (1 - (focusTime % 3600) / 3600)}`}
                                    className="transition-all duration-1000 ease-linear"
                                    strokeLinecap="round"
                                />
                                <defs>
                                    <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#3b82f6" />
                                        <stop offset="100%" stopColor="#1d4ed8" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="text-4xl font-bold text-primary mb-2">
                                        {formatTime(focusTime)}
                                    </div>
                                    <div className="text-blue-400 font-medium">
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
                            className="opal-button w-16 h-16 rounded-full flex items-center justify-center"
                        >
                            {isFocusActive ? <Square size={24} /> : <Play size={24} />}
                        </button>
                        <button
                            onClick={cancelFocusSession}
                            className="opal-button-secondary w-16 h-16 rounded-full flex items-center justify-center"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Audio Settings */}
                    <div className="opal-card p-6">
                        <h3 className="font-semibold text-primary mb-4">Ambient Sounds</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                {audioOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setFocusSelectedAudio(option.value)}
                                        className={`py-3 px-4 rounded-xl font-medium transition-colors ${focusSelectedAudio === option.value
                                            ? 'bg-blue-500/20 text-blue-400'
                                            : 'opal-button-secondary'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>

                            {focusSelectedAudio !== 'none' && (
                                <div className="flex items-center space-x-3">
                                    <Volume2 className="text-blue-400" size={20} />
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={focusVolume}
                                        onChange={(e) => setFocusVolume(parseFloat(e.target.value))}
                                        className="zene-slider flex-1"
                                        style={{
                                            '--zene-slider-color': '#3b82f6',
                                            '--zene-slider-fill': `${focusVolume * 100}%`,
                                            'boxShadow': 'none',
                                            'height': '6px',
                                            'borderRadius': '3px',
                                        } as React.CSSProperties}
                                    />
                                    <span className="text-sm text-blue-400 w-8">
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