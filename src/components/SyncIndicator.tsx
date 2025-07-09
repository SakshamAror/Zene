import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle } from 'lucide-react';
import { offlineStorage } from '../lib/offlineStorage';

interface SyncIndicatorProps {
    userId: string;
}

export default function SyncIndicator({ userId }: SyncIndicatorProps) {
    const [isOnline, setIsOnline] = useState(true);
    const [pendingSync, setPendingSync] = useState(0);
    const [lastSync, setLastSync] = useState<number | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        // Check initial online status
        checkOnlineStatus();

        // Listen for online/offline events
        window.addEventListener('online', () => setIsOnline(true));
        window.addEventListener('offline', () => setIsOnline(false));

        // Check sync status periodically
        const interval = setInterval(checkSyncStatus, 10000); // Every 10 seconds

        return () => {
            window.removeEventListener('online', () => setIsOnline(true));
            window.removeEventListener('offline', () => setIsOnline(false));
            clearInterval(interval);
        };
    }, []);

    const checkOnlineStatus = async () => {
        try {
            const response = await fetch('https://www.google.com', {
                method: 'HEAD',
                mode: 'no-cors'
            });
            setIsOnline(true);
        } catch {
            setIsOnline(false);
        }
    };

    const checkSyncStatus = async () => {
        try {
            const status = await offlineStorage.getSyncStatus();
            setPendingSync(status.pending);
            setLastSync(status.lastSync);
        } catch (error) {
            console.error('Error checking sync status:', error);
        }
    };

    const handleManualSync = async () => {
        setIsSyncing(true);
        try {
            await offlineStorage.forceSync();
            await checkSyncStatus();
        } catch (error) {
            console.error('Error during manual sync:', error);
        } finally {
            setIsSyncing(false);
        }
    };

    const formatLastSync = (timestamp: number | null) => {
        if (!timestamp) return 'Never';
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        return date.toLocaleDateString();
    };

    // Only show on mobile builds
    if (typeof window !== 'undefined' && !('Capacitor' in window)) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-40">
            <div className="flex flex-col items-end space-y-2">
                {/* Main sync indicator */}
                <div className="flex items-center space-x-2">
                    {pendingSync > 0 && (
                        <div className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-xs font-medium">
                            {pendingSync} pending
                        </div>
                    )}

                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className={`p-2 rounded-full transition-colors ${isOnline
                                ? pendingSync > 0
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                        title={isOnline ? 'Online' : 'Offline'}
                    >
                        {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
                    </button>
                </div>

                {/* Sync details panel */}
                {showDetails && (
                    <div className="opal-card p-4 min-w-64">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-primary">Sync Status</h3>
                            <button
                                onClick={() => setShowDetails(false)}
                                className="text-secondary hover:text-primary"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-secondary">Connection:</span>
                                <div className="flex items-center space-x-1">
                                    {isOnline ? (
                                        <>
                                            <Wifi size={12} className="text-green-400" />
                                            <span className="text-xs text-green-400">Online</span>
                                        </>
                                    ) : (
                                        <>
                                            <WifiOff size={12} className="text-red-400" />
                                            <span className="text-xs text-red-400">Offline</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-xs text-secondary">Pending sync:</span>
                                <span className="text-xs text-primary">{pendingSync} items</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-xs text-secondary">Last sync:</span>
                                <span className="text-xs text-primary">{formatLastSync(lastSync)}</span>
                            </div>

                            {pendingSync > 0 && isOnline && (
                                <button
                                    onClick={handleManualSync}
                                    disabled={isSyncing}
                                    className="w-full opal-button-secondary py-2 text-xs flex items-center justify-center space-x-1"
                                >
                                    {isSyncing ? (
                                        <>
                                            <RefreshCw size={12} className="animate-spin" />
                                            <span>Syncing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw size={12} />
                                            <span>Sync Now</span>
                                        </>
                                    )}
                                </button>
                            )}

                            {pendingSync === 0 && lastSync && (
                                <div className="flex items-center justify-center space-x-1 text-green-400">
                                    <CheckCircle size={12} />
                                    <span className="text-xs">All synced</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
} 