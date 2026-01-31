"use client";

import { Activity, Shield, Database, Zap, Terminal, Search, RefreshCw, Loader2, Play, Pause, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef, useCallback } from "react";
import { useProject } from "@/hooks/useProject";

interface RealtimeEvent {
    id: number;
    type: 'query' | 'auth' | 'system' | 'insert' | 'update' | 'delete';
    msg: string;
    target: string;
    time: string;
    status: 'success' | 'info' | 'warning' | 'error';
    node: string;
    timestamp: Date;
}

export default function RealtimePage() {
    const { currentProject } = useProject();
    const [events, setEvents] = useState<RealtimeEvent[]>([]);
    const [isPaused, setIsPaused] = useState(false);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        latency: '0ms',
        throughput: '0 KB/s',
        connections: 0,
        uptime: '99.99%'
    });
    const eventIdRef = useRef(0);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch recent database activity
    const fetchActivity = useCallback(async () => {
        if (isPaused || !currentProject) return;
        
        try {
            // Fetch recent queries from pg_stat_activity
            const res = await fetch('/api/realtime');
            if (res.ok) {
                const data = await res.json();
                
                // Convert to events
                const newEvents: RealtimeEvent[] = data.activity?.map((a: any) => ({
                    id: eventIdRef.current++,
                    type: a.query?.toLowerCase().startsWith('select') ? 'query' : 
                          a.query?.toLowerCase().startsWith('insert') ? 'insert' :
                          a.query?.toLowerCase().startsWith('update') ? 'update' :
                          a.query?.toLowerCase().startsWith('delete') ? 'delete' : 'system',
                    msg: a.query?.substring(0, 60) + (a.query?.length > 60 ? '...' : '') || 'System activity',
                    target: a.datname || 'postgres',
                    time: 'just now',
                    status: a.state === 'active' ? 'success' : 'info',
                    node: 'primary',
                    timestamp: new Date()
                })) || [];

                if (newEvents.length > 0) {
                    setEvents(prev => [...newEvents, ...prev].slice(0, 50));
                }

                // Update stats
                if (data.stats) {
                    setStats({
                        latency: `${data.stats.latency || 12}ms`,
                        throughput: `${data.stats.throughput || '1.2'} MB/s`,
                        connections: data.stats.connections || 0,
                        uptime: data.stats.uptime || '99.99%'
                    });
                }
            }
        } catch (e) {
            console.error('Failed to fetch realtime data', e);
        } finally {
            setLoading(false);
        }
    }, [isPaused, currentProject]);

    // Poll for updates
    useEffect(() => {
        fetchActivity();
        
        pollIntervalRef.current = setInterval(fetchActivity, 3000);
        
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [fetchActivity]);

    // Update relative times
    useEffect(() => {
        const interval = setInterval(() => {
            setEvents(prev => prev.map(e => ({
                ...e,
                time: getRelativeTime(e.timestamp)
            })));
        }, 1000);
        
        return () => clearInterval(interval);
    }, []);

    const getRelativeTime = (date: Date) => {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        if (seconds < 5) return 'just now';
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        return `${Math.floor(seconds / 3600)}h ago`;
    };

    const clearEvents = () => {
        setEvents([]);
    };

    const getEventIcon = (type: string) => {
        switch (type) {
            case 'insert': return <Zap size={14} className="text-green-500" />;
            case 'update': return <RefreshCw size={14} className="text-blue-500" />;
            case 'delete': return <Trash2 size={14} className="text-red-500" />;
            case 'query': return <Search size={14} className="text-purple-500" />;
            case 'auth': return <Shield size={14} className="text-yellow-500" />;
            default: return <Database size={14} className="text-gray-500" />;
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0d0d0d] animate-in fade-in duration-500">
            <header className="h-16 border-b border-[#1a1a1a] bg-[#080808] flex items-center justify-between px-8">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <Activity className={cn("text-blue-500", !isPaused && "animate-pulse")} size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white tracking-tight">Realtime Event Stream</h1>
                        <p className="text-[10px] text-[#3ecf8e] uppercase font-bold tracking-widest mt-0.5 flex items-center gap-2">
                            <span className={cn("w-1.5 h-1.5 rounded-full", isPaused ? "bg-yellow-500" : "bg-[#3ecf8e] animate-ping")} />
                            {isPaused ? 'Stream Paused' : 'Live Database Activity'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setIsPaused(!isPaused)}
                        className={cn(
                            "px-4 py-1.5 border text-[10px] font-bold rounded transition-all uppercase tracking-widest flex items-center gap-2",
                            isPaused 
                                ? "bg-[#3ecf8e]/10 border-[#3ecf8e]/30 text-[#3ecf8e] hover:bg-[#3ecf8e]/20" 
                                : "bg-[#111] border-[#222] text-gray-400 hover:text-white"
                        )}
                    >
                        {isPaused ? <Play size={12} /> : <Pause size={12} />}
                        {isPaused ? 'Resume' : 'Pause'}
                    </button>
                    <button 
                        onClick={clearEvents}
                        className="px-4 py-1.5 bg-white text-black text-[10px] font-bold rounded hover:bg-gray-200 transition-all uppercase tracking-widest"
                    >
                        Clear Logs
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <main className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0d0d0d] custom-scrollbar">
                    {loading && events.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="animate-spin text-[#3ecf8e]" size={32} />
                        </div>
                    ) : events.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                            <Activity size={48} className="text-gray-700" />
                            <div>
                                <h3 className="text-lg font-bold text-gray-400">No Activity Yet</h3>
                                <p className="text-xs text-gray-600 mt-1">Database events will appear here in real-time</p>
                            </div>
                        </div>
                    ) : (
                        events.map(event => (
                            <div key={event.id} className="panel bg-[#080808]/50 border-[#151515] p-5 rounded-xl flex items-center justify-between group hover:border-[#333] transition-all cursor-pointer shadow-lg hover:shadow-2xl animate-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-5">
                                    <div className={cn(
                                        "w-1 h-10 rounded-full shadow-[0_0_10px_currentColor]",
                                        event.status === "success" ? "text-[#3ecf8e] bg-[#3ecf8e]" :
                                        event.status === "warning" ? "text-yellow-500 bg-yellow-500" :
                                        event.status === "error" ? "text-red-500 bg-red-500" : "text-blue-500 bg-blue-500"
                                    )} />
                                    <div className="p-2 bg-[#111] rounded-lg border border-[#222]">
                                        {getEventIcon(event.type)}
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-200 font-bold font-mono tracking-tight group-hover:text-white transition-colors">{event.msg}</div>
                                        <div className="flex items-center gap-4 mt-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Target:</span>
                                                <span className="text-[10px] text-gray-400 font-mono bg-black/40 px-1.5 py-0.5 rounded border border-[#222]">{event.target}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className={cn(
                                                    "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase",
                                                    event.type === 'insert' ? "bg-green-500/10 text-green-500" :
                                                    event.type === 'update' ? "bg-blue-500/10 text-blue-500" :
                                                    event.type === 'delete' ? "bg-red-500/10 text-red-500" :
                                                    event.type === 'query' ? "bg-purple-500/10 text-purple-500" :
                                                    "bg-gray-500/10 text-gray-500"
                                                )}>{event.type}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <div className="text-[10px] text-gray-700 font-mono font-bold uppercase">{event.time}</div>
                                    <div className="p-1 px-1.5 bg-black/60 rounded text-[9px] text-gray-800 font-mono italic">node:{event.node}</div>
                                </div>
                            </div>
                        ))
                    )}
                    {!loading && events.length > 0 && (
                        <div className="py-10 text-center">
                            <span className="text-[10px] text-gray-800 font-bold uppercase tracking-widest animate-pulse italic">
                                {isPaused ? 'Stream paused - click Resume to continue' : 'Listening for database events...'}
                            </span>
                        </div>
                    )}
                </main>

                <aside className="w-96 border-l border-[#1a1a1a] bg-[#080808] p-6 space-y-8 flex flex-col">
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-1">Database Metrics</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <SmallStat label="Latency" value={stats.latency} color="text-green-500" />
                            <SmallStat label="Throughput" value={stats.throughput} color="text-blue-500" />
                            <SmallStat label="Connections" value={String(stats.connections)} color="text-purple-500" />
                            <SmallStat label="Uptime" value={stats.uptime} color="text-[#3ecf8e]" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-1">Event Breakdown</h3>
                        <div className="space-y-2">
                            <EventTypeBar label="SELECT" count={events.filter(e => e.type === 'query').length} color="bg-purple-500" />
                            <EventTypeBar label="INSERT" count={events.filter(e => e.type === 'insert').length} color="bg-green-500" />
                            <EventTypeBar label="UPDATE" count={events.filter(e => e.type === 'update').length} color="bg-blue-500" />
                            <EventTypeBar label="DELETE" count={events.filter(e => e.type === 'delete').length} color="bg-red-500" />
                        </div>
                    </div>

                    <div className="panel flex-1 p-5 rounded-xl bg-black border-[#222] shadow-inner relative overflow-hidden flex flex-col group">
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                <Terminal size={12} className="text-[#3ecf8e]" /> System Output
                            </div>
                            <div className="flex gap-1">
                                <div className="w-2 h-2 rounded-full bg-red-900/50" />
                                <div className="w-2 h-2 rounded-full bg-yellow-900/50" />
                                <div className={cn("w-2 h-2 rounded-full", isPaused ? "bg-yellow-500/50" : "bg-green-500/50")} />
                            </div>
                        </div>
                        <div className="flex-1 font-mono text-[10px] space-y-1.5 text-gray-500 overflow-y-auto custom-scrollbar relative z-10">
                            <p className="text-gray-700">[{new Date().toLocaleTimeString()}] Init: Realtime-Engine</p>
                            <p className="text-green-900">[{new Date().toLocaleTimeString()}] Connected: PostgreSQL Primary</p>
                            <p className="text-gray-700">[{new Date().toLocaleTimeString()}] Mode: {isPaused ? 'PAUSED' : 'STREAMING'}</p>
                            <p className="text-blue-900">[{new Date().toLocaleTimeString()}] Events captured: {events.length}</p>
                            <p className="text-gray-700 animate-pulse tracking-widest text-[9px] mt-4 opacity-50 underline decoration-[#3ecf8e]/10 cursor-pointer">
                                {isPaused ? '/stream_paused...' : '/tailing_database_events...'}
                            </p>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-b from-[#3ecf8e]/0 to-[#3ecf8e]/5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </aside>
            </div>
        </div>
    );
}

function SmallStat({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div className="panel p-3 bg-[#0d0d0d] border-[#1a1a1a] rounded-lg">
            <div className="text-[9px] font-bold text-gray-600 uppercase tracking-tighter mb-1">{label}</div>
            <div className={cn("text-xs font-bold font-mono", color)}>{value}</div>
        </div>
    );
}

function EventTypeBar({ label, count, color }: { label: string; count: number; color: string }) {
    const maxWidth = 100;
    const width = Math.min(count * 10, maxWidth);
    
    return (
        <div className="flex items-center gap-3">
            <span className="text-[9px] font-bold text-gray-600 uppercase w-14">{label}</span>
            <div className="flex-1 h-2 bg-[#111] rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${width}%` }} />
            </div>
            <span className="text-[10px] font-mono text-gray-500 w-6 text-right">{count}</span>
        </div>
    );
}
