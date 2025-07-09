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
    const [showAudioSettings, setShowAudioSettings] = useState(false);

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
        <div className="min-h-screen bg-gradient-to-b from-emerald-900 to-emerald-700 flex flex-col items-center justify-center px-6 py-10">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="text-6xl mb-6 animate-float">
                    {currentMode === 'meditation' ? '🧘' : '🎯'}
                </div>
                <h1 className="text-3xl font-bold text-white mb-3" style={{ letterSpacing: '-0.03em' }}>
                    {currentMode === 'meditation' ? 'Meditation' : 'Focus Session'}
                </h1>
                <p className="text-white/80 text-lg max-w-sm mx-auto">
                    {currentMode === 'meditation' 
                        ? 'Find your inner peace and clarity'
                        : 'Deep work for maximum productivity'
                    }
                </p>
            </div>

            {/* Mode Toggle */}
            <div className="flex bg-emerald-900/60 rounded-2xl p-2 mb-8 border border-emerald-700">
                <button
                    onClick={() => setCurrentMode('meditation')}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                        currentMode === 'meditation'
                            ? 'bg-emerald-400 text-emerald-900'
                            : 'text-emerald-200'
                    }`}
                >
                    Meditation
                </button>
                <button
                    onClick={() => setCurrentMode('focus')}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                        currentMode === 'focus'
                            ? 'bg-emerald-400 text-emerald-900'
                            : 'text-emerald-200'
                    }`}
                >
                    Focus
                </button>
            </div>

            {/* Timer/Stopwatch Circle */}
            <div className="relative w-80 h-80 mb-12">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
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
                        stroke={currentMode === 'meditation' ? "#a7f3d0" : "#60a5fa"}
                        strokeWidth="2"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 45}`}
                        strokeDashoffset={
                            currentMode === 'meditation'
                                ? `${2 * Math.PI * 45 * (1 - meditationProgress / 100)}`
                                : `${2 * Math.PI * 45 * (1 - (focusTime % 3600) / 3600)}`
                        }
                        className="transition-all duration-1000 ease-linear"
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-4xl font-bold text-white mb-2">
                            {currentMode === 'meditation' 
                                ? formatTime(meditationTimeLeft)
                                : formatTime(focusTime)
                            }
                        </div>
                        <div className={`font-medium ${
                            currentMode === 'meditation' ? 'text-emerald-300' : 'text-blue-300'
                        }`}>
                            {currentMode === 'meditation'
                                ? isMeditationCompleted 
                                    ? 'Complete!' 
                                    : isMeditationActive 
                                        ? 'Breathe...' 
                                        : 'Ready'
                                : isFocusActive 
                                    ? 'Focusing...' 
                                    : 'Ready'
                            }
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex space-x-4 mb-8">
                <button
                    onClick={currentMode === 'meditation' ? toggleMeditationTimer : toggleFocusStopwatch}
                    className="w-16 h-16 bg-emerald-400 text-emerald-900 rounded-full flex items-center justify-center shadow-lg active:bg-emerald-300 transition"
                >
                    {(currentMode === 'meditation' ? isMeditationActive : isFocusActive) 
                        ? <Square size={24} /> 
                        : <Play size={24} />
                    }
                </button>
                <button
                    onClick={currentMode === 'meditation' ? cancelMeditationTimer : cancelFocusSession}
                    className="w-16 h-16 bg-emerald-900/60 text-emerald-200 rounded-full flex items-center justify-center border border-emerald-700 active:bg-emerald-800 transition"
                >
                    <X size={24} />
                </button>
            </div>

            {/* Settings */}
            <div className="w-full max-w-sm space-y-4">
                {currentMode === 'meditation' && (
                    <div className="text-center">
                        <button
                            onClick={() => setShowDurationPicker(!showDurationPicker)}
                            className="py-3 px-6 bg-emerald-900/60 text-emerald-200 font-semibold rounded-xl border border-emerald-700 active:bg-emerald-800 transition"
                        >
                            Duration: {Math.floor(meditationDuration / 60)} min
                        </button>
                        
                        {showDurationPicker && (
                            <div className="mt-4 grid grid-cols-3 gap-3">
                                {meditationDurations.map((dur) => (
                                    <button
                                        key={dur.value}
                                        onClick={() => {
                                            setMeditationDuration(dur.value);
                                            setShowDurationPicker(false);
                                        }}
                                        disabled={isMeditationActive}
                                        className={`py-2 px-3 rounded-xl font-medium transition-all ${
                                            meditationDuration === dur.value
                                                ? 'bg-emerald-400 text-emerald-900'
                                                : 'bg-emerald-900/60 text-emerald-200 border border-emerald-700'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {dur.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="text-center">
                    <button
                        onClick={() => setShowAudioSettings(!showAudioSettings)}
                        className="py-3 px-6 bg-emerald-900/60 text-emerald-200 font-semibold rounded-xl border border-emerald-700 active:bg-emerald-800 transition"
                    >
                        Ambient Sounds
                    </button>
                    
                    {showAudioSettings && (
                        <div className="mt-4 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                {audioOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => {
                                            if (currentMode === 'meditation') {
                                                setSelectedAudio(option.value);
                                            } else {
                                                setFocusSelectedAudio(option.value);
                                            }
                                        }}
                                        className={`py-2 px-3 rounded-xl font-medium transition-all ${
                                            (currentMode === 'meditation' ? selectedAudio : focusSelectedAudio) === option.value
                                                ? 'bg-emerald-400 text-emerald-900'
                                                : 'bg-emerald-900/60 text-emerald-200 border border-emerald-700'
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>

                            {((currentMode === 'meditation' && selectedAudio !== 'none') || 
                              (currentMode === 'focus' && focusSelectedAudio !== 'none')) && (
                                <div className="flex items-center space-x-3">
                                    <Volume2 className="text-emerald-300" size={20} />
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={currentMode === 'meditation' ? volume : focusVolume}
                                        onChange={(e) => {
                                            if (currentMode === 'meditation') {
                                                setVolume(parseFloat(e.target.value));
                                            } else {
                                                setFocusVolume(parseFloat(e.target.value));
                                            }
                                        }}
                                        className="zene-slider flex-1"
                                        style={{
                                            '--zene-slider-color': currentMode === 'meditation' ? '#a7f3d0' : '#60a5fa',
                                            '--zene-slider-fill': `${(currentMode === 'meditation' ? volume : focusVolume) * 100}%`,
                                        } as React.CSSProperties}
                                    />
                                    <span className="text-sm text-emerald-300 w-8">
                                        {Math.round((currentMode === 'meditation' ? volume : focusVolume) * 100)}%
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Audio Elements */}
            {selectedAudio !== 'none' && (
                <audio
                    ref={meditationAudioRef}
                    loop
                    preload="auto"
                    src={`/audio/${selectedAudio}.mp3`}
                />
            )}
            {focusSelectedAudio !== 'none' && (
                <audio
                    ref={focusAudioRef}
                    loop
                    preload="auto"
                    src={`/audio/${focusSelectedAudio}.mp3`}
                />
            )}
            <audio
                ref={guidedAudioRef}
                preload="auto"
                src="/audio/guided-meditation.mp3"
            />
        </div>
    );
}