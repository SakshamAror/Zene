import React, { useState } from 'react';

interface OnboardingProps {
    onComplete: (goals: { meditation: number; focus: number; mainGoal: string }) => void;
}

const defaultMeditation = 2;
const defaultFocus = 120;
const goalOptions = [
    { key: 'focus', label: 'Focus Better', emoji: '🎯' },
    { key: 'mindfulness', label: 'Be Mindful', emoji: '🧘' },
    { key: 'learn', label: 'Learn & Grow', emoji: '📚' },
    { key: 'relax', label: 'Relax More', emoji: '🌿' },
];

const steps = [
    {
        type: 'welcome',
        title: "Welcome to Zene!",
        description: "Your personal space for focus, growth, and mindfulness.",
        image: '🧘',
    },
    {
        type: 'goal',
        title: "What brings you to Zene?",
        description: "Pick your main goal. You can change this anytime!",
        image: '✨',
    },
    {
        type: 'why',
        title: "How Zene Helps",
        description: "Zene helps you meditate, focus, and journal—so you can grow every day.",
        image: '🌱',
    },
    {
        type: 'try',
        title: "Let's start with a quick meditation session!",
        description: "",
        image: '🌊',
    },
    {
        type: 'meditation',
        title: "Set Your Meditation Goal",
        description: "How many minutes would you like to meditate daily? (You can change this later!)",
        image: '🕯️',
    },
    {
        type: 'focus',
        title: "Set Your Focus Goal",
        description: "How many minutes would you like to focus each day? (You can change this later!)",
        image: '🎯',
    },
    {
        type: 'comparison',
        title: 'A Better Day with Zene',
        description: '',
        image: '',
    },
    {
        type: 'summary',
        title: "",
        description: "Your free trial is active.",
        image: '🚀',
    },
];

const sampleAudio = '/public/audio/forest.mp3'; // Use a short, non-intrusive sound

export default function Onboarding({ onComplete }: OnboardingProps) {
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
    const handleNextWithReset = () => {
        if (steps[step].type === 'summary') {
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
        <div className="fixed inset-0 z-50 bg-gradient-to-b from-emerald-900 to-emerald-700 flex flex-col items-center justify-center px-6 py-10 text-center">
            {/* Progress Bar */}
            <div className="w-full max-w-xs h-2 bg-white/10 rounded-full mb-6 overflow-hidden">
                <div className="h-2 bg-emerald-400 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center w-full">
                <div className="text-6xl mb-6 select-none animate-float">{steps[step].image}</div>
                {/* Only render title/description if not the comparison step and not the summary step */}
                {steps[step].type !== 'comparison' && steps[step].type !== 'summary' && (
                    <>
                        <h1 className="text-2xl font-bold text-white mb-3" style={{ letterSpacing: '-0.03em' }}>{steps[step].title}</h1>
                        <p className="text-white/80 text-base mb-8 max-w-xs mx-auto">
                            {steps[step].description}
                        </p>
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
                                <span>{option.emoji}</span> {option.label}
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
                        <div className="text-lg font-bold text-emerald-200">{meditationGoal} min</div>
                        <div className="text-xs text-white/60">Recommended for beginners: 2 min</div>
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
                        <div className="text-lg font-bold text-emerald-200">{focusGoal} min</div>
                        <div className="text-xs text-white/60">Recommended for beginners: 120 min</div>
                    </div>
                )}
                {/* Productivity/Mindfulness Comparison Step */}
                {steps[step].type === 'comparison' && (
                    <div className="w-full max-w-xs mx-auto flex flex-col items-center justify-center" style={{ minHeight: '480px' }}>
                        <h2 className="text-2xl font-extrabold text-white mb-2 text-center" style={{ marginTop: '1.5rem' }}>{steps[step].title}</h2>
                        {steps[step].description && (
                            <p className="text-base text-white/80 text-center max-w-xs mx-auto mb-4">
                                {steps[step].description}
                            </p>
                        )}
                        {/* Day split columns with relative bar heights */}
                        <div className="flex w-full justify-around gap-6 mb-4">
                            {/* Without Zene */}
                            <div className="flex flex-col items-center w-1/2">
                                <div className="text-base font-bold text-white mb-1">Without</div>
                                <div className="flex flex-col items-center w-full" style={{ height: '400px', width: '96px' }}>
                                    <div className="w-full bg-emerald-900/60 rounded-t-xl flex flex-col items-center justify-center mb-1" style={{ flexGrow: 3, minHeight: '100px' }}>
                                        <span className="text-2xl">📱</span>
                                        <span className="text-base text-white/80 mt-1">Scrolling</span>
                                    </div>
                                    <div className="w-full bg-emerald-800/80 flex flex-col items-center justify-center mb-1" style={{ flexGrow: 1, minHeight: '60px' }}>
                                        <span className="text-2xl">😐</span>
                                        <span className="text-base text-white/80 mt-1">Tasks</span>
                                    </div>
                                    <div className="w-full bg-emerald-700/80 rounded-b-xl flex flex-col items-center justify-center" style={{ flexGrow: 2, minHeight: '80px' }}>
                                        <span className="text-2xl">😩</span>
                                        <span className="text-base text-white/80 mt-1">Stressed</span>
                                    </div>
                                </div>
                            </div>
                            {/* With Zene */}
                            <div className="flex flex-col items-center w-1/2">
                                <div className="text-base font-bold text-white mb-1">With</div>
                                <div className="flex flex-col items-center w-full" style={{ height: '400px', width: '96px' }}>
                                    <div className="w-full bg-emerald-400/90 rounded-t-xl flex flex-col items-center justify-center mb-1" style={{ flexGrow: 3, minHeight: '100px' }}>
                                        <span className="text-2xl">✅</span>
                                        <span className="text-base text-emerald-900 mt-1">Tasks</span>
                                    </div>
                                    <div className="w-full bg-emerald-300/90 flex flex-col items-center justify-center mb-1" style={{ flexGrow: 1, minHeight: '60px' }}>
                                        <span className="text-2xl">🧘</span>
                                        <span className="text-base text-emerald-900 mt-1">Mindful</span>
                                    </div>
                                    <div className="w-full bg-emerald-200/90 rounded-b-xl flex flex-col items-center justify-center" style={{ flexGrow: 2, minHeight: '80px' }}>
                                        <span className="text-2xl">😊</span>
                                        <span className="text-base text-emerald-900 mt-1">Relaxed</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Footer text */}
                        <div className="text-base font-bold text-emerald-100 text-center mt-2">Zene helps you spend more time on what matters</div>
                    </div>
                )}
                {/* Summary Step: Free Trial Timeline */}
                {steps[step].type === 'summary' && (
                    <div className="w-full max-w-xs mx-auto flex flex-col items-center justify-center" style={{ minHeight: '420px' }}>
                        {/* Main description */}
                        <div className="text-xl font-bold text-white mb-12 text-center">{steps[step].description}</div>
                        {/* Timeline */}
                        <div className="flex w-full items-start gap-4 mb-2">
                            {/* Timeline icons and line */}
                            <div className="flex flex-col items-center" style={{ minWidth: '32px', height: '320px', justifyContent: 'space-between' }}>
                                <span className="text-2xl mb-2">🔓</span>
                                <div className="flex-1 w-1 bg-emerald-300 rounded-full" style={{ minHeight: '80px', marginBottom: '6px' }}></div>
                                <span className="text-2xl mb-2">🌱</span>
                                <div className="flex-1 w-1 bg-emerald-300 rounded-full" style={{ minHeight: '80px', marginBottom: '6px' }}></div>
                                <span className="text-2xl">⭐</span>
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
            {/* Step indicators */}
            <div className="flex items-center justify-center gap-2 mb-8">
                {steps.map((_, i) => (
                    <span key={i} className={`w-2 h-2 rounded-full ${i === step ? 'bg-white' : 'bg-white/30'} transition-all`}></span>
                ))}
            </div>
            <div className="flex w-full max-w-xs gap-3 mb-2 animate-float">
                {step > 0 && (
                    <button
                        className="flex-1 py-3 rounded-xl bg-emerald-900/60 text-emerald-200 font-bold text-lg shadow-lg active:bg-emerald-800 transition"
                        onClick={handleBack}
                    >
                        Back
                    </button>
                )}
                <button
                    className="flex-1 py-3 rounded-xl bg-emerald-400 text-emerald-900 font-bold text-lg shadow-lg active:bg-emerald-300 transition"
                    onClick={handleNextWithReset}
                >
                    {step < steps.length - 1 ? "Next" : "Let's Go!"}
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