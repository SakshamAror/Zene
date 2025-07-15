import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, Clock, Target, Square, X, ChevronDown, Maximize } from 'lucide-react';
import { saveMeditationSession, saveWorkSession, getUserPrefs } from '../lib/saveData';
import { supabase } from '../lib/supabase';
import { useCallback } from 'react';
import type { View } from '../App';
import ReactDOM from 'react-dom';
import { Emoji } from './Emoji';

interface TimersProps {
    userId: string;
    setCurrentView?: (view: View) => void;
    onTimerActiveChange?: (active: boolean) => void; // NEW PROP
}

type TimerMode = 'meditation' | 'focus';

function getStartOfWeek() {
    const now = new Date();
    const day = now.getDay(); // 0 (Sun) - 6 (Sat)
    const diff = now.getDate() - day;
    const start = new Date(now.setDate(diff));
    start.setHours(0, 0, 0, 0);
    return start;
}

// Define prebuilt avatars (keep in sync with Settings.tsx)
const AVATARS = [
    { key: 'leaf', emoji: '🌱', bg: 'bg-emerald-900' },
    { key: 'laptop', emoji: '💻', bg: 'bg-blue-900' },
    { key: 'monkey', emoji: '🐵', bg: 'bg-yellow-900' },
    { key: 'star', emoji: '⭐️', bg: 'bg-yellow-700' },
    { key: 'book', emoji: '📚', bg: 'bg-purple-900' },
    { key: 'coffee', emoji: '☕️', bg: 'bg-orange-900' },
    { key: 'cat', emoji: '🐱', bg: 'bg-pink-900' },
    { key: 'dog', emoji: '🐶', bg: 'bg-yellow-800' },
    { key: 'fox', emoji: '🦊', bg: 'bg-orange-700' },
    { key: 'owl', emoji: '🦉', bg: 'bg-gray-800' },
    { key: 'panda', emoji: '🐼', bg: 'bg-gray-700' },
    { key: 'tiger', emoji: '🐯', bg: 'bg-yellow-600' },
    { key: 'unicorn', emoji: '🦄', bg: 'bg-pink-700' },
    { key: 'robot', emoji: '🤖', bg: 'bg-gray-600' },
    { key: 'alien', emoji: '👽', bg: 'bg-green-800' },
    { key: 'rocket', emoji: '🚀', bg: 'bg-blue-700' },
    { key: 'ghost', emoji: '👻', bg: 'bg-white text-gray-800' },
    { key: 'penguin', emoji: '🐧', bg: 'bg-blue-800' },
    { key: 'frog', emoji: '🐸', bg: 'bg-green-700' },
    { key: 'bear', emoji: '🐻', bg: 'bg-yellow-900' },
    { key: 'lion', emoji: '🦁', bg: 'bg-yellow-700' },
    { key: 'dolphin', emoji: '🐬', bg: 'bg-blue-400' },
    { key: 'whale', emoji: '🐋', bg: 'bg-blue-900' },
    { key: 'elephant', emoji: '🐘', bg: 'bg-gray-500' },
    { key: 'dragon', emoji: '🐲', bg: 'bg-green-900' },
    { key: 'crown', emoji: '👑', bg: 'bg-yellow-500' },
    { key: 'rainbow', emoji: '🌈', bg: 'bg-pink-400' },
    { key: 'sun', emoji: '☀️', bg: 'bg-yellow-400' },
    { key: 'moon', emoji: '🌙', bg: 'bg-blue-900' },
    { key: 'mountain', emoji: '⛰️', bg: 'bg-gray-800' },
    { key: 'tree', emoji: '🌳', bg: 'bg-green-800' },
    { key: 'flower', emoji: '🌸', bg: 'bg-pink-500' },
    { key: 'butterfly', emoji: '🦋', bg: 'bg-blue-300' },
    { key: 'crystal', emoji: '🔮', bg: 'bg-purple-700' },
];

type FriendsLeaderboardProps = {
    userId: string;
    mode?: 'meditation' | 'focus';
    setCurrentView?: (view: View) => void;
};
function FriendsLeaderboard({ userId, mode = 'meditation', setCurrentView }: FriendsLeaderboardProps) {
    const [loading, setLoading] = useState(true);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [transitioning, setTransitioning] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [leaderboardError, setLeaderboardError] = useState<string | null>(null); // NEW

    const fetchLeaderboard = useCallback(async () => {
        setLoading(true);
        setLeaderboardError(null);
        try {
            // 1. Get all friend user IDs
            const { data: friendsRows, error: friendsError } = await supabase
                .from('friends')
                .select('user_id, friend_user_id')
                .or(`user_id.eq.${userId},friend_user_id.eq.${userId}`);
            if (friendsError) {
                throw friendsError;
            }
            const friendIds = new Set<string>();
            friendsRows?.forEach(row => {
                if (row.user_id !== userId) friendIds.add(row.user_id);
                if (row.friend_user_id !== userId) friendIds.add(row.friend_user_id);
            });
            const allUserIds = [userId, ...Array.from(friendIds)];
            // 2. Fetch user profiles (from 'profiles' table, using user_id and avatar_key)
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('user_id, full_name, avatar_key')
                .in('user_id', allUserIds);
            if (profilesError) {
                throw profilesError;
            }
            // 3. Fetch weekly stats for all users
            const startOfWeek = getStartOfWeek();
            const { data: meditationStats, error: meditationStatsError } = await supabase
                .from('meditation_sessions')
                .select('user_id, length, timestamp')
                .in('user_id', allUserIds)
                .gte('timestamp', startOfWeek.toISOString());
            if (meditationStatsError) {
                throw meditationStatsError;
            }
            const { data: workStats, error: workStatsError } = await supabase
                .from('work_sessions')
                .select('user_id, length, timestamp')
                .in('user_id', allUserIds)
                .gte('timestamp', startOfWeek.toISOString());
            if (workStatsError) {
                throw workStatsError;
            }
            // 4. Aggregate stats
            const statsMap: Record<string, { meditation: number; work: number }> = {};
            allUserIds.forEach(id => statsMap[id] = { meditation: 0, work: 0 });
            meditationStats?.forEach(s => {
                statsMap[s.user_id].meditation += s.length;
            });
            workStats?.forEach(s => {
                statsMap[s.user_id].work += s.length;
            });
            // 5. Build leaderboard
            let leaderboard = allUserIds.map(id => {
                const profile = profiles?.find(p => p.user_id === id);
                const fullName = profile?.full_name || 'Unknown';
                const avatarKey = profile?.avatar_key || 'leaf';
                const avatarObj = AVATARS.find(a => a.key === avatarKey) || AVATARS[0];
                return {
                    id,
                    name: fullName,
                    avatar: avatarObj,
                    meditation: Math.round(statsMap[id].meditation / 60),
                    work: Math.round(statsMap[id].work / 60),
                    isSelf: id === userId,
                };
            });
            // Sort by selected mode
            leaderboard = leaderboard.sort((a, b) => {
                if (mode === 'meditation') {
                    return b.meditation - a.meditation;
                } else {
                    return b.work - a.work;
                }
            });
            setLeaderboard(leaderboard);
        } catch (err) {
            setLeaderboardError('Could not load leaderboard. Please check your internet connection.');
        } finally {
            setLoading(false);
        }
    }, [userId, mode]);

    useEffect(() => {
        fetchLeaderboard();
    }, [fetchLeaderboard]);

    // In FriendsLeaderboard, set a larger minHeight for 3 users
    if (loading) return (
        <div className="w-full max-w-2xl mx-auto bg-emerald-900/60 rounded-xl p-3 border border-emerald-700 mb-4 text-center text-white/80 text-sm min-h-[220px] flex items-center justify-center">Loading leaderboard...</div>
    );
    if (leaderboardError) return (
        <div className="w-full max-w-2xl mx-auto bg-emerald-900/60 rounded-xl p-3 border border-emerald-700 mb-4 text-center text-red-300 text-sm min-h-[220px] flex items-center justify-center">{leaderboardError}</div>
    );
    if (!leaderboard.length) return <div className="w-full max-w-2xl mx-auto min-h-[220px] mb-4" />;
    const visibleLeaderboard = leaderboard.slice(0, 3);
    // Only show Add Friends if user has less than 2 friends (excluding self)
    const showAddFriends = leaderboard.length - 1 < 2;
    // Leaderboard Card (always top 3)
    // Helper for motivational quotes
    const quotes = [
        "Every minute counts. Climb the leaderboard!",
        "Consistency beats intensity. Keep showing up!",
        "Your friends are your rivals. Compete and grow!",
        "A little progress each day adds up to big results.",
        "Your effort inspires your friends!",
        "Stay focused, stay mindful, stay ahead!",
        "Greatness is a team sport. Bring your friends along!",
        "The journey is better with friends. Keep going!",
        "You’re closer to the top than you think!"
    ];
    function getRandomQuote() {
        const idx = Math.floor(Math.random() * quotes.length);
        return quotes[idx];
    }
    // Open/close animation logic
    const openModal = () => {
        setTransitioning(true);
        setModalOpen(true);
        setTimeout(() => setTransitioning(false), 10);
    };
    const closeModal = () => {
        setTransitioning(true);
        setTimeout(() => {
            setModalOpen(false);
            setTransitioning(false);
        }, 300);
    };
    return (
        <>
            <div
                className="w-full max-w-2xl mx-auto bg-emerald-900/60 rounded-2xl p-3 border border-emerald-700 mb-4 cursor-pointer transition hover:scale-[1.01] hover:shadow-lg min-h-[220px]"
                onClick={openModal}
                style={{ position: 'relative' }}
            >
                <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-xs text-emerald-300 font-semibold">Weekly {mode === 'meditation' ? 'Meditation' : 'Focus'} Leaderboard</span>
                    {/* Tap to expand text, top right, no underline */}
                    {leaderboard.length > 1 && (
                        <span
                            className="text-xs text-white/40 hover:text-emerald-200 transition cursor-pointer select-none"
                            style={{ marginLeft: 'auto' }}
                        >
                            Tap to expand
                        </span>
                    )}
                </div>
                <div className="space-y-1">
                    {visibleLeaderboard.map((user, idx) => {
                        // Medal colors for top 3
                        let rankBg = '';
                        let rankText = 'text-emerald-300';
                        if (idx === 0) {
                            rankBg = 'bg-yellow-400';
                            rankText = 'text-yellow-700';
                        } else if (idx === 1) {
                            rankBg = 'bg-gray-300';
                            rankText = 'text-gray-700';
                        } else if (idx === 2) {
                            rankBg = 'bg-yellow-800';
                            rankText = 'text-yellow-200';
                        }
                        return (
                            <div
                                key={user.id}
                                className={`flex items-center space-x-2 p-2 rounded-lg ${user.isSelf ? 'bg-emerald-400/20 border border-emerald-400/30' : 'bg-emerald-800/40 border border-emerald-700'}`}
                                style={{ minHeight: 0 }}
                            >
                                <div className={`w-6 h-6 flex items-center justify-center rounded-full font-bold text-xs ${rankBg} ${rankText} text-center`}>
                                    {idx + 1}
                                </div>
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center border border-emerald-400 ${user.avatar.bg} text-lg`} style={{ fontSize: '1.1rem' }}>
                                    <Emoji emoji={user.avatar.emoji} png={`${user.avatar.key}.png`} alt={user.avatar.key} size="md" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-white font-medium text-sm flex items-center max-w-[12rem]" style={{ overflow: 'hidden' }}>
                                        <span className={user.isSelf ? 'truncate' : 'truncate w-full'} style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                            {user.name}
                                        </span>
                                        {user.isSelf && (
                                            <span className="ml-1 flex-shrink-0">(You)</span>
                                        )}
                                    </div>
                                    <div className={`text-xs ${mode === 'meditation' ? 'text-emerald-200' : 'text-blue-200'}`}>
                                        {mode === 'meditation'
                                            ? `Meditation: ${user.meditation}m`
                                            : `Focus: ${user.work}m`}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {/* Add Friends Button */}
                {showAddFriends && (
                    <div className="flex justify-center mt-3">
                        <button
                            className="text-emerald-300 text-xs underline underline-offset-2 hover:text-emerald-200 transition"
                            style={{ padding: '0.25rem 0.5rem' }}
                            onClick={e => {
                                e.stopPropagation();
                                if (setCurrentView) {
                                    setCurrentView('settings');
                                }
                            }}
                        >
                            Add Friends
                        </button>
                    </div>
                )}
            </div>
            {/* Pop-up for Full Leaderboard (smaller, animated, with back button and extras) */}
            {modalOpen && ReactDOM.createPortal(
                <div className={`fixed inset-0 z-50 min-h-screen bg-gradient-to-b from-emerald-900 to-emerald-700 flex flex-col items-center px-2 py-10 transition-all duration-300 ${transitioning ? 'opacity-0 translate-y-8 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
                    {/* Back Button (top left, always justified) */}
                    <button
                        className="bg-emerald-900/80 rounded-full p-2 shadow-md border border-emerald-700 text-emerald-200 hover:bg-emerald-800/90 transition absolute top-6 left-6 z-50"
                        onClick={closeModal}
                        aria-label="Back to Timers"
                    >
                        {/* Use lucide-react ArrowLeft icon for consistency */}
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                    </button>
                    {/* Header Section: emoji, title, subtitle, matching Analytics vertical spacing */}
                    <div className="w-full flex flex-col items-center mt-8 mb-8 select-none">
                        <div className="mb-6 animate-float">
                            <Emoji emoji="🏆" png="trophy.png" alt="trophy" size="3xl" />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-3 text-center" style={{ letterSpacing: '-0.03em' }}>
                            Weekly {mode === 'meditation' ? 'Meditation' : 'Focus'} Leaderboard
                        </h1>
                        <p className="text-white/80 text-lg max-w-sm mx-auto text-center">
                            Grow with your friends
                        </p>
                    </div>
                    {/* User's Rank and Progress Bar */}
                    {(() => {
                        const selfIdx = leaderboard.findIndex(u => u.isSelf);
                        if (selfIdx === -1) return null;
                        const self = leaderboard[selfIdx];
                        const next = leaderboard[selfIdx - 1];
                        let progress = 1;
                        let label = 'You are at the top!';
                        if (next) {
                            const selfScore = mode === 'meditation' ? self.meditation : self.work;
                            const nextScore = mode === 'meditation' ? next.meditation : next.work;
                            const prevScore = leaderboard[selfIdx + 1] ? (mode === 'meditation' ? leaderboard[selfIdx + 1].meditation : leaderboard[selfIdx + 1].work) : 0;
                            progress = (selfScore - prevScore) / Math.max(1, nextScore - prevScore);
                            label = `You are #${selfIdx + 1} • ${nextScore - selfScore > 0 ? `${nextScore - selfScore}m to #${selfIdx}` : 'Keep it up!'}`;
                        }
                        return (
                            <div className="w-full max-w-xs mx-auto mb-6">
                                <div className="text-white/80 text-sm mb-1 text-center">{label}</div>
                                <div className="h-3 bg-emerald-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.max(10, Math.min(100, Math.round(progress * 100)))}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })()}
                    {/* Leaderboard Content */}
                    <div className="w-full max-w-xl mx-auto">
                        <div className="space-y-3 overflow-y-auto max-h-[48vh] pb-6">
                            {leaderboard.map((user, idx) => {
                                // Medal colors for top 3
                                let rankBg = '';
                                let rankText = 'text-emerald-300';
                                if (idx === 0) {
                                    rankBg = 'bg-yellow-400';
                                    rankText = 'text-yellow-700';
                                } else if (idx === 1) {
                                    rankBg = 'bg-gray-300';
                                    rankText = 'text-gray-700';
                                } else if (idx === 2) {
                                    rankBg = 'bg-yellow-800';
                                    rankText = 'text-yellow-200';
                                }
                                return (
                                    <div
                                        key={user.id}
                                        className={`flex items-center space-x-4 p-4 rounded-2xl ${user.isSelf ? 'bg-emerald-400/20 border border-emerald-400/30' : 'bg-emerald-800/40 border border-emerald-700'}`}
                                        style={{ minHeight: 56 }}
                                    >
                                        <div className={`w-10 h-10 flex items-center justify-center rounded-full font-bold text-lg ${rankBg} ${rankText} text-center`}>
                                            {idx + 1}
                                        </div>
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 border-emerald-400 ${user.avatar.bg} text-xl`} style={{ fontSize: '1.5rem' }}>
                                            <Emoji emoji={user.avatar.emoji} png={`${user.avatar.key}.png`} alt={user.avatar.key} size="md" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-white font-semibold text-base flex items-center max-w-[12rem]" style={{ overflow: 'hidden' }}>
                                                <span className={user.isSelf ? 'truncate' : 'truncate w-full'} style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                    {user.name}
                                                </span>
                                                {user.isSelf && (
                                                    <span className="ml-2 flex-shrink-0 text-emerald-300 text-sm">(You)</span>
                                                )}
                                            </div>
                                            <div className={`text-sm mt-1 ${mode === 'meditation' ? 'text-emerald-200' : 'text-blue-200'}`}
                                                style={{ fontWeight: 500 }}>
                                                {mode === 'meditation'
                                                    ? `Meditation: ${user.meditation}m`
                                                    : `Focus: ${user.work}m`}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {/* Motivational Quote */}
                    <div className="w-full max-w-xs mx-auto mt-8 text-center">
                        <div className="text-white/70 text-base italic animate-fade-in">
                            {getRandomQuote()}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

export default function Timers({ userId, setCurrentView, onTimerActiveChange }: TimersProps) {
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
    const meditationCompletedRef = useRef(false);
    const focusCompletedRef = useRef(false);

    // Focus Stopwatch State
    const [focusTime, setFocusTime] = useState(0);
    const [isFocusActive, setIsFocusActive] = useState(false);
    const [focusSessions, setFocusSessions] = useState(0);
    const [focusSelectedAudio, setFocusSelectedAudio] = useState('none');
    const [focusVolume, setFocusVolume] = useState(0.5);
    const focusAudioRef = useRef<HTMLAudioElement | null>(null);
    const focusIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Current Mode - Initialize based on user's main goal
    const [currentMode, setCurrentMode] = useState<TimerMode>('meditation');
    const [showDurationPicker, setShowDurationPicker] = useState(false);
    const [showAudioSettings, setShowAudioSettings] = useState(false);

    const timerCircleRef = useRef<HTMLDivElement | null>(null);

    // Fetch user preferences to determine default mode
    const [modeLoading, setModeLoading] = useState(true); // NEW: loading state for mode
    useEffect(() => {
        const fetchUserPrefs = async () => {
            try {
                const prefs = await getUserPrefs(userId);
                if (prefs?.main_goal) {
                    // Default to meditation for mindfulness/relax goals, focus for others
                    const shouldDefaultToMeditation = prefs.main_goal === 'mindfulness' || prefs.main_goal === 'relax';
                    setCurrentMode(shouldDefaultToMeditation ? 'meditation' : 'focus');
                }
            } catch (error) {
                // Keep default meditation mode if there's an error
                console.error('Error fetching user preferences:', error);
            } finally {
                setModeLoading(false); // Done loading
            }
        };
        fetchUserPrefs();
    }, [userId]);

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
                        if (!meditationCompletedRef.current) { // ADD GUARD
                            meditationCompletedRef.current = true;
                            handleMeditationComplete();
                        }
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
        meditationCompletedRef.current = false; // RESET GUARD ON DURATION CHANGE
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
        if (meditationCompletedRef.current) return; // GUARD
        meditationCompletedRef.current = true;
        try {
            await saveMeditationSession({
                user_id: userId,
                length: meditationDuration,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            // console.error('Error saving meditation session:', error);
        }
    };

    const handleMeditationSessionSave = async (elapsedTime: number) => {
        try {
            await saveMeditationSession({
                user_id: userId,
                length: elapsedTime,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            // console.error('Error saving meditation session:', error);
        }
    };

    const handleFocusSessionComplete = async () => {
        if (focusCompletedRef.current) return; // GUARD
        focusCompletedRef.current = true;
        try {
            await saveWorkSession({
                user_id: userId,
                length: focusTime,
                timestamp: new Date().toISOString(),
            });
            setFocusSessions(prev => prev + 1);
        } catch (error) {
            // console.error('Error saving focus session:', error);
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
            meditationCompletedRef.current = false; // RESET GUARD ON START
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
            focusCompletedRef.current = false; // RESET GUARD ON START
            setIsFocusActive(true);
        }
    };

    const cancelFocusSession = () => {
        setIsFocusActive(false);
        setFocusTime(0);
        focusCompletedRef.current = false; // RESET GUARD ON CANCEL
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

    // Check if any timer is active
    const isTimerActive = isMeditationActive || isFocusActive;

    // Automatically open ambient sounds when timer starts
    useEffect(() => {
        if (isTimerActive) {
            setShowAudioSettings(true);
            setShowDurationPicker(false); // Close duration picker if open
        }
    }, [isTimerActive]);

    // Custom smooth scroll function for longer scroll duration
    function smoothScrollTo(targetY: number, duration: number = 250) {
        const startY = window.scrollY || window.pageYOffset;
        const distance = targetY - startY;
        const startTime = performance.now();

        function step(currentTime: number) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = progress < 0.5
                ? 2 * progress * progress
                : -1 + (4 - 2 * progress) * progress;
            window.scrollTo(0, startY + distance * ease);
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        }
        requestAnimationFrame(step);
    }

    // Scroll timer into view with offset when timer starts
    useEffect(() => {
        if (isTimerActive && timerCircleRef.current) {
            setTimeout(() => {
                if (!timerCircleRef.current) return;
                const rect = timerCircleRef.current.getBoundingClientRect();
                const scrollY = window.scrollY || window.pageYOffset;
                const offset = 24; // px below the top of the viewport
                const targetY = rect.top + scrollY - offset;
                // Prevent scrolling past the bottom of the page
                const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
                smoothScrollTo(Math.min(targetY, maxScroll), 700); // 700ms scroll duration
            }, 75); // Delay to ensure DOM is ready
        }
    }, [isTimerActive]);

    // Notify parent (App.tsx) about timer active state
    useEffect(() => {
        if (onTimerActiveChange) onTimerActiveChange(isTimerActive);
    }, [isTimerActive, onTimerActiveChange]);

    useEffect(() => {
        if (!isMeditationActive) {
            meditationCompletedRef.current = false; // RESET GUARD WHEN TIMER STOPS
        }
    }, [isMeditationActive]);

    if (modeLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 loading-spinner mx-auto mb-4"></div>
                    <p className="text-white/80 font-medium">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center px-4 md:px-12 lg:px-24 py-10">
            {/* Fade-out overlay when timer is active (background only, not timer/controls) */}
            {isTimerActive && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-all duration-500 m-0 p-0 border-none" />
            )}

            {/* Header */}
            <div className={`text-center mb-8 transition-all duration-700 z-30 ${isTimerActive ? 'opacity-30 pointer-events-none' : ''}`}> {/* z-30 to keep above overlay */}
                {/* For the meditation/focus header icon: */}
                <div className={`flex items-center justify-center mx-auto animate-float ${currentMode === 'meditation' ? "mb-6" : ""}`}>
                    <Emoji
                        emoji={currentMode === 'meditation' ? "🧘" : "💻"}
                        png={currentMode === 'meditation' ? "mindfulness.png" : "laptop.png"}
                        alt={currentMode === 'meditation' ? "meditation" : "focus"}
                        size={currentMode === 'meditation' ? "2xl" : "3xl"}
                        className={currentMode === 'meditation' ? "mb-0" : "mb-2"}
                    />
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

            {/* Leaderboard (now under the header) */}
            <div className={`w-full transition-all duration-700 z-30 ${isTimerActive ? 'opacity-30 pointer-events-none' : ''}`}>
                <FriendsLeaderboard userId={userId} mode={currentMode} setCurrentView={setCurrentView} />
            </div>

            {/* Mode Toggle */}
            <div className={`flex bg-emerald-900/60 rounded-2xl p-2 mb-8 border border-emerald-700 transition-all duration-700 z-30 ${isTimerActive ? 'opacity-30 pointer-events-none' : ''}`}>
                <button
                    onClick={() => setCurrentMode('meditation')}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all ${currentMode === 'meditation'
                        ? 'bg-emerald-400 text-emerald-900'
                        : 'text-emerald-200'
                        }`}
                >
                    Meditation
                </button>
                <button
                    onClick={() => setCurrentMode('focus')}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all ${currentMode === 'focus'
                        ? 'bg-emerald-400 text-emerald-900'
                        : 'text-emerald-200'
                        }`}
                >
                    Focus
                </button>
            </div>

            {/* Timer/Stopwatch Circle - Always visible and interactive */}
            <div ref={timerCircleRef} className="relative w-80 h-80 mb-12 z-50"> {/* z-50 to keep above overlay */}
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
                        <div className={`font-medium ${currentMode === 'meditation' ? 'text-emerald-300' : 'text-blue-300'
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

            {/* Controls - Always visible and interactive */}
            <div className="flex space-x-4 mb-8 z-50"> {/* z-50 to keep above overlay */}
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

            {/* Settings - Always visible and interactive */}
            <div className="w-full max-w-sm space-y-4 z-50"> {/* z-50 to keep above overlay */}
                {currentMode === 'meditation' && (
                    <div className="text-center">
                        <button
                            onClick={() => setShowDurationPicker(!showDurationPicker)}
                            className={`py-3 px-6 bg-emerald-900/60 text-emerald-200 font-semibold rounded-xl border border-emerald-700 active:bg-emerald-800 transition ${isMeditationActive ? 'opacity-50 pointer-events-none' : ''}`}
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
                                        className={`py-2 px-3 rounded-xl font-medium transition-all ${meditationDuration === dur.value
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
                                        className={`py-2 px-3 rounded-xl font-medium transition-all ${(currentMode === 'meditation' ? selectedAudio : focusSelectedAudio) === option.value
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