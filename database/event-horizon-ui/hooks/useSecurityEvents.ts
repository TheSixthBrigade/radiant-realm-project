"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

export type SecurityEvent = {
    id: string;
    time: string;
    event: string;
    source: string;
    type: 'success' | 'warning' | 'info' | 'error';
};

const MOCK_EVENTS = [
    { event: "PQC Key Exchange initiated", source: "192.168.1.1", type: "success" },
    { event: "Invalid Quantum Signature", source: "203.0.113.4", type: "warning" },
    { event: "Table 'users' encrypted (TCE)", source: "System", type: "info" },
    { event: "New Admin Authorization", source: "Admin Console", type: "success" },
    { event: "Dilithium Signature Verify", source: "API Gateway", type: "success" },
    { event: "Brute Force Attempt Blocked", source: "Auth Shield", type: "error" },
];

export function useSecurityEvents() {
    const [events, setEvents] = useState<SecurityEvent[]>([
        { id: "1", time: "10:42:01", event: "PQC Key Exchange initiated", source: "192.168.1.1", type: "success" as const },
        { id: "2", time: "10:41:55", event: "Invalid Quantum Signature", source: "203.0.113.4", type: "warning" as const },
        { id: "3", time: "10:38:12", event: "Table 'users' encrypted (TCE)", source: "System", type: "info" as const },
    ]);

    useEffect(() => {
        const interval = setInterval(() => {
            // 30% chance to add a new event every 2 seconds
            if (Math.random() > 0.7) {
                const newEvent = MOCK_EVENTS[Math.floor(Math.random() * MOCK_EVENTS.length)];
                const eventObj: SecurityEvent = {
                    id: uuidv4(),
                    time: new Date().toLocaleTimeString(),
                    event: newEvent.event,
                    source: newEvent.source,
                    type: newEvent.type as any
                };

                setEvents(prev => [eventObj, ...prev].slice(0, 10)); // Keep last 10
            }
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    return { events };
}
