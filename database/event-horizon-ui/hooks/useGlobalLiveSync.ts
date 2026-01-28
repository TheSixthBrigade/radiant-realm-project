"use client";

import { useState, useEffect } from 'react';

// Simulates live socket connection state and global activity
export function useGlobalLiveSync() {
    const [isConnected, setIsConnected] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    useEffect(() => {
        // Simulate initial connection handshake
        const timer = setTimeout(() => {
            setIsConnected(true);
            setLastSync(new Date());
        }, 1500);

        // Simulate periodic heartbeats
        const interval = setInterval(() => {
            setLastSync(new Date());
        }, 5000);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    }, []);

    return { isConnected, lastSync };
}
