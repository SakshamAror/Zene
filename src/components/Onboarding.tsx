import React, { useState, useEffect } from 'react';
import { upsertUserPrefs } from '../lib/saveData';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { Emoji } from './Emoji';

interface OnboardingProps {
    userId: string;
    onComplete: (goals: { meditation: number; focus: number; mainGoal: string }) => void;
}

const defaultMeditation = 2;
const defaultFocus = 120;
const goalOptions = [
    { key: 'focus', label: 'Focus Better', emoji: 'goal' },
    { key: 'mindfulness', label: 'Be Mindful', emoji: 'mindfulness' },
    { key: 'learn', label: 'Learn & Grow', emoji: 'book' },
    { key: 'relax', label: 'Relax More', emoji: 'relax' },
];

const steps = [
    {
        type: 'welcome',
        title: "Welcome to Zene!",
        description: "Your personal space for focus, growth, and mindfulness.",
        image: 'mindfulness', // 🧘
    },
    {
        type: 'goal',
        title: "What brings you to Zene?",
        description: "Pick your main goal.",
        image: 'sparkle', // ✨
    },
    {
        type: 'why',
        title: "How Zene Helps",
        description: "Zene helps you meditate, focus, and journal—so you can grow every day.",
        image: 'leaf', // 🌱
    },
    {
        type: 'try',
        title: "Let's start with a quick meditation session!",
        description: "",
        image: 'mindfulness', // 🧘 (was 'wave', should be mindfulness for meditation)
    },
    {
        type: 'meditation',
        title: "Set Your Meditation Goal",
        description: "How many minutes would you like to meditate daily?",
        image: 'candle', // 🕯️
    },
    {
        type: 'focus',
        title: "Set Your Focus Goal",
        description: "How many minutes would you like to focus each day?",
        image: 'goal', // 🎯
    },
    {
        type: 'summary',
        title: "",
        description: "Your free trial is active.",
        image: 'rocket', // 🚀
    },
];

const sampleAudio = '/public/audio/forest.mp3'; // Use a short, non-intrusive sound

export default function Onboarding({ userId, onComplete }: OnboardingProps) {
    const [step, setStep] = useState(0);
    const [meditationGoal, setMeditationGoal] = useState(defaultMeditation);
    const [focusGoal, setFocusGoal] = useState(defaultFocus);
    const [mainGoal, setMainGoal] = useState(goalOptions[0].key);
    const [meditationTimer, setMeditationTimer] = useState(120); // 2 minutes in seconds
    const [timerActive, setTimerActive] = useState(false);
    const [timerFinished, setTimerFinished] = useState(false);
    const timerRef = React.useRef<NodeJS.Timeout | null>(null);
    const oceanAudioRef = React.useRef<HTMLAudioElement>(null);
    const guidedAudioRef = React.useRef<HTMLAudioElement>(null);
    const [guidedPlaying, setGuidedPlaying] = useState(false);
    const [loading, setLoading] = useState(false);

    // Start ocean and guided meditation sound only when timer is started
    React.useEffect(() => {
        if (timerActive && meditationTimer === 120) {
            if (oceanAudioRef.current) {
                oceanAudioRef.current.currentTime = 0;
                oceanAudioRef.current.volume = 0.3; // Start a bit louder
                oceanAudioRef.current.loop = true;
                oceanAudioRef.current.play();
            }
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
    }, [timerActive]);

    // When guided meditation ends, smoothly ramp up ocean volume
    React.useEffect(() => {
        if (!guidedPlaying && timerActive && oceanAudioRef.current) {
            let v = oceanAudioRef.current.volume;
            const target = 0.5;
            const step = 0.02;
            const interval = setInterval(() => {
                if (!oceanAudioRef.current) return;
                v = Math.min(target, v + step);
                oceanAudioRef.current.volume = v;
                if (v >= target) clearInterval(interval);
            }, 60);
            return () => clearInterval(interval);
        }
    }, [guidedPlaying, timerActive]);

    // Guided meditation end event
    React.useEffect(() => {
        const audio = guidedAudioRef.current;
        if (!audio) return;
        const onEnded = () => setGuidedPlaying(false);
        audio.addEventListener('ended', onEnded);
        return () => audio.removeEventListener('ended', onEnded);
    }, []);

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
            fade(oceanAudioRef),
            fade(guidedAudioRef)
        ]);
    };

    // Timer logic for meditation preview
    React.useEffect(() => {
        if (timerActive && meditationTimer > 0) {
            timerRef.current = setTimeout(() => {
                setMeditationTimer(meditationTimer - 1);
            }, 1000);
        } else if (timerActive && meditationTimer === 0) {
            setTimerActive(false);
            setTimerFinished(true);
            // Fade out both sounds
            fadeOutAndStopAudios().then(() => setGuidedPlaying(false));
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [timerActive, meditationTimer]);

    // Stop and reset timer and sound on Back/Next navigation
    const handleBack = () => {
        if (step > 0) {
            setStep(step - 1);
            if (timerActive || timerFinished) {
                setTimerActive(false);
                setTimerFinished(false);
                setMeditationTimer(120);
                fadeOutAndStopAudios().then(() => setGuidedPlaying(false));
            }
        }
    };
    const handleNextWithReset = async () => {
        if (steps[step].type === 'summary') {
            if (!userId) {
                alert('User ID is missing. Please log in again.');
                return;
            }
            setLoading(true);
            await upsertUserPrefs({
                user_id: userId,
                meditation_goal: meditationGoal,
                focus_goal: focusGoal,
                main_goal: mainGoal
            });
            onComplete({ meditation: meditationGoal, focus: focusGoal, mainGoal });
        } else {
            setStep(step + 1);
            if (timerActive || timerFinished) {
                setTimerActive(false);
                setTimerFinished(false);
                setMeditationTimer(120);
                fadeOutAndStopAudios().then(() => setGuidedPlaying(false));
            }
        }
    };

    // Dynamic summary text
    const summaryText = `You've set a daily meditation goal of ${meditationGoal} min, a focus goal of ${focusGoal} min, and your main goal is "${goalOptions.find(g => g.key === mainGoal)?.label}". Let's make every day count!`;

    // Progress bar
    const progress = (step + 1) / steps.length * 100;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
            {/* Progress Bar - always visible */}
            <div className="w-full max-w-xs h-2 bg-white/10 rounded-full mb-6 overflow-hidden">
                <div className="h-2 bg-emerald-400 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center w-full">
                {/* For step image: */}
                <div className="w-16 h-16 mb-6 flex items-center justify-center mx-auto animate-float">
                    {steps[step].type === 'try' ? (
                        <Emoji emoji={getStepEmoji(steps[step].image)} png="wave.png" alt={steps[step].image} size="3xl" />
                    ) : (
                        <Emoji emoji={getStepEmoji(steps[step].image)} png={`${steps[step].image}.png`} alt={steps[step].image} size="3xl" />
                    )}
                </div>
                {/* Only render title/description if not the summary step */}
                {steps[step].type !== 'summary' && (
                    <>
                        <h1 className="text-2xl font-bold text-white mb-3 text-center pt-8" style={{ letterSpacing: '-0.03em' }}>{steps[step].title}</h1>
                        <p className="text-white/80 text-base mb-8 max-w-xs mx-auto text-center">
                            {steps[step].description}
                        </p>
                        {/* Add visual benefits for 'How Zene Helps' step */}
                        {steps[step].type === 'why' && (
                            <div className="flex flex-col items-center gap-3 mb-8 text-center">
                                <div className="flex items-center gap-4 justify-center">
                                    <div className="w-7 h-7 flex items-center justify-center">
                                        <Emoji emoji="💪" png="muscle.png" alt="Work harder" size="md" />
                                    </div>
                                    <span className="text-white/90 text-base font-semibold">Work harder</span>
                                </div>
                                <div className="flex items-center gap-4 justify-center">
                                    <div className="w-7 h-7 flex items-center justify-center">
                                        <Emoji emoji="🧘" png="mindfulness.png" alt="Be more mindful" size="md" />
                                    </div>
                                    <span className="text-white/90 text-base font-semibold">Be more mindful</span>
                                </div>
                                <div className="flex items-center gap-4 justify-center">
                                    <div className="w-7 h-7 flex items-center justify-center">
                                        <Emoji emoji="😌" png="relaxed.png" alt="Feel less stressed" size="md" />
                                    </div>
                                    <span className="text-white/90 text-base font-semibold">Feel less stressed</span>
                                </div>
                            </div>
                        )}
                    </>
                )}
                {/* Goal Selection Step */}
                {steps[step].type === 'goal' && (
                    <div className="flex flex-wrap justify-center gap-3 mb-6">
                        {goalOptions.map(option => (
                            <button
                                key={option.key}
                                className={`px-4 py-2 rounded-xl border-2 transition-all flex items-center gap-2 text-lg font-semibold ${mainGoal === option.key ? 'bg-emerald-400 text-emerald-900 border-emerald-400' : 'bg-white/10 text-white border-white/20 hover:bg-emerald-500/20'}`}
                                onClick={() => setMainGoal(option.key)}
                            >
                                <Emoji emoji={getGoalEmoji(option.emoji)} png={`${option.emoji}.png`} alt={option.label} size="md" />
                                {option.label}
                            </button>
                        ))}
                    </div>
                )}
                {/* Try a Feature Step */}
                {steps[step].type === 'try' && (
                    <div className="flex flex-col items-center gap-3 mb-6 w-full">
                        <div className="flex justify-center w-full">
                            <div className="relative w-48 h-48 mx-auto">
                                <svg className="w-48 h-48 transform -rotate-90 timer-circle" viewBox="0 0 100 100">
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="45"
                                        stroke="rgba(255,255,255,0.1)"
                                        strokeWidth="4"
                                        fill="none"
                                    />
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="45"
                                        stroke="url(#emeraldGradient)"
                                        strokeWidth="4"
                                        fill="none"
                                        strokeDasharray={`${2 * Math.PI * 45}`}
                                        strokeDashoffset={`${2 * Math.PI * 45 * (1 - (1 - meditationTimer / 120))}`}
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
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <div className="text-3xl font-bold text-primary font-sans" style={{ fontFamily: 'Inter, sans-serif' }}>
                                        {`${Math.floor(meditationTimer / 60).toString().padStart(2, '0')}:${(meditationTimer % 60).toString().padStart(2, '0')}`}
                                    </div>
                                    {timerActive && (
                                        <div className="text-xs text-emerald-400 mt-2">Breathe in... Breathe out...</div>
                                    )}
                                    {timerFinished && (
                                        <div className="text-lg text-emerald-400 font-semibold mt-2">Well done!</div>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* Ocean and Guided Meditation sound for meditation preview */}
                        <audio ref={oceanAudioRef} src="/audio/ocean.mp3" preload="auto" />
                        <audio ref={guidedAudioRef} src="/audio/guided-meditation.mp3" preload="auto" />
                        {!timerActive && !timerFinished && (
                            <button
                                className="mt-6 px-6 py-3 rounded-xl bg-emerald-400 text-emerald-900 font-bold text-lg shadow-lg active:bg-emerald-300 transition flex items-center gap-2"
                                onClick={() => {
                                    setMeditationTimer(120);
                                    setTimerActive(true);
                                    setTimerFinished(false);
                                }}
                            >
                                Start 2-Minute Meditation
                            </button>
                        )}
                    </div>
                )}
                {/* Meditation Goal Step */}
                {steps[step].type === 'meditation' && (
                    <div className="w-full max-w-xs mx-auto mb-6">
                        <input
                            type="range"
                            min={2}
                            max={60}
                            step={1}
                            value={meditationGoal}
                            onChange={e => setMeditationGoal(Number(e.target.value))}
                            className="w-full zene-slider mb-2"
                        />
                        <div className="text-center mx-auto">
                            <div className="text-lg font-bold text-emerald-200">{meditationGoal} min</div>
                            <div className="text-xs text-white/60">Recommended for beginners: 2 min</div>
                        </div>
                    </div>
                )}
                {/* Focus Goal Step */}
                {steps[step].type === 'focus' && (
                    <div className="w-full max-w-xs mx-auto mb-6">
                        <input
                            type="range"
                            min={30}
                            max={360}
                            step={10}
                            value={focusGoal}
                            onChange={e => setFocusGoal(Number(e.target.value))}
                            className="w-full zene-slider mb-2"
                        />
                        <div className="text-center mx-auto">
                            <div className="text-lg font-bold text-emerald-200">{focusGoal} min</div>
                            <div className="text-xs text-white/60">Recommended for beginners: 120 min</div>
                        </div>
                    </div>
                )}
                {/* Summary Step: Free Trial Timeline */}
                {steps[step].type === 'summary' && (
                    <div className="w-full max-w-xs mx-auto flex flex-col items-center justify-center text-center" style={{ minHeight: '420px' }}>
                        {/* Main description */}
                        <div className="text-xl font-bold text-white mb-12 text-center">{steps[step].description}</div>
                        {/* Timeline */}
                        <div className="flex w-full items-start gap-4 mb-2">
                            {/* Timeline icons and line */}
                            <div className="flex flex-col items-center" style={{ minWidth: '32px', height: '320px', justifyContent: 'space-between' }}>
                                <div className="w-8 h-8 flex items-center justify-center mb-2">
                                    <Emoji emoji="🔓" png="unlock.png" alt="unlock" size="md" />
                                </div>
                                <div className="flex-1 w-1 bg-emerald-300 rounded-full" style={{ minHeight: '80px', marginBottom: '6px' }}></div>
                                <div className="w-8 h-8 flex items-center justify-center mb-2">
                                    <Emoji emoji="🌱" png="leaf.png" alt="leaf" size="md" />
                                </div>
                                <div className="flex-1 w-1 bg-emerald-300 rounded-full" style={{ minHeight: '80px', marginBottom: '6px' }}></div>
                                <div className="w-8 h-8 flex items-center justify-center">
                                    <Emoji emoji="⭐️" png="star.png" alt="star" size="md" />
                                </div>
                            </div>
                            {/* Timeline text */}
                            <div className="flex flex-col gap-12 flex-1 justify-between" style={{ height: '320px' }}>
                                <div>
                                    <div className="font-bold text-white text-base mb-1">Today</div>
                                    <div className="text-white/80 text-sm">Unlocked all features.</div>
                                </div>
                                <div>
                                    <div className="font-bold text-white text-base mb-1">Days 1-10</div>
                                    <div className="text-white/80 text-sm">Enjoy Zene. Build habits. Feel better.</div>
                                </div>
                                <div>
                                    <div className="font-bold text-white text-base mb-1">Day 10</div>
                                    <div className="text-white/80 text-sm">Subscribe to keep using Zene.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <div className="flex w-full max-w-xs gap-3 mb-2 animate-float">
                {step > 0 && (
                    <button
                        className="flex-1 py-3 rounded-xl bg-emerald-900/60 text-emerald-200 font-bold text-lg shadow-lg active:bg-emerald-800 transition"
                        onClick={handleBack}
                        disabled={loading}
                    >
                        Back
                    </button>
                )}
                <button
                    className="flex-1 py-3 rounded-xl bg-emerald-400 text-emerald-900 font-bold text-lg shadow-lg active:bg-emerald-300 transition flex items-center justify-center"
                    onClick={handleNextWithReset}
                    disabled={loading}
                >
                    {loading ? (
                        <span className="w-5 h-5 border-2 border-emerald-900 border-t-transparent rounded-full animate-spin inline-block"></span>
                    ) : (
                        step < steps.length - 1 ? "Next" : "Let's Go!"
                    )}
                </button>
            </div>
            {/* Motivational microcopy */}
            <div className="text-xs text-white/50 mt-2">
                {step === 0 && "Great minds don't wander, they conquer."}
                {step === 4 && "You can always adjust your goals later in Settings."}
                {step === 5 && "Stay focused, stay mindful!"}
                {step === steps.length - 1 && "No card required. No commitment."}
            </div>
        </div>
    );
}

// Helper functions to get emoji characters:
function getStepEmoji(imageKey: string): string {
    const emojiMap: Record<string, string> = {
        'mindfulness': '🧘',
        'sparkle': '✨',
        'leaf': '🌱',
        'book': '📚',
        'relax': '🌿',
        'candle': '🕯️',
        'goal': '🎯',
        'rocket': '🚀'
    };
    return emojiMap[imageKey] || '✨';
}

function getGoalEmoji(goalKey: string): string {
    const emojiMap: Record<string, string> = {
        'goal': '🎯',
        'mindfulness': '🧘',
        'book': '📚',
        'relax': '🌿'
    };
    return emojiMap[goalKey] || '✨';
} 