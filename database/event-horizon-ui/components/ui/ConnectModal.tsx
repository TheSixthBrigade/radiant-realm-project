"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Database, Terminal, Globe } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ConnectModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ConnectModal({ isOpen, onClose }: ConnectModalProps) {
    const [copied, setCopied] = useState("");

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(""), 2000);
    };

    const ConnectionRow = ({ id, label, value, icon }: any) => (
        <div className="mb-4">
            <label className="text-xs text-gray-500 uppercase tracking-widest mb-2 block flex items-center gap-2">
                {icon} {label}
            </label>
            <div className="flex items-center gap-2 bg-black/30 p-2 rounded border border-white/5">
                <code className="flex-1 text-sm font-mono text-[#00ff9d] overflow-hidden text-ellipsis whitespace-nowrap">
                    {value}
                </code>
                <button
                    onClick={() => copyToClipboard(value, id)}
                    className="p-2 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white"
                >
                    {copied === id ? <Check size={16} className="text-[#00ff9d]" /> : <Copy size={16} />}
                </button>
            </div>
        </div>
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50"
                    >
                        <div className="bg-[#1a1a1a] border border-[#00ff9d]/20 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,255,157,0.1)]">
                            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Database className="text-[#00ff9d]" /> Connect to Nebula Core
                                </h2>
                                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6">
                                <ConnectionRow
                                    id="postgres"
                                    label="Postgres Connection String"
                                    icon={<Database size={14} />}
                                    value="postgresql://postgres:[YOUR-PASSWORD]@db.nebula-core.eventhorizon.io:5432/postgres"
                                />

                                <ConnectionRow
                                    id="api"
                                    label="API URL (PostgREST)"
                                    icon={<Globe size={14} />}
                                    value="https://api.nebula-core.eventhorizon.io"
                                />

                                <ConnectionRow
                                    id="anon"
                                    label="Anon Key (Public)"
                                    icon={<Terminal size={14} />}
                                    value="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYxMjM0NTY3OH0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
                                />

                                <div className="mt-6 p-4 rounded bg-[#00ff9d]/5 border border-[#00ff9d]/10 text-sm text-gray-300">
                                    <p className="flex items-start gap-2">
                                        <span className="text-[#00ff9d]">ℹ</span>
                                        Download the <strong>PQC SSL Certificate</strong> to enable Quantum-Resistant connections (Required for Admin).
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 border-t border-white/5 bg-black/20 flex justify-end">
                                <button onClick={onClose} className="px-4 py-2 rounded bg-[#00ff9d] text-black font-medium hover:bg-[#00ff9d]/90">
                                    Done
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
