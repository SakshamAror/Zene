import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getUserPrefs, upsertUserPrefs } from '../lib/saveData';
import { User } from '@supabase/supabase-js';
import { Emoji } from './Emoji';

// Prebuilt avatars (should match Timers.tsx)
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

interface SettingsProps {
    user: User;
    signOut: () => void;
    refreshFriendNotifications: () => void;
}

const Settings: React.FC<SettingsProps> = ({ user, signOut, refreshFriendNotifications }) => {
    const [name, setName] = useState(user.user_metadata?.full_name || user.user_metadata?.name || '');
    const [meditationGoalMinutes, setMeditationGoalMinutes] = useState(30);
    const [focusGoalMinutes, setFocusGoalMinutes] = useState(120);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedAvatar, setSelectedAvatar] = useState<string>('leaf');
    const [friendEmail, setFriendEmail] = useState(''); // Only email, not user ID
    const [friendRequestError, setFriendRequestError] = useState<string | null>(null);
    const [friendRequestSuccess, setFriendRequestSuccess] = useState<string | null>(null);
    const [pendingSent, setPendingSent] = useState<any[]>([]);
    const [pendingReceived, setPendingReceived] = useState<any[]>([]);
    const [friends, setFriends] = useState<any[]>([]);
    const [profilesMap, setProfilesMap] = useState<Record<string, any>>({});
    const [showLeftAvatar, setShowLeftAvatar] = useState(false);
    const [showRightAvatar, setShowRightAvatar] = useState(false);
    const avatarRef = useRef<HTMLDivElement>(null);

    // Fetch friend requests and friends
    const fetchFriendsAndRequests = useCallback(async () => {
        // 1. Fetch all friend requests involving this user
        const { data: requests } = await supabase
            .from('friend_requests')
            .select('*')
            .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);
        setPendingSent(requests?.filter(r => r.from_user_id === user.id && r.status === 'pending') || []);
        setPendingReceived(requests?.filter(r => r.to_user_id === user.id && r.status === 'pending') || []);
        // 2. Fetch all friends
        const { data: friendsRows } = await supabase
            .from('friends')
            .select('user_id, friend_user_id')
            .or(`user_id.eq.${user.id},friend_user_id.eq.${user.id}`);
        const friendIds = new Set<string>();
        friendsRows?.forEach(row => {
            if (row.user_id !== user.id) friendIds.add(row.user_id);
            if (row.friend_user_id !== user.id) friendIds.add(row.friend_user_id);
        });
        setFriends(Array.from(friendIds));
        // 3. Fetch profiles for all relevant users
        const allUserIds = [user.id, ...Array.from(friendIds), ...((requests || []).map(r => r.from_user_id).concat((requests || []).map(r => r.to_user_id)))]
            .filter((v, i, arr) => arr.indexOf(v) === i);
        if (allUserIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('user_id, full_name, avatar_key')
                .in('user_id', allUserIds);
            const map: Record<string, any> = {};
            profiles?.forEach(p => { map[p.user_id] = p; });
            setProfilesMap(map);
        }
    }, [user.id]);

    useEffect(() => {
        async function fetchPrefsAndProfile() {
            setLoading(true);
            setError(null);
            try {
                const prefs = await getUserPrefs(user.id);
                if (prefs) {
                    setMeditationGoalMinutes(prefs.meditation_goal || 15);
                    setFocusGoalMinutes(prefs.focus_goal || 120);
                } else {
                    await upsertUserPrefs({
                        user_id: user.id,
                        meditation_goal: 15,
                        focus_goal: 120,
                    });
                    setMeditationGoalMinutes(15);
                    setFocusGoalMinutes(120);
                }
                // Fetch avatar and email from profiles
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('avatar_key, email')
                    .eq('user_id', user.id)
                    .single();
                if (profile && profile.avatar_key) {
                    setSelectedAvatar(profile.avatar_key);
                }
                // If email is missing in profile, upsert it from user metadata
                if (!profile || !profile.email) {
                    const email = user.user_metadata?.email || user.email;
                    if (email) {
                        await supabase.from('profiles').upsert({
                            user_id: user.id,
                            email,
                        }, { onConflict: 'user_id' });
                    }
                }
            } catch (e) {
                setMeditationGoalMinutes(15);
                setFocusGoalMinutes(120);
            } finally {
                setLoading(false);
            }
        }
        fetchPrefsAndProfile();
    }, [user.id]);

    useEffect(() => {
        fetchFriendsAndRequests();
    }, [fetchFriendsAndRequests]);

    useEffect(() => {
        // Clear notifications for outgoing friend requests that have been accepted
        async function clearFriendNotifications() {
            const { error } = await supabase
                .from('friend_requests')
                .update({ notified: true })
                .eq('from_user_id', user.id)
                .eq('status', 'accepted')
                .eq('notified', false);
            if (error) {
                console.error('Failed to update notified:', error);
            }
            refreshFriendNotifications();
        }
        clearFriendNotifications();
    }, [user.id]);

    // Send friend request
    const handleSendFriendRequest = async () => {
        setFriendRequestError(null);
        setFriendRequestSuccess(null);
        // Only allow email
        const email = friendEmail.trim().toLowerCase();
        if (!email || !email.includes('@')) {
            setFriendRequestError('Please enter a valid email address.');
            return;
        }
        // Prevent sending request to self
        const myEmail = user.user_metadata?.email?.toLowerCase() || user.email?.toLowerCase();
        if (email === myEmail) {
            setFriendRequestError('You cannot add yourself.');
            return;
        }
        // Look up user_id by email in profiles
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('email', email)
            .maybeSingle();
        if (profileError || !profile) {
            setFriendRequestError('User does not exist.');
            return;
        }
        const toUserId = profile.user_id;
        if (friends.includes(toUserId)) {
            setFriendRequestError('You are already friends.');
            return;
        }
        if (pendingSent.some(r => r.to_user_id === toUserId)) {
            setFriendRequestError('Friend request already sent.');
            return;
        }
        // Send request
        const { error } = await supabase.from('friend_requests').insert({
            from_user_id: user.id,
            to_user_id: toUserId,
            status: 'pending'
        });
        if (error) {
            setFriendRequestError('Failed to send request.');
        } else {
            setFriendRequestSuccess('Friend request sent!');
            setFriendEmail('');
            fetchFriendsAndRequests();
        }
    };

    // Accept/reject friend request
    const handleRespondToRequest = async (requestId: string, accept: boolean, fromUserId: string) => {
        if (accept) {
            // 1. Update request status
            await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', requestId);
            // 2. Add to friends table (mutual)
            await supabase.from('friends').insert({ user_id: user.id, friend_user_id: fromUserId });
        } else {
            await supabase.from('friend_requests').update({ status: 'rejected' }).eq('id', requestId);
        }
        fetchFriendsAndRequests();
        refreshFriendNotifications();
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        setError(null);
        try {
            // 1. Update name in auth user_metadata
            const { error: updateAuthError } = await supabase.auth.updateUser({
                data: {
                    full_name: name,
                },
            });
            if (updateAuthError) throw updateAuthError;

            // 2. Upsert to profiles table (always upsert, never insert)
            const email = user.user_metadata?.email || user.email;
            const { error: profileError } = await supabase.from('profiles').upsert({
                user_id: user.id,
                full_name: name,
                avatar_key: selectedAvatar,
                email,
            }, { onConflict: 'user_id' });
            if (profileError) throw profileError;

            // 3. Upsert user prefs (ensure user_id is always present)
            await upsertUserPrefs({
                user_id: user.id,
                meditation_goal: meditationGoalMinutes,
                focus_goal: focusGoalMinutes,
            });
            setMessage('Settings saved!');
        } catch (e: any) {
            setError('Failed to save settings. ' + (e?.message || ''));
            console.error('Settings save error:', e);
        } finally {
            setSaving(false);
        }
    };

    // Helper to update gradient visibility for avatar scroll
    function updateAvatarGradient() {
        const el = avatarRef.current;
        if (!el) return;
        setShowLeftAvatar(el.scrollLeft > 2);
        // No need to setShowRightAvatar, right gradient is always shown if overflow
    }

    useEffect(() => {
        updateAvatarGradient();
        // Also update on window resize
        window.addEventListener('resize', updateAvatarGradient);
        return () => window.removeEventListener('resize', updateAvatarGradient);
    }, [AVATARS.length]);

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

    return (
        <div className="min-h-screen flex flex-col items-center px-4 md:px-12 lg:px-24 py-10">
            <div className="w-full max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex flex-col items-center text-center mb-10">
                    <div className="w-16 h-16 mb-4 flex items-center justify-center mx-auto animate-float">
                        <Emoji emoji="⚙️" png="settings.png" alt="settings" size="3xl" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
                    <p className="text-white/80 text-lg max-w-md">Personalize your Zene experience</p>
                </div>
                {/* Friend Request Section */}
                <div className="mb-8">
                    <label className="block text-white font-semibold mb-2">Add Friend</label>
                    <div className="flex space-x-2 mb-2">
                        <input
                            type="email"
                            value={friendEmail}
                            onChange={e => setFriendEmail(e.target.value)}
                            placeholder="Enter email address"
                            className="flex-1 py-2 px-4 rounded-xl bg-emerald-900/60 text-white border border-emerald-700 focus:outline-none focus:border-emerald-400"
                        />
                        <button
                            className="px-4 py-2 rounded-xl bg-emerald-400 text-emerald-900 font-bold transition"
                            onClick={handleSendFriendRequest}
                            type="button"
                        >Send</button>
                    </div>
                    {friendRequestError && <div className="text-red-400 text-sm mb-1">{friendRequestError}</div>}
                    {friendRequestSuccess && <div className="text-emerald-300 text-sm mb-1">{friendRequestSuccess}</div>}
                </div>
                {/* Pending Requests Received */}
                {pendingReceived.length > 0 && (
                    <div className="mb-6">
                        <div className="text-white font-semibold mb-2">Friend Requests</div>
                        <div className="space-y-2">
                            {pendingReceived.map(r => (
                                <div key={r.id} className="flex items-center space-x-2 bg-emerald-900/60 rounded-xl p-3 border border-emerald-700">
                                    <div className="flex-1 text-white">{profilesMap[r.from_user_id]?.full_name || r.from_user_id}</div>
                                    <button className="px-3 py-1 rounded-lg bg-emerald-400 text-emerald-900 font-bold" onClick={() => handleRespondToRequest(r.id, true, r.from_user_id)}>Accept</button>
                                    <button className="px-3 py-1 rounded-lg bg-red-400 text-red-900 font-bold" onClick={() => handleRespondToRequest(r.id, false, r.from_user_id)}>Reject</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {/* Pending Requests Sent */}
                {pendingSent.length > 0 && (
                    <div className="mb-6">
                        <div className="text-white font-semibold mb-2">Requests You Sent</div>
                        <div className="space-y-2">
                            {pendingSent.map(r => (
                                <div key={r.id} className="flex items-center space-x-2 bg-emerald-900/60 rounded-xl p-3 border border-emerald-700">
                                    <div className="flex-1 text-white">{profilesMap[r.to_user_id]?.full_name || r.to_user_id}</div>
                                    <span className="text-emerald-300 text-xs">Pending</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {/* Friends List */}
                {friends.length > 0 && (
                    <div className="mb-6">
                        <div className="text-white font-semibold mb-2">Your Friends</div>
                        <div className="space-y-2">
                            {friends.map(fid => (
                                <div key={fid} className="flex items-center space-x-2 bg-emerald-900/60 rounded-xl p-3 border border-emerald-700">
                                    <div className="flex-1 text-white">{
                                        profilesMap[fid]?.full_name
                                            ? profilesMap[fid].full_name
                                            : (profilesMap[fid] === undefined ? <span className="text-white/40 animate-pulse">Loading...</span> : fid)
                                    }</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {/* Avatar Picker */}
                <div className="mb-8">
                    <label className="block text-white font-semibold mb-2">Avatar</label>
                    <div className="relative w-full">
                        <div
                            className="flex flex-row overflow-x-auto custom-scrollbar-horizontal items-center"
                            style={{ minHeight: '64px', maxWidth: '100%', gap: '0.75rem', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                            ref={avatarRef}
                            onScroll={updateAvatarGradient}
                            tabIndex={0}
                            aria-label="Avatar picker"
                        >
                            {AVATARS.map(a => (
                                <button
                                    key={a.key}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${a.bg} border-2 ${selectedAvatar === a.key ? 'border-emerald-400 ring-2 ring-emerald-300' : 'border-emerald-700'} transition flex-shrink-0`}
                                    onClick={() => setSelectedAvatar(a.key)}
                                    type="button"
                                    aria-label={a.key}
                                    style={{ margin: 0 }}
                                >
                                    <Emoji emoji={a.emoji} png={`${a.key}.png`} alt={a.key} size="md" />
                                </button>
                            ))}
                        </div>
                        {/* Dynamic gradient overlays */}
                        {avatarRef.current && avatarRef.current.scrollWidth > avatarRef.current.clientWidth && (
                            <div className="pointer-events-none absolute top-0 right-0 h-full w-8 z-10" style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.18), transparent)' }} />
                        )}
                        {showLeftAvatar && (
                            <div className="pointer-events-none absolute top-0 left-0 h-full w-8 z-10" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.18), transparent)' }} />
                        )}
                    </div>
                </div>
                {/* Settings Form */}
                <div className="w-full space-y-6">
                    <div>
                        <label className="block text-white font-semibold mb-2">Name</label>
                        <input
                            type="text"
                            className="w-full py-4 px-6 bg-emerald-900/60 text-white placeholder-emerald-300 rounded-2xl border border-emerald-700 focus:outline-none focus:border-emerald-400 transition"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Your name"
                        />
                    </div>

                    <div>
                        <label className="block text-white font-semibold mb-2">
                            Meditation Goal (minutes/day)
                        </label>
                        <input
                            type="number"
                            min={1}
                            className="w-full py-4 px-6 bg-emerald-900/60 text-white placeholder-emerald-300 rounded-2xl border border-emerald-700 focus:outline-none focus:border-emerald-400 transition"
                            value={meditationGoalMinutes}
                            onChange={e => setMeditationGoalMinutes(Number(e.target.value))}
                            placeholder="e.g. 30"
                        />
                    </div>

                    <div>
                        <label className="block text-white font-semibold mb-2">
                            Focus Goal (minutes/day)
                        </label>
                        <input
                            type="number"
                            min={1}
                            className="w-full py-4 px-6 bg-emerald-900/60 text-white placeholder-emerald-300 rounded-2xl border border-emerald-700 focus:outline-none focus:border-emerald-400 transition"
                            value={focusGoalMinutes}
                            onChange={e => setFocusGoalMinutes(Number(e.target.value))}
                            placeholder="e.g. 120"
                        />
                    </div>

                    {message && (
                        <div className="text-emerald-300 text-center font-medium">
                            {message}
                        </div>
                    )}
                    {error && (
                        <div className="text-red-400 text-center font-medium">
                            {error}
                        </div>
                    )}

                    <button
                        className="w-full py-4 px-6 bg-emerald-400 text-emerald-900 font-bold text-lg rounded-2xl shadow-lg active:bg-emerald-300 transition disabled:opacity-50"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

                {/* Account/Other */}
                <div className="w-full mt-4">
                    <button
                        className="w-full py-4 px-6 bg-red-500/20 text-red-400 font-bold text-lg rounded-2xl border border-red-500/30 active:bg-red-500/30 transition mt-2 shadow-md"
                        onClick={signOut}
                    >
                        Log Out
                    </button>
                </div>

                {/* Motivational Footer */}
                <div className="mt-12 text-center">
                    <p className="text-white/60 text-sm">
                        Personalize your path to mindfulness.
                    </p>
                </div>
                <div className="mt-8 text-center text-xs text-white/40">
                    <a href="https://emojis.com/emoji/rocket-xYmmA4u8Af8" target="_blank" rel="noopener noreferrer">
                        Emoji by emojis.com
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Settings;