import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getUserPrefs, upsertUserPrefs } from '../lib/saveData';
import { User } from '@supabase/supabase-js';

interface SettingsProps {
    user: User;
    signOut: () => void;
}

const Settings: React.FC<SettingsProps> = ({ user, signOut }) => {
    const [name, setName] = useState(user.user_metadata?.full_name || user.user_metadata?.name || '');
    const [meditationGoalMinutes, setMeditationGoalMinutes] = useState(30);
    const [focusGoalMinutes, setFocusGoalMinutes] = useState(120);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchPrefs() {
            setLoading(true);
            setError(null);
            try {
                const prefs = await getUserPrefs(user.id);
                if (prefs) {
                    setMeditationGoalMinutes(prefs.meditation_goal || 15);
                    setFocusGoalMinutes(prefs.focus_goal || 120);
                } else {
                    // No prefs: create default row
                    await upsertUserPrefs({
                        user_id: user.id,
                        meditation_goal: 15,
                        focus_goal: 120,
                    });
                    setMeditationGoalMinutes(15);
                    setFocusGoalMinutes(120);
                }
            } catch (e) {
                setMeditationGoalMinutes(15);
                setFocusGoalMinutes(120);
            } finally {
                setLoading(false);
            }
        }
        fetchPrefs();
    }, [user.id]);

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        setError(null);
        try {
            // Update name in user_metadata
            const { error: updateError } = await supabase.auth.updateUser({
                data: {
                    full_name: name,
                },
            });
            if (updateError) throw updateError;
            // Upsert user prefs
            await upsertUserPrefs({
                user_id: user.id,
                meditation_goal: meditationGoalMinutes,
                focus_goal: focusGoalMinutes,
            });
            setMessage('Settings updated!');
        } catch (e) {
            setError('Failed to update settings.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-emerald-900 to-emerald-700 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 loading-spinner mx-auto mb-4"></div>
                    <p className="text-white/80 font-medium">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-900 to-emerald-700 flex flex-col items-center px-6 py-10">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="text-6xl mb-6 animate-float">⚙️</div>
                <h1 className="text-3xl font-bold text-white mb-3" style={{ letterSpacing: '-0.03em' }}>
                    Settings
                </h1>
                <p className="text-white/80 text-lg max-w-sm mx-auto">
                    Customize your Zene experience
                </p>
            </div>

            {/* Settings Form */}
            <div className="w-full max-w-sm space-y-6">
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

                <button
                    className="w-full py-4 px-6 bg-red-500/20 text-red-400 font-semibold rounded-2xl border border-red-500/30 active:bg-red-500/30 transition"
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
        </div>
    );
};

export default Settings;