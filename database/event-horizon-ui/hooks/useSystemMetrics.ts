"use client";

import { useState, useEffect } from "react";

export function useSystemMetrics() {
    const [metrics, setMetrics] = useState<number[]>(Array(12).fill(50));
    const [cpu, setCpu] = useState(45);
    const [memory, setMemory] = useState(12);

    useEffect(() => {
        const interval = setInterval(() => {
            setMetrics(prev => {
                const next = [...prev.slice(1), Math.floor(Math.random() * 40) + 40];
                return next;
            });
            setCpu(Math.floor(Math.random() * 30) + 30);
            setMemory(prev => Math.min(64, Math.max(8, prev + (Math.random() > 0.5 ? 0.5 : -0.5))));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return { metrics, cpu, memory };
}
