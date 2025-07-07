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
            <div className="flex items-center justify-center min-h-[300px]">
                <div className="w-8 h-8 loading-spinner"></div>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto mt-8">
            <div className="opal-card p-6 sm:p-8">
                <h2 className="text-xl font-bold text-primary mb-4">Settings</h2>
                <div className="border-b border-white/10 mb-6"></div>
                <div className="mb-4">
                    <label className="block text-sm font-semibold text-primary mb-2">Name</label>
                    <input
                        type="text"
                        className="opal-input w-full"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Your name"
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-semibold text-primary mb-2">Meditation Goal (minutes/day)</label>
                    <input
                        type="number"
                        min={1}
                        className="opal-input w-full"
                        value={meditationGoalMinutes}
                        onChange={e => setMeditationGoalMinutes(Number(e.target.value))}
                        placeholder="e.g. 30"
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-semibold text-primary mb-2">Focus Goal (minutes/day)</label>
                    <input
                        type="number"
                        min={1}
                        className="opal-input w-full"
                        value={focusGoalMinutes}
                        onChange={e => setFocusGoalMinutes(Number(e.target.value))}
                        placeholder="e.g. 120"
                    />
                </div>
                {message && <div className="text-green-400 mb-2 text-sm">{message}</div>}
                {error && <div className="text-red-400 mb-2 text-sm">{error}</div>}
                <button
                    className="opal-button w-full mb-4 rounded-xl"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                    className="w-full py-2 rounded-xl border border-red-700 text-red-400 bg-[#18181b] hover:bg-[#232326] transition font-semibold"
                    onClick={signOut}
                >
                    Log Out
                </button>
            </div>
        </div>
    );
};

export default Settings; 