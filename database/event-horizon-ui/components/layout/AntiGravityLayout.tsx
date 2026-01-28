"use client";

import { motion } from "framer-motion";
import { Ghost, Database, Shield, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AntiGravityLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="min-h-screen relative overflow-hidden bg-[#1a1a1a] text-[#e0e0e0]">
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00ff9d] rounded-full blur-[150px] opacity-[0.05]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00ff9d] rounded-full blur-[150px] opacity-[0.05]" />
            </div>

            {/* Grid Pattern */}
            <div
                className="fixed inset-0 pointer-events-none opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
                    backgroundSize: '50px 50px'
                }}
            />

            {/* Sidebar Navigation */}
            <nav className="fixed left-0 top-0 h-full w-64 border-r border-white/5 bg-[#1a1a1a]/80 backdrop-blur-xl z-50 p-6">
                <div className="flex items-center gap-3 mb-10">
                    <div className="w-8 h-8 rounded bg-[#00ff9d] flex items-center justify-center text-black font-bold shadow-[0_0_15px_rgba(0,255,157,0.5)]">
                        <Zap size={20} fill="currentColor" />
                    </div>
                    <span className="text-xl font-bold tracking-wider">EVENT<span className="text-[#00ff9d]">HORIZON</span></span>
                </div>

                <div className="space-y-2">
                    <NavItem href="/" icon={<Database size={20} />} label="Data Studio" active={pathname === '/'} />
                    <NavItem href="/auth" icon={<Shield size={20} />} label="Quantum Auth" active={pathname === '/auth'} />
                    <NavItem href="/api" icon={<Ghost size={20} />} label="API Gateway" active={pathname === '/api'} />
                </div>
            </nav>

            {/* Main Content */}
            <main className="pl-64 relative z-0">
                {children}
            </main>
        </div>
    );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
    return (
        <Link href={href}>
            <div className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group",
                active
                    ? "bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/20"
                    : "hover:bg-white/5 hover:text-white text-gray-400"
            )}>
                <span className={cn("transition-transform duration-300", active ? "scale-110" : "group-hover:scale-110")}>
                    {icon}
                </span>
                <span className="font-medium">{label}</span>
                {active && (
                    <motion.div
                        layoutId="active-nav"
                        className="absolute left-0 w-1 h-6 bg-[#00ff9d] rounded-r-full"
                    />
                )}
            </div>
        </Link>
    );
}
