"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FloatingCardProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
}

export function FloatingCard({ children, className, delay = 0 }: FloatingCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{
                opacity: 1,
                y: [0, -10, 0],
            }}
            transition={{
                y: {
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: delay,
                },
                opacity: { duration: 0.5, delay: delay * 0.2 }
            }}
            className={cn(
                "glass rounded-xl p-6 relative overflow-hidden group",
                "hover:border-[#00ff9d]/30 transition-colors duration-500",
                className
            )}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-[#00ff9d]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="relative z-10">
                {children}
            </div>
        </motion.div>
    );
}
